/**7 25 '22: mean shift capture, csv pipeline uses writeMeanShift for MADS DS use
 * matches/distance measure is done in orderBook Analysis, same template
 * 
 */
/**v AVAX versions
 * May 30 - June 3: doing data science on caps, then recommendations
 * June 6 ->: moving on, recording how quickly recommended exits match midpoints, characterizing the market as predictable,
 * when matched with caps, over time, new DS
 **/
/** JULY 20, '22: mean vs media calculations
 * take masterIntake.oa.cap and mid point price, push to csv
 * need to push an array to the csv writer, fill the array with objects, encoded
 */
//import writeMeans from './meanShiftCsvManager.cjs';
// let minBidder = []; //capture all bid prices
// let minBid = 0.0; //min bid, to pass back to REC
let d3 = require("d3-array");

const writeMeans = require('./meanShiftCsvManager.cjs')
const createCsvWriterBids = require('csv-writer').createObjectCsvWriter; //for bid advice
const createCsvWriterAsks = require('csv-writer').createObjectCsvWriter; //for ask advice, by trader
//var hex = require('./histoExperiment1.js'); //will write csv for hourly data collection
//var stats = require('compute-histogram'); //stats lite npm, https://www.npmjs.com/package/stats-lite
exports.ro = {};//contains the object of recommendation
exports.endPricePath = function ()
{
    return endProd;
} //what we share with oba, when done with init

exports.getFinalTradeRecommendation = function ()
{
    return finalTradeRecommendation;
}
let meanMe = []; //all caps from all relevant bids and orders, mean'ed from masterIntake
let finalTradeRecommendation = {}; //an object representing the nearest upcoming feasible trade with horizon of pctRange, calculated via pricePAthHistoRecommendation include (~184)
let pctRange = 0.0; //from oba, via intake
let binWidth = 0.0; //gets defined by stats.histogram object
let bidTarget = 0.0; //gets initialized from adviseForMidPoint
let askTarget = 0.0; //gets defined from adviseForMidPoint
let priceIncrement = 1.0; //to gauge histogram
let midPointPrice = 0.0; //mid point price, per oba, used to get index value inside of fullBucketCaps.price values
let bidCap = 0.0; //from intake
let askCap = 0.0;
let allAsks = []; //incoming ask orders, by price and quantity, populate in consum step
let allBids = [];
let bidPriceHistogram = []; //init via consumeArraysOfOrders
let askPriceHistogram = [];

//USE MASTER INTAKE TO GET A MEAN AND MEDIAN, THEN WRITE TO CSV
var masterIntake = []; //v 2, this is what we use to merge both relevant asks and bids into one sequenced array, by price 
var bidIntake = [];
let priceAbstraction = []; //an array the size of masterIntake, but with only prices, to mirror the master intake's price values
let day = '';
let time = '' ; //together forms timestamp segregating day and hour, used for every test, to commonalize tests to mp, by time
//relevantBids, relevantAsks, midPointPriceForRecords, totalBidCap, totalAskCap, pctRange, sent here from orderBookAnalysis
exports.initWith = function (bids, asks, mp, bc, ac, pr, dy, tm)//all work done inside of histogram is getting a price path
{ //results1 is bids, results2 is asks
    day = dy ;
    time = tm; 
    let ytt = 'caps';
    // console.log(`${obj.day} , ${obj.time},  ${msg}`); //observe/ confirm before passing along
    //NOHUP testType , day , time , midpoint, bid Cap , ask Cap
    //console.log(`${ytt},${day},${time},${mp},${bc},${ac}`); //format caps test
    //let mpt = 'mp';//the mid point pricing test, just a set of mid point price values and timestamps
    //console.log(`${mpt},${day},${time},${mp}`); //NOHUP captures midpoint values, with timestamp, to correlate vs other streams
    pctRange = pr; //for price path histo rec
    bidCap = bc;
    askCap = ac; //capitalizations via oba
    //console.log("master intake at start is " + masterIntake.length + "incoming lengths: " + bids.length + ", " + asks.length);
    midPointPrice = mp;
    //unpackIntakeWithKeys(bids, asks);
    //displayIntake(bids, asks);
    // let minBidder = []; //capture all bid prices
    // let minBid = 0.0; //min bid, to pass back to REC
    for (var i = bids.length - 1; i >= 0; i--)
    { //bids go in backwards
        //for (var i = 0; i < oba.csvBids.length; i++) {
        let ob = {};
        ob.price = bids[i][0]; //previously was results1
        ob.qty = bids[i][1]; //previously was results1
        ob.type = "bid";

        //each instance of pa.cap to be used 
        //in our mp vs mean calculus
        //minBidder.push(parseFloat(ob.price));
        ob.cap = parseFloat(ob.qty) * parseFloat(ob.price);
        meanMe.push(ob.cap);

        masterIntake.push(ob);
        priceAbstraction.push(ob.price.toString());
    }
    
    //let d3 = require("d3-array");
    //minBid = d3.min(minBidder);
    // exports.ro.minBid = minBid; //the minimum bid value inside of th epct range?
    // console.log(`min bid is ${exports.ro.minBid}`);

    for (var i = 0; i < asks.length; i++)
    { //asks go straight in
        let oa = {};
        oa.price = asks[i][0];
        oa.qty = asks[i][1];
        oa.type = "ask";

        //each instance of pa.cap to be used 
        //in our mp vs mean calculus

        oa.cap = parseFloat(oa.qty) * parseFloat(oa.price);
        meanMe.push(oa.cap);

        masterIntake.push(oa);
        priceAbstraction.push(oa.price.toString());
    }

    //reviewRelevantArrays();
    //must locate the mp's index iwthin masterIntake, then send that to recursiveGetPath
    let io = priceAbstraction.indexOf(mp.toString());
    priceAbstraction.length = 0;

    //console.log("BEGIN: index of mp (" + mp + ") inside of price abstraction (length = " + priceAbstraction.length + ") is " + io);
    //recursiveGetPath(getIndexValueForValue(mp, priceAbstraction), masterIntake); //send it the midpoint 
     return recursiveGetPath(io);
}


function reviewRelevantArrays()
{ //proves that masterIntake is an ordered, sequential, labeled set of metaorders (with bid and ask attached to each)
    // console.log(Object.entries(masterIntake));

}

//price path is evaluated using capitalizations (qty * price)
let priceRange = []; //price range is the ordered set of prices the price path reaches, ignoring caps
let pricePath = [];

function recursiveGetPath(mid)
{ //only does bids, must hare our own version to handle asks
    //console.log(masterIntake.length + " = recursiveGetPath");
    if ((mid + 1) < masterIntake.length && masterIntake[mid - 1] != undefined)
    {
        if (masterIntake[mid - 1].cap > masterIntake[mid + 1].cap)
        {
            // console.log("cap at index " + (mid - 1) + "is greater: " + fullbidPriceBuckets[mid - 1].cap + "  >" + fullbidPriceBuckets[mid + 1].cap); //console.log(fullbidPriceBuckets[mid - 1].cap + "  >" + fullbidPriceBuckets[mid + 1].cap);
            // console.log("shifting to price " + fullbidPriceBuckets[mid - 1].price);
            pricePath.push(masterIntake[mid - 1]);
            priceRange.push(parseFloat(masterIntake[mid - 1].price));
            masterIntake.splice((mid - 1), 1);
            mid = mid - 1;
            if (mid < masterIntake.length)
            {
                recursiveGetPath(mid);
            }
        }
        else
        {
            // console.log("cap at index " + (mid + 1) + "is greater: " + (mid - 1) + ":" + fullbidPriceBuckets[mid - 1].cap + "  <" + fullbidPriceBuckets[mid + 1].cap + " (" + (mid + 1) + ")");
            //console.log("shifting to price " + fullbidPriceBuckets[mid + 1].price);
            pricePath.push(masterIntake[mid + 1]);
            priceRange.push(parseFloat(masterIntake[mid + 1].price)); //a sequenced list of prices, the price path contains
            masterIntake.splice((mid + 1), 1);
            mid = mid + 1;
            if (mid < masterIntake.length)
            {
                recursiveGetPath(mid);
            } //go again
        }
        //}
    }
    else if ((mid + 1) == masterIntake.length) { exposePricePath(); }
    else { exposePricePath(); } //if index is 0

}

//console and output, test processed data
function exposePricePath()
{
    //console.log("price range is " + priceRange.length + " deep, vs master intake = " + masterIntake.length + "  deep");
    //console.log("price path composition: " + Object.keys(pricePath));
    // console.log("expose price path");
    // console.log("path low: " + pricePath[0].price + ", max: " + pricePath[pricePath.length - 1].price);
    //pricePath.length = 0;
    masterIntake.length = 0;
    analyzePricePath();
}

/**
 * 
get max, with index value
get min, with index value
get ohlc, is trend slipping
get midpoint and reasonable trade, ie with fees attached, like a strategy logic (is there a good trade in this price path? )
**/
const { exists } = require('fs');
var endProd = {};

function analyzePricePath()
{
    //console.log("price range is " + priceRange.length + " deep");
    var pp = {}; //to write to csv
    if (d3.maxIndex(priceRange) > d3.minIndex(priceRange))
    {
        // console.log("TRADE SAFE");
        // console.log("min value: " + d3.min(priceRange) + " at index " + d3.minIndex(priceRange));
        // console.log("max value: " + d3.max(priceRange) + " at index " + d3.maxIndex(priceRange));
        pp.mp = midPointPrice;
        pp.tradeSafe = "true"; //for purposes of ddb write, better to have all strings
        pp.min = d3.min(priceRange);
        pp.max = d3.max(priceRange);

    }
    else
    {
        // console.log("TRADE NOT SAFE");
        // console.log("min value: " + d3.min(priceRange) + " at index " + d3.minIndex(priceRange));
        // console.log("max value: " + d3.max(priceRange) + " at index " + d3.maxIndex(priceRange));
        pp.mp = midPointPrice;
        pp.tradeSafe = "false"; //for purposes of ddb write, better to have all strings
        pp.min = d3.min(priceRange);
        pp.max = d3.max(priceRange);

    }

    // masterIntake.length = 0;
    // priceAbstraction.length = 0;
    pp.priceRange = priceRange; //will print an array as a string
    pp.bidCap = bidCap; //from intake
    pp.askCap = askCap;
    pp.time = getMillisecondTimestamp();
    endProd = pp; //filtered price path for use externally, the end product of analysis
    // pricePath.length = 0;
    // priceRange.length = 0;
    // console.log("Analyze Price path: content of price path: ");
    // console.log("price range length = " + endProd.priceRange.length);
    // //console.log(Object.entries(endProd.priceRange));//long list of price range items, 
    // console.log("END histo, enter pricePathRec\n");

    triggerRecommendation();
    //return so; //the strategy object, with trade recommendation
}

//finalize the trade recommendation via pricePathHistoRecommendation
function triggerRecommendation()
{
    //let rec = require('./pricePathHistoRecommendation.js');
    //console.log("trigger reccomendation: \n midpoint in oba: " + midPointPrice + "\n with target roi, " + pctRange); //good
    //console.log(x);
    // console.log("____________________ what is x? _____________________________");
    //finalTradeRecommendation = rec.intake(endProd, midPointPrice, pctRange); //? did I get the right order of params?
    recInit(endProd, midPointPrice, pctRange); //becomes new integration point
    //should I just put return rec.intake instead?
}
// ---------------------------------price path histo recommendation.js code, was tested earlier
//let d3 = require("d3-array");
//intake array and make into histogram array of values
let tr = {}; //trade recommendation, with an entry and exit value
let entry = 0.0; //buy here
let exit = 0.0; //sell here

// exports.getTradeRecommendation = function() {
//     tr.entry = entry;
//     tr.exit = exit;
//     return tr;
// }

//var midpoint = 0.0; //must be visible to sort histogram....midPointPrice is the true midpoint, from oba...
var ppIndexValueForMP = 0; //where inside the price path is the midpoint?

