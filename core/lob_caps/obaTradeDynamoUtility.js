/**obaTradeDynamoUtility.js
 * put item, for each trade recommendation returned via histogram.js
 * */
exports.hitDDB = function(distanceFromMP, distanceToTarget, entry, horizonPrice, price) {
    console.log(" hitDDB: will hit recs / east");
    var AWS = require('aws-sdk');
    AWS.config.update({ region: 'us-east-1' });
    var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
    var dt = new Date();
    var dayValue = dt.toDateString(); //reabable date, day/year
    var epoch = Date.now(); //milliseconds since 70

    var params = {
        TableName: 'recs2',
        Item: {
            'epoch': { N: epoch.toString() },
            'dayValue': { S: dayValue.toString() },
            'distanceFromMP': { S: distanceFromMP.toString() },
            'distanceToTarget': { S: distanceToTarget.toString() },
            'entry': { S: entry.toString() },
            'horizonPrice': { S: horizonPrice.toString() },
            'midPointPrice': { S: price.toString() }
        }
    };
    var resultErr = "";
    var putPromise = ddb.putItem(params).promise().then(function(err, data) {
        if (err) {
            console.log("line 359: DDB HIT: Error", err);
            resultErr = err;
        } else {
            console.log("line 363: DDB HIT: Success", data);
        }
    });

    // Promise.all(putPromise).then(function(values) {
    //     callback(null, resultErr);
    // });
} //end hitDDB
