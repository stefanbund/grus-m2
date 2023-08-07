/**7 25 2022 capture all recommendations with corresponding facts, from line 321 in orderbookAnalysis:
 *          mo.time = obj.time;
            mo.exit = rec.exit; 
            mo.distance = d; 
            mo.bidCap = rec.bidCap; 
            mo.askCap = rec.askCap; 
            mo.exitTime = exits[i].exitTime;
            mo.entryReachTime = exits[i].entryReachTime;
            mo.exitReachTime = exits[i].exitReachTime;
            **/
 //import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
 const createCsvWriter = require('csv-writer').createObjectCsvWriter;
 const csvWriter = createCsvWriter({
     path: setFileName(),
     header: [{id: 'time', title: 'time'},
         {id: 'exit', title: 'exit'},
         {id: 'distance', title: 'distance'},
         {id: 'bidCap', title: 'bidCap'},
         {id: 'askCap', title: 'askCap'},
         {id: 'exitTime', title: 'exitTime'},
         {id: 'entryReachTime', title: 'entryReachTime'},
         {id: 'exitReachTime', title: 'exitReachTime'},
         {id: 'mp', title:'mp'}
       ]  });
 
  exports.writeMatches = (completedTrades) => {
    console.log(`${Object.entries(completedTrades)}`);
    writeArrayToCSV(completedTrades);
  }
 
 function writeArrayToCSV(a)
 {
   csvWriter.writeRecords(a)       // returns a promise
   .then(() => {
       console.log('MATCH write is Done');
       //completedTrades.length = 0;
   });
 }
 
 function setFileName()
 {
   var ts = getMillisecondTimestampFilename();
   var ret = "./" + ts + "-MATCH.csv";
   return ret;
 }
 
 function getMillisecondTimestampFilename()
 {
   var d = new Date();
   return d.toString();
 }
 