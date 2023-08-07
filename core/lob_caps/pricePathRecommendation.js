/** for chaser, express true/false value whether safe to trade or not
'safeToTrade.csv' is now the middle ground for gladiator 1.6, consumed by the trader
**/
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const filename = 'tradeRecommendation.csv'; //min, max for the current price path 
const csvWriter = createCsvWriter({
    path: filename,
    header: [
        { id: 'min', title: 'min' },
        { id: 'max', title: 'max' },
        { id: 'minIndex', title: 'minIndex' },
        { id: 'maxIndex', title: 'maxIndex' }
    ]
});

exports.writeTradeStrategy = function(ts) {
    console.log("trade entry: " + ts.min + ", trade exit, " + ts.max + "(" + ts.minIndex + ", " + ts.maxIndex + ")");
    var oa = []; //so we'll have an array to write
    oa.push(ts);
    csvWriter.writeRecords(oa) // returns a promise
        .then(() => {
            console.log('TRADE RECOMMENDATION IS WRITTEN...');
        });
}

const filename2 = 'priceRanges.csv'; //min, max for the current price path 
const csvWriter2 = createCsvWriter({
    path: filename2,
    header: [
        { id: 'price', title: 'price' },
        { id: 'cap', title: 'cap' }

    ]
});

exports.writePricePath = function(ts) {
    //console.log("trade entry: " + ts.min + ", trade exit, " + ts.max + "(" + ts.minIndex + ", " + ts.maxIndex + ")");
    // var oa = []; //so we'll have an array to write
    // oa.push(ts);
    csvWriter2.writeRecords(ts) // returns a promise
        .then(() => {
            console.log('PRICE PATH RANGE IS WRITTEN...');
        });
}