function recInit(p, m, horizon)
{ //p is price path, m is midPointPrice, around which we negotiate histogram
    //console.log("rec init");
    var pp = p.priceRange.map(Number); //change price path to numeric type...
    //midpoint = m; //price incoming 
    ppIndexValueForMP = getFirstIndexOf(m, pp, "for MP index value: "); // the nearest matching price path item
    //console.log("wrapping up rec init with ppIndexValueForMP: " + ppIndexValueForMP + "\n");
    return sortHistogramByDistance(horizonLogic(pp, horizon, m)); //takes histogram and locates nearest trade, by shortest distance, distanceToTarget
    //console.log("trade rec: " + Object.entries(tradeRec));
    //tr = tradeRec;
}

function horizonLogic(pp, horizon, mp)
{
    let histogram = []; //set up an histogram array, histogram [], with items
    //console.log("horizon logic: with horizon, " + horizon + " and price " + mp);
    for (var i = 0; i <= pp.length; i++)
    {
        var hi = (pp[i] * horizon) + pp[i];
        var h = hi.toFixed(2); //targeted price
        var msg = "target for price path item ," + pp[i] + " at index [" + i + "] of price path is " + h;
        //console.log("seeking " + msg); //an unreachable target?
        var ind = getFirstIndexOf(h, pp, ""); //where the target is located, by index of pp
        var distFromMP = i - ppIndexValueForMP; //used by proximity metric, below
        if (ind)
        {
            //console.log("ind is present");
            var dist = ind - i; //distance between this item and its price horizon
            var item = {
                price: pp[i],
                ppIndex: i,
                horizonPrice: h,
                targetIndex: ind,
                distanceToTarget: dist,
                distanceFromMP: distFromMP
            };
            if (distFromMP > 0 && dist > 0)
            {
                histogram.push(item);
            }
        }
    }
    //console.log("horizon logic, histogram length is " + horizon.length);
    return histogram;
}

function getFirstIndexOf(mp, arr, message)
{ //get index of mp in histogram of pp
    //console.log("get first index of ..");
    var indices = []; //where a match took place, we'll get the minimal value, which is the first match
    for (var i = 0; i < arr.length; i++)
    {
        if (arr[i] == mp)
        {
            //console.log(message + " " + i + "(" + arr[i] + ")");
            indices.push(i);
        }
    }
    var lowestIndex = d3.min(indices);
    return lowestIndex;
}

//var db = require("./obaTradeDynamoUtility.js");

//delivers recomendations, entry and exit, can couple this with mp at a time for output
function sortHistogramByDistance(h)
{
    //console.log("sortHistogramByDistance-------TRADE CANDIDATES----------------------------------------");
    h.sort(function (a, b) { return a.distanceFromMP - b.distanceFromMP });

    //console.log("object entries of h: " + Object.entries(h));
    //console.log("-----------------------------TRADE REC--------------------" +new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' }));
    //console.log("midpoint is " + midPointPrice);
    //let ytt2 = 'mp';
    //console.log(`${ytt2} , `)
    // let x = new Date();
    // console.log(`${x.toUTCString()}`);
    // console.log(new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' }))
        //console.log(h[0].distanceFromMP + " at 0, then " + h[h.length - 1].distanceFromMP); //observe ordering by 0 and length ;
    if (h.length > 0)
    {
        var testType = 'rec';
       // NOHUP testType , midpoint price, entry price, exit price, distance from mp, distance to target, time of test
        //console.log(`${testType},${midPointPrice},${h[0].price},${h[0].horizonPrice},${h[0].distanceFromMP},${h[0].distanceToTarget},${day},${time}`);//orig
        
        // console.log(`${'mp'},${midPointPrice},${day},${time}`); //mp
        // console.log(`${'entry'},${h[0].price},${day},${time}`); //entry
        // console.log(`${'exit'},${h[0].horizonPrice},${day},${time}`);//exit 
        
        exports.ro.entry = h[0].price; 
        exports.ro.exit = h[0].horizonPrice;
        // exports.ro.minBid = minBid; //the minimum bid value inside of th epct range?
        let mmObj = {};
        mmObj.mp = midPointPrice; 
        mmObj.timeStamp =  Date.now();
        mmObj.mean = d3.mean(meanMe);
        mmObj.skew = midPointPrice - mmObj.mean; 
        let mmArr = [];
        mmArr.push(mmObj); //now send to the csv writer
        writeMeans.writeMeans(mmArr);//mp timeStamp mean
        //SEND ITEM TO CSV
        // analyzePredictability(midPointPrice, h[0].price, h[0].horizonPrice); //collect array of prior horizon prices, compare to this mp
        //console.log("trade rec: \nentry: " + h[0].price + "\nexit: " + h[0].horizonPrice + "\n proximity: " + h[0].distanceFromMP +
          //  "\n traversal distance: " + h[0].distanceToTarget);
        //give them the topmost recommendation, representing the nearest trade to use:
        //return h[0]; //that's basically it
        // db.hitDDB(h[0].distanceFromMP,
        //     h[0].distanceToTarget,
        //     h[0].price,
        //     h[0].horizonPrice,
        //     midPointPrice); //price is entry price
    }
    else
    {
        h.length = 1;
        //return h;
    }
}

// let exits = []; //should run at start of algo
// function analyzePredictability(mp, entry, exit)
// {
//     //add exit to array of prior exits, with time stamp, epoch
//     let ets = {};
//     ets.exitPrice = exit; 
//     ets.time = time; 
//     exits.push(ets);
// }

// ---------------------------------------------------------------------------------------------------------------------------------


function getMillisecondTimestamp()
{
    var d = new Date();
    return d.toString();
}
//establish a distribution, for all prices within the given percentage, with an incremental shift between values, per def above
/**
 * _____________________________________________________-
 **/
exports.tradeObject = {};
//exports.isTradeSafe = false; //set to true when safe
function configureTradeStrategy()
{
    var priceRange = require("./pricePathRecommendation.js"); //written in style of isSafeToTrade
    priceRange.writePricePath(pricePath); //two part object per row, price and caps
    let ts = analyzePricePath(); //your trade strategy
    exports.tradeObject = ts;
    if (ts.tradeSafe == true)
    {
       console.log("trade entry: " + ts.min + ", trade exit, " + ts.max + "(" + ts.minIndex + ", " + ts.maxIndex + ")");
       
    }
    pushTradeObjectToCSV();
}

//var tradeObjectCsv = require("./pricePathRecommendation.js"); //written in style of isSafeToTrade
function pushTradeObjectToCSV()
{
    //take the trade object and write out to csv, as microservice 
    tradeObjectCsv.writeTradeStrategy(exports.tradeObject);
    // pricePath = [];
    // priceRange = [];

}

exports.getTradeStrategy = function ()
{

    return exports.tradeObject;

}

//prior version
// function recursiveGetPath(mid) { //only does bids, must hare our own version to handle asks
//     //if (!mid) { return; }
//     if ((mid + 1) < fullbidPriceBuckets.length) { //&& fullbidPriceBuckets[mid + 1].cap >= 0 || fullbidPriceBuckets[mid - 1].cap >= 0) {
//         //if (fullbidPriceBuckets[mid - 1].cap || fullbidPriceBuckets[mid + 1].cap) {
//         //console.log("mid = " + mid + "...[mid + 1].cap =  " + fullbidPriceBuckets[mid + 1].cap + ", [mid - 1].cap" + fullbidPriceBuckets[mid - 1].cap);
//         //   exposePricePath();
//         // }

