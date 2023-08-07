/**v 1.6, sim 3 --
integrates strategy logic, to figure out tranche (block) size, by price goals. Helps to configure many small blocks, to achieve
a set roi goal. Exposes real price changes needed in order to affect the value of tiny blocks, if necessary, rather than the
net value of a large/monolithic block. Items like margin, tranche size, and number of tranches are set by strategy logic.
set block queue depth here, not in bm
use strategyLogic.js to determine the best tranche size, goal and block depth, and enter those parameters here. Will be fed
into the trade manager
**/
var budget = 100000.0; //set your budget here, gets passed into trade manager
var cp = 'BTC-USD'; //'BTC-USD'; //what we're trading, not yet having a MW
var margin = 1.17; //comes from strategy logic unit
var bqd = 1; //depth of the number of tranches, or blocks, as an integer
var blockSize = 125; //amount of currency for each purchased tranche
var tm = require('./tradeManager');
//var AWS = require('aws-sdk');
//var textMessager = require("./textMessager");
//var mw = require('./marketWatcher'); //provides pricing across a market for coin currencies

tm.manageTradeCycle(cp, budget, margin, bqd, blockSize); //most affordable coin, for starters.
// while (tm.cycleIsDone == true) {
//     var msg = "MAIN, READING TM.... BQD == 0....resetting the trade";
//     textMessager.sendSMSwithMsg(msg);
//     console.log(msg);
//     tm.cycleIsDone == false;
//     tm.manageTradeCycle(cp, budget, margin, bqd, blockSize); //most affordable coin, for starters.
// }
