/**7 25 2022 start capture mean/median pipeline for radDisco 22/23 tests, MADS cycle    
 * mp timeStamp mean, skew is diff median - mean**/
//import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: setFileName(),
    header: [{id: 'mp', title: 'mp'},
        {id: 'timeStamp', title: 'timeStamp'},
        {id: 'mean', title: 'mean'},
        {id: 'skew', title: 'skew'},
      ]  });

 exports.writeMeans = (completedTrades) => {
   console.log(`${Object.entries(completedTrades)}`);
   writeArrayToCSV(completedTrades);
 }

function writeArrayToCSV(a)
{
  csvWriter.writeRecords(a)       // returns a promise
  .then(() => {
      console.log('MEANSHIFT write is Done');
      //completedTrades.length = 0;
  });
}

function setFileName()
{
  var ts = getMillisecondTimestampFilename();
  var ret = "./" + ts + "-MEANSHIFT.csv";
  return ret;
}

function getMillisecondTimestampFilename()
{
  var d = new Date();
  return d.toString();
}