//         if (fullbidPriceBuckets[mid - 1].cap > fullbidPriceBuckets[mid + 1].cap) {
//             // console.log("cap at index " + (mid - 1) + "is greater: " + fullbidPriceBuckets[mid - 1].cap + "  >" + fullbidPriceBuckets[mid + 1].cap); //console.log(fullbidPriceBuckets[mid - 1].cap + "  >" + fullbidPriceBuckets[mid + 1].cap);
//             // console.log("shifting to price " + fullbidPriceBuckets[mid - 1].price);
//             pricePath.push(fullbidPriceBuckets[mid - 1]);
//             fullbidPriceBuckets.splice((mid - 1), 1);
//             mid = mid - 1;
//             if (mid < fullbidPriceBuckets.length) {
//                 recursiveGetPath(mid);
//             }
//         } else {
//             // console.log("cap at index " + (mid + 1) + "is greater: " + (mid - 1) + ":" + fullbidPriceBuckets[mid - 1].cap + "  <" + fullbidPriceBuckets[mid + 1].cap + " (" + (mid + 1) + ")");
//             //console.log("shifting to price " + fullbidPriceBuckets[mid + 1].price);
//             pricePath.push(fullbidPriceBuckets[mid + 1]);
//             fullbidPriceBuckets.splice((mid + 1), 1);

//             mid = mid + 1;
//             if (mid < fullbidPriceBuckets.length) {

//                 recursiveGetPath(mid);
//             } //go again
//         }
//         //}
//     } else if ((mid + 1) == fullbidPriceBuckets.length) { exposePricePath(); } else { exposePricePath(); } //if index is 0

//     //recursiveGetPath(mid);
// }


/** _________________________________________________________________________________________________ **/

// let mp = 0.0; //get a midpoint before adding the two arrays together, in asc order 
// function proveBucketing() //uses fullbidPriceBuckets as a master histogram, fully formed buckets, with caps, as proximity from mid point
// {
//     console.log(Object.entries(fullBucketsWithCaps));
//     for (var i = 0; i < fullBucketsWithCaps.length; i++) {
//         console.log(i + ": " + fullBucketsWithCaps[i].priceStep + ", " + fullBucketsWithCaps[i].caps);
//         //console.log(Object.entries(fullBucketsWithCaps[i].items));
//         console.log(fullBucketsWithCaps[i].items);
//     }
// }

// function printAllPriceBucket() {
//     console.log("all price buckets");
//     // console.log("length of all price bucket: " + allPriceBuckets.length);
//     // console.log("lowest entry, allPriceBuckets : " + Object.entries(allPriceBuckets[0]));
//     // console.log("highest entry, allPriceBuckets : " + Object.entries(allPriceBuckets[allPriceBuckets.length - 1]));
//     for (var i = 0; i < allPriceBuckets.length; i++) {
//         console.log(toString(allPriceBuckets[i].type) + " " + i + ": " + allPriceBuckets[i].price);
//     }
// }


// function formComparisonTable() {
//     let po = {}; //price object forms basis of the array (qty * price) histo bucket

//     let m = parseInt(fullbidPriceBuckets.length / 2);
//     console.log("formComparisonTable: mp = to " + fullbidPriceBuckets[m].price + ", at index, " + m);
//     //so, at index, mid, which is greater, price at mid+ 1 or price at mid-1? 
//     //at what index inside of pricePAth is the mid point, send this index value to recurseiveGetPath
//     let pp = getIndexValueForValue(midPointPrice, allPriceBuckets);
//     recursiveGetPath(pp); //kick it off, and let it spin

//     //console.log("price path length: ", pricePath.length);
//     //exposePricePath();
// }









function iteratePricePathFromIndex(price)
{
    console.log("price path preceding the index");
    for (var i = price; i < priceRange.length; i++)
    {
        console.log(priceRange[i]);
    }
}

var csvBids = [];
var csvAsks = [];
//test format and content of incoming arrays, ra/rb, from oba
function unpackIntakeWithKeys(relevantBids, relevantAsks)
{

    for (var i = 0; i < relevantBids.length; i++)
    {
        let bo = {};
        bo.price = relevantBids[i][0];
        bo.qty = relevantBids[i][1];
        csvBids.push(bo);
    }

    for (var y = 0; y < relevantAsks.length; y++)
    {
        let ao = {};
        ao.price = relevantAsks[y][0];
        ao.qty = relevantAsks[y][1];
        csvAsks.push(ao);
    }
    displayIntake(csvBids, csvAsks);

}

function displayIntake(bids, asks)
{
    console.log("displayIntake: ");
    console.log("bid intake: ");
    console.log(Object.entries(bids));
    console.log("ask intake: ");
    console.log(Object.entries(asks));
}
