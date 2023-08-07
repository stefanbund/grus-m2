/** 1.7+ CHASER, will take logic from dynamodb (budget, tranche size, block depth, price margin, goal roi )
must configure block depth inside of trade manager, to execute blocks at price in sequence, with respect to tps
bqd, blockSize are added, from 1.5.
collapse use of budget manager, instead put budget at tthe top of TM, and decrement/increment
block depth is decremented with each sale.
replaced old populateActiveTradeArray with populateActiveTradeArray( mp , blockSize);//new in v1.6, in 4 places
rate => 666
budget decrementation does not happen in 1.6, just a conservative execution of the block depth, same with budget increment
tradeIsEfficient is also removed, as we predetermine the efficiency of the blocks and margin to trade with your budget
strategyLogic is called in order to prove the efficacy of the trade. calcInFee, calcEndFee, calcEndRoi
changes in chaser 1.0:
buys are done via formActiveTradeObjectForBid, where the safeToTrade value is consulted before doing so. 
MORE must be done to
correct, reprice, cancel or sell active trades during safeToTrade=false events
1.7: doing shared memory between histogram and oba. RiskCaptain remains tied to csv. Looking for integration 
points for histogram
**/
/**
in CHASER we add: safeToTrade, setTradeSafeTrue, setTradeSafeTrue, cancelOpenBidOnCoinbase, while safeToTrade in 
formActiveTradeObjectForBid
nov 29: put all histo, orderBookAnalysis, riskCaptaina etc into same folder as sim-3, compiles
jan 15, will utilize a separate algorithm to interpret price path from oba/histogram, interpretPricePath.js in forming 
solid bids
interpretPricePath takes latest price path via oba, and locates viable entry and exit points 
feb 24: begin to integrate tradeManagerDynamoReader.js example code, reads top most recent recommendation on price into
formActiveTradeObjectForBid (221), DEPRECATED safetotrade protocols, changed FATO to read reco.entry/horizonPrice, 
removed use of histo safeToTrade in FATO, created new GH repo (marine) and new cloud 9 environment to house and deploy
the integrated oba/hist and TM 1.6. Need to redesign the use of tranches, as trades at fee will need to be done at 100K 
minimum. Need to shift this, similar to 1.7, but allows for more than one tranche in our version. Since oba is 
supplying good trade recommendations, need to shore up 1.6 chaser in order to form active trades with its recs, and 
with tranching appropriate to our known fee models (100K+ maker fees are .1% up to 1 M. )
**/
var safeToTrade = 'false'; //for CHASER: we turn this on/off based on order book bid cap steadiness,  in formActiveTradeObjectForBid
// setTradeSafeTrue, setTradeSafeFalse() functions adjust this, value is gotten from reading the csv output from riskCaptain
var analysisID = ""; // the analysis id value, read from the topmost value (last value created ) in safeToTrade.csv, represents 
//the decision used to trade with
var inTestMode = true; //whether or not we pursue actual trades, with real money, using authenticated client, turns on authedClient
const protocol = 'rest'; //change to fix to run 40 tps. Rest does 5 tps
var budget = 0.0; //is determined thorugh main, not manually
var tps = 5.0; // default, as will be run from protocol, is determined thorugh main, not manually
var loop = 0.0;
var bqd = 0; //depth of the number of tranches, or blocks, as an integer, decremented by monitor/when-sold rule, watched by monitor()
var blockSize = 0.0; //amount of currency for each purchased tranche, is determined thorugh main, not manually
var mp = 0.0; //latest price we get from the exchange
var efficiencyFlags = []; //stores data on stalled, incomplete bids by timestamp and orderid
const Gdax = require('gdax');
var mathjs = require("mathjs");
var cp = ''; //for efficiency flag notification send, in main
var restApiURI = 'https://api.pro.coinbase.com';
const fixApiURI = 'fix.com'; //will reflect
const sandboxURI = 'https://api-public.sandbox.pro.coinbase.com';
//var textMessager = require("./textMessager"); //will send texts to the admin
//var ddb = require('./dynamodb'); //gets dynamo client
var sl = require('./strategyLogic.js'); //calcInFee, calcEndFee, calcEndRoi
var authedClient = "";
/**new Gdax.AuthenticatedClient( //establish auth client, all uses here are commented until live
  key,
  secret,
  passphrase,
  restApiURI
);**/
// var rm = require('./riskManager');
// var mw = require('./marketWatcher');
var cm = require('./csvManager.js')
var margin = 0.0; //the range above and below mp we seek to achieve, bid and sell, is determined thorugh main, not manually
const publicClient = new Gdax.PublicClient(); //getting price ticker
var completedTrades = []; //done trades, credit to budget
var activeTrades = []; //waiting to be filled via coinbase, where they go once placed (iniitally) WILL BECOME ACTIVE TRADES


exports.manageTradeCycle = function(cp, bud, m, b, bs) { //look at recent buy orders, those which are pending & unfilled, takes current ticker price
  budget = bud; //for purposes of this run.
  cp = cp;
  margin = m; //takes the
  bqd = b;
  blockSize = bs;
  // if(inTestMode == false)//set up the buy/sell/get fills authenticated client, when not in test mode
  // {
  //   // authedClient = new Gdax.AuthenticatedClient( //establish auth client, all uses here are commented until live
  //   //   key,
  //   //   secret,
  //   //   passphrase,
  //   //   restApiURI
  //   //);
  // }
  publicClient.getProductTicker(cp, (err, response, data) => { //init active trades array, = tps
    if (err) {
      console.log("\tMTC, price getting err: " + err);
    } else {
      mp = data.price; //?
      for (var i = 1; i <= tps; i++) //make an initial set of trades to manage, to kick it off
      {
        formActiveTradeObjectForBid(); //then decrement bqd after one sells, in monitor()
      }
    }
  }); //end publicClient

  if (inTestMode == true) {
    console.log("\tin test mode...");

  } else {
    console.log("GOING LIVE...");

  }
  //console.log("\tmargin: " + margin);
  console.log("\tbudget variable: " + budget); //bm.operatingBudget);

  let delay = 666; //runs 2x second
  let timerId = setInterval(function request() {
    //defineSafeToTrade();
    if (bqd > 0) {
      publicClient.getProductTicker(cp, (err, response, data) => { //get latest price, feed into monitorTrades()
        if (err) {
          console.log("\tMTC LOOP, price getting err: " + err);
        } else {
          mp = data.price;
          monitorTrades(mp); //implements the trade cycle logic
          viewCompletedTradeValue();
        }
      }); //end publicClient
    }
    if (bqd == 0) {
      exports.cycleIsDone = true;
    }
    loop++;
  }, delay);

  let delay2 = 30000; //30 seconds
  let timer2 = setInterval(function request() {
    cm.writeCompleteTradesToCSV(completedTrades); //set this up as a promise, and run an emptyCompletedTrades to start fresh

  }, delay2);
}

function setTradeSafeTrue() {
  safeToTrade = true;
}

function setTradeSafeFalse() {
  safeToTrade = false;
  cancelOpenBids();
}

function cancelOpenBids() //CANCEL OPEN BIDS
{
  for (var e = 0; e < activeTrades.length; e++) {
    if (at.bought == false) {
      activeTrades.splice(e, 1); //remove that element while not accessing it
      var msg = "000000000-XXXXXX";
      cancelOpenBidOnCoinbase(msg);
    }
  }
}

function cancelOpenBidOnCoinbase(orderid) {
  console.log("would cancel bid with bid id" + orderid);
}

function printActiveTradeArray() {
  console.log(cp + " $" + mp);
  activeTrades.forEach(function(item, index, array) {
    console.log(index + ": " + "bid, $" + item.bidPrice + ", .......bought: " + item.bought + "......asking $" + item.sellPrice);
  });
  console.log("completed blocks: " + completedTrades.length);
}

/**
 * tradeManagerDynamoReader returns a recommendation object with attributes from oba/histo
            epoch,  seconds from '70, 
            'dayValue', today's day and date, 'distanceFromMP' price path proximity,'distanceToTarget' from histo ,
            'entry' where to buy in,
            'horizonPrice'where to exit for sale ,
            'midPointPrice'mp at time of recommendation
            **/
var dt = new Date();
var dayValue = dt.toDateString(); //reabable date, day/year
var epoch = Date.now(); //milliseconds since 70
var params = {
  TableName: 'recs2',
  ExpressionAttributeValues: {
    ':todayDate': dayValue
  },
  KeyConditionExpression: 'dayValue = :todayDate',
  Limit: 1,
  ScanIndexForward: false
};

var dbResult = [];
var reco = {}; //global trade recommendation

function runQ() {
  console.log("runQ...");
  var AWS = require('aws-sdk');
  AWS.config.update({ region: 'us-east-1' });
  var documentClient = new AWS.DynamoDB.DocumentClient();
  return new Promise(resolve => {
    documentClient.query(params, function(err, data) {
      if (err) console.log("documentClient ERROR: " + err);
      else {
        resolve(data);
      }

    });
  });
}

//FORMAT THE INITIAL TRADE OBJECT: A BID , NOT FILLED, NOT SOLD. CREATED ON BID to market
async function formActiveTradeObjectForBid() {
  // console.log("FATO: strategy object from HISTO is " + Object.entries(histo.tradeObject));
  // console.log("FATO: HISTO, tradeObject tradeSafe = " + histo.tradeObject.tradeSafe);
  console.log("handleAs...");
  dbResult = await runQ(); //gets resolved data from runQ
  dbResult.Items.forEach(function(item) {
    // console.log("TRADE MANAGER DYNAMO READER, \tHANDLE AS: \n item epoch: " + item.epoch);
    // console.log("\t entry: " + item.entry);
    reco.entry = item.entry;
    reco.horizonPrice = item.horizonPrice;
  });
  console.log(`reco: \n entry, ${reco.entry},\n exit ${reco.horizonPrice}  `);

  //AVAILABLE WHILE SAFE-TO-TRADE
  //if (histo.tradeObject.tradeSafe == 'true') {
  //console.log("formActiveTradeObjectForBid: safeToTrade is " + safeToTrade);//was previously safeToTrade global, set via riskCaptain, now histo
  var activeTrade = {};
  var ts = getMillisecondTimestamp(); //unique
  activeTrade.id = loop; //for our tracking purpose, to gauge tranche efficiency, in this market
  //activeTrade.margin = margin; //1.1 : dollar amount we'll bid under, then sell at market rate with fee?
  activeTrade.bidPrice = reco.entry; //histo.tradeObject.min; //setBidPriceWithIRR(); //1.1 change
  activeTrade.amt = blockSize; //size of order, quantity of commodity to order and later, sell
  activeTrade.bidOrderTime = ts; //when I order , per price arrival, in millis since '70
  // if(inTestMode == false)//HUGE, PLACES THE ORDER ON CB
  // {
  //   //activeTrade.orderid = buy(activeTrade.amt, currencyPair, activeTrade.bidPrice); //for orders placed on coinbase
  //   console.log("buy live...");
  // }else
  if (inTestMode == true) {
    activeTrade.orderid = ""; //set to null, we're not buying anyting live, not set until we go live on the xchange
  }
  activeTrade.repricedAt = "";
  activeTrade.initialmp = mp;
  activeTrade.bidFillTime = 0; //when I fill on CB market, per price arrival
  activeTrade.sellPrice = reco.horizonPrice; //histo.tradeObject.max; //was setAskPriceWithIRR(); //1.1: what I sell at, target or what I get? (I think we set target at creation time, as our goal, which we can shift)
  activeTrade.sellOrderTime = 0; //when I order sale of tranche , per price arrival
  activeTrade.sellFillTime = 0; //when I fill the sale order and complete the trade
  activeTrade.sold = false;
  activeTrade.bought = false; //each turns to true once bought or sold
  activeTrade.addedToBudget = false; //after we tabluate the value of completed trades, we set to false ;
  activeTrade.currencyPair = cp;
  activeTrade.operatingBudget = 0.0;
  activeTrade.inFee = 0.0; //new for 1.6
  activeTrade.outFee = 0.0; //new for 1.6
  activeTrade.gain = 0.0; //new for 1.6
  activeTrade.tpsid = tps; //what value out of 1-5 denote the trade in place
  activeTrade.analysisID = analysisID; //a logged decision to trade, based on existing capitalization, within 5% of mp, bid side
  // activeTrade.safeToTrade = histo.tradeObject.tradeSafe; //was safeToTrade;
  console.log("placing new trade, " + activeTrade.bidPrice + ", block size, " + activeTrade.amt);
  decrementTPS(); //if we transact, we decrement tps
  activeTrades.push(activeTrade); //now make it a trade, managed by monitorTrades, trade cycle
  //} else { console.log("formActiveTradeObjectForBid: safeToTrade is " + safeToTrade); }
}

/**KEY LOOP
1.6, will read the block queue size until it is zero, to deploy the budget in one cycle.
**/
function decrementTPS() {
  tps--;
  console.log("tps decremented to " + tps);
}

function incrementTPS() {
  tps++;
  console.log("tps incremented to " + tps);

}

function monitorTrades() //takes a market price
{ //compare mp price to prices in active trades, to see if they sold, confirm they filled, then set a sale price, based on irr/tranch
  //console.log("monitorTrades");
  console.log("ATA: " + activeTrades.length);
  if (bqd != 0) {
    console.log("\tmonitor, block depth: " + bqd);
    var done = true;
    var t = getMillisecondTimestamp();
    //BUY RULE:                                       used to use bm below
    // if(parseFloat(budget).toFixed(8) > 0.0) //if the budget is not less than 0, or overdrawn, to precision
    // {
    //   if(parseFloat(budget).toFixed(2) >= parseFloat(mp).toFixed(2)) //use available capital to put orders on the exchange
    //   {                                     //make orders with your budget, continuously, then place the order on Coinbase immediately, when live
    //       //console.log("\tBUY RULE ENFORCING.... DECREMENTING BUDGET");//"
    //       if(tradeIsEfficient(mp) == true )
    //       {
    //         console.log("WILL BUY, TRANCHES ARE PROFITABLY SIZED");
    //         //analyzeBudgetForAvailableTrades(mp); //COULD THIS SET OF TESTS PREVENT BAD BUYS?
    //         populateActiveTradeArray( mp , blockSize);//new in v1.6
    //       }
    //   }
    // }
    for (var i = 0; i < activeTrades.length; i++) //use the for loop, to enable the use of the break clause, so we dont' execute rules on a trade 2x+
    {
      // if(activeTrades.length != 5)
      // {
      //   //text me or notify me that the active trade length is not right
      //   var msge = "activeTrades length is " + activeTrades.length;
      //   textMessager.sendSMSwithMsg(msge);
      // }
      //SELL RULE :
      if (activeTrades[i].bidPrice >= parseFloat(mp).toFixed(1)) //it's bought, now put it up for sale.
      {
        //console.log("\tSELL RULE ENFORCING....");//"
        // once the target bid is met, put the tranche up for sale. this places the order
        sellParams = {
          order_id: i.orderid,
        };
        if (inTestMode == false) {
          console.log("LIVE TRADING...."); //"
          authedClient.getFills(sellParams, (err, response, data) => {
            if (err) {
              console.log("fill error, ln 144 " + err);
            }
            if (response) {
              console.log("filled, settled : " + data.settled + ", trade id: " + data.trade_id);
              if (data.settled == true) {
                activeTrades[i].bidFillTime = t;
                activeTrades[i].bought = true;
                //activeTrades[i].sellOrderID = sell(activeTrades[i].amt, iactiveTrades[i].currencyPair, activeTrades[i].sellPrice);
              }
            }
          });
        } else if (inTestMode == true) //set the bid price
        {
          activeTrades[i].bidFillTime = t;
          activeTrades[i].bought = true;
          //console.log("filled, settled : "+  data.settled + ", trade id: " + data.trade_id);
          //activeTrades[i].sellPrice = setAskPriceWithIRR(activeTrades[i].initialmp); //why this,
        }
        break;
      }
      //REPRICE/ CANCEL RULE: cancel if unbought after a set time
      /**        var diffTime = t - i.bidOrderTime; //previously 120000
              if(inTestMode == false)
              {
                  if(diffTime >= 10000 && i.bought == false)  // if it's not bought after 10 seconds, reprice by margin under mp
                  {   //reprice every 10 seconds until filled
                    activeTrades[i].initialmp = mp; //reset the price engagement, start price from market
                    authedClient.cancelOrder(i.orderid, (err, response, data) => {
                      if(err)
                      {
                         console.log("CANCEL ERROR: " + err);
                      }if(response)
                      {
                        retval = response.message; //not sure what it will say on cancellation, but we'll need it
                        console.log("CANCEL RESPONSE: " + response.message); //? must test
                        activeTrades[i].bidPrice = setBidPriceWithIRR(parseFloat(mp).toFixed(2));
                        activeTrades[i].sellPrice = setAskPriceWithIRR(activeTrades[i].bidPrice);               //increments price target, resets price target with a shifting market
                        //var ts = getMillisecondTimestamp();
                        activeTrades[i].repricedAt = t;
                        //buy(activeTrades[i].amt, activeTrades[i].cp, activeTrades[i].bidPrice)
                      }
                    });//cancel done

                  }
                  decrementTPS();//one per xaction
                  break;
                }**/
      //WHEN-SOLD RULE, credit to budget
      if (parseFloat(mp).toFixed(1) >= activeTrades[i].sellPrice) //COMPLETION RULE: add fill information to the budget after you get fill id, when filled -> budget avail
      {
        decrementTPS();
        console.log("when sold rule exec");
        //check if it filled, if so, renew the budget
        if (inTestMode == false) {
          console.log("LIVE TRADING...."); //"
          params = {
            order_id: activeTrades[i].orderid,
          };
          authedClient.getFills(params, (err, response, data) => { //check to see it's filled
            if (err) {
              console.log("fill error, ln 204 " + err);
            }
            if (response) {
              console.log("filled, settled : " + data.settled + ", trade id: " + data.trade_id);
              if (data.settled == true) {
                activeTrades[i].sellFillTime = t;
                activeTrades[i].sold = true;
                activeTrades[i].addedToBudget = true;
                //incrementBudgetWithTradeAtSale(activeTrades[i]);
                decrementBlockSize();
                activeTrades[i].endFee = sl.calcEndFee(activeTrades[i].sellPrice);
                completedTrades.push(activeTrades[i]); //add to the budget array of completedTrades
                removeTradeAtIndex(i);
                formActiveTradeObjectForBid();
              }
            }
          });
        } else if (inTestMode == true) {
          activeTrades[i].sellFillTime = t;
          activeTrades[i].sold = true;
          activeTrades[i].addedToBudget = true;
          //activeTrades[i].operatingBudget = budget; //must be studied as the tranche permutates
          //incrementBudgetWithTradeAtSale(activeTrades[i]);
          activeTrades[i].endFee = sl.calcEndFee(activeTrades[i].sellPrice);
          completedTrades.push(activeTrades[i]);

          removeTradeAtIndex(i);
          decrementBlockSize();
          //add to the budget array of completedTrades
          formActiveTradeObjectForBid();
        }
        break;
      }
      //SIMULATE SOLD CONDITION:
      if (inTestMode == true) {
        if (parseFloat(mp).toFixed(1) - activeTrades[i].sellPrice <= .07) //FOR MOCK MARKET SIMULATION
        {
          //console.log("\texecuting .07 margin rule");
          activeTrades[i].sold = true;
          activeTrades[i].sellFillTime = t; //wrap up the trade data set
          activeTrades[i].operatingBudget = budget;
          activeTrades[i].addedToBudget = true;
          completedTrades.push(activeTrades[i]);
          //incrementBudgetWithTradeAtSale(activeTrades[i]);//
          removeTradeAtIndex(i);
          decrementBlockSize();
          formActiveTradeObjectForBid();
          decrementTPS();
          break;
        }
      }
      // var loopDiff = loop - activeTrades[i].loop ;
      //   if( loopDiff > 90 && activeTrades[i].bought == false)
      //   {
      //     eflag = {};
      //     eflag.tradeid = activeTrades[i].orderid;
      //     eflag.bidPrice = activeTrades[i].bidPrice;
      //     eflag.sellPrice = activeTrdes[i].sellPrice;
      //     eflag.ts = ts;
      //     efficiencyFlags.push(eflag);
      //   }
    } //end for loop, 1.6v

    printActiveTradeArray();
  } //end if
  else {
    console.log("bqd is now " + bqd);
    // var msge = "bqd is now " + bqd;
    // textMessager.sendSMSwithMsg(msge); //too many messages
  }
} //end function

function decrementBlockSize() {
  bqd--; //must test decrement
  var msge = "just sold... activeTrades length is " + activeTrades.length;
  console.log(msge);
  console.log("block queue just reduced to " + bqd);
}
/**
function buy(amt, currencyPair, bid)
{                                       //BUY, TAKES API ARGS, RETURNS ORDER ID
  var oid = "";
      console.log("buy: ready to buy " + amt + " at price, " + parseInt(bid));
      // Buy 1 LTC @ 75 USD
      var params = {
        side: 'buy',
        price: parseInt(bid), // USD
        size: amt, // LTC
        product_id: currencyPair,
      };
      authedClient.placeOrder(params, (err, response, data) => {
        if(err)
        {
          console.log("buy: error, was " +  err);
        }if(response)
        {
          //console.log("placeBuyOrder: response was : "+  response);
          console.log("buy: data was : "+  data.id);
          oid = data.id;
          //manageBuyResponse(data);
        }
      });
  return oid; //to keep track in activeTrades
}**/
/**
function sell(qty, currencyPair, askPrice)
{                                                 //SELL, TAKES API ARGS, RETURNS ORDER ID
  var orderid = "";
  const sp = {      //sales params
    side: 'sell',
    price: askPrice, // USD
    size: qty, // LTC
    product_id: currencyPair,
  };
      authedClient.placeOrder(sp, (err, response, data) => {
      if(err){
        console.log(" sell: error, was " +  err); //works, will send you a reason for warning ie "Error: HTTP 400 Error: Insufficient funds" if you try to sell without coin to sell
      }if(response) {
                //console.log("placeBuyOrder: response was : "+  response);
        console.log(" sell : data was : "+  data.id);
        orderid = data.id;
        // manageBuyResponse(data);
      }
    });

  return orderid; //to keep track in activeTrades
}**/

function viewCompletedTradeValue() //will adjust global, non exportable budget, at top
{
  var b = 0.0;
  //console.log("viewCompletedTradeValue.......... ");
  completedTrades.forEach(function(item, index, array) {
    //sum up qty * sell price

    // if(item.addedToBudget == false)
    // {
    // console.log("\titem sell price = " + item.sellPrice);
    // console.log("\titem amt = "+ item.amt);
    b = b + ((parseFloat(item.sellPrice) - parseFloat(item.bidPrice)) * parseFloat(item.amt));
    //}
  });
  console.log("\tgains: " + b);
}

function printElapsedTradeTime() {
  var timediff = 0.0;
  completedTrades.forEach(function(item, index, array) {
    //sum up qty * sell price
    timediff = item.sellFillTime - item.bidOrderTime;
    console.log("trade " + item + ": time spent " + timediff);
  });
}

function getMillisecondTimestamp() {
  var d = new Date();
  return d;
}

function setBidPriceWithIRR(m) //mp is current market midpoint, before we price it, return value is risk adjusted mp, or mp - (irr/2)
{ //version 1.1,
  //var q = parseFloat(m).toFixed(2); //parseFloat(mp).toFixed(1)f
  //var t = (q * irr)/2.0;
  //var t = (q - margin);
  var t = mathjs.subtract(mp, margin);
  // console.log("setBidPrice: margin = " + margin);
  // console.log("setBidPrice: mp = " + q);
  console.log("setBidPriceWithIRR, bid price is " + t);
  return (t); //price to buy at, returned
}

function setAskPriceWithIRR(m) //move the midpoint price around as data.price until here, where you parseFloat
{
  //var q = ; //parseFloat(mp).toFixed(1)
  //var t = (q * irr)/2.0;
  //var q =  ;
  //var t = (m + margin); //failed in early 1.6, went to mathjs
  var t = mathjs.add(mp, margin);
  console.log("setAskPriceWithIRR, ask price is " + t);

  //console.log("setBidPriceWithIRR, new mp is " + (q - t) );
  return (t); //price to buy at, returned
}



// function decrementBudgetWithTradeAtBid(trade)//subtract capital reserved for this trade
// {
//   if(parseFloat(budget).toFixed(4) > 0.0) //if the budget is not less than 0, or overdrawn
//   {
//       budget   = parseFloat(budget) - (parseFloat(trade.amt) * parseFloat(trade.bidPrice)) - .01;
//   }
//   console.log("\tBUDGET:" + parseFloat(budget)  ); //nan
//   console.log("\t(402)");
// }
//
// function incrementBudgetWithTradeAtSale(trade) //close, settled
// {
//     // console.log("incrementBudgetWithTradeAtSale: ");//"
//     // console.log("\t trade.amt = " + trade.amt);
//     // console.log("\t trade.sellPrice = " + trade.sellPrice);//"
//   //console.log("\t operating budget = " + parseFloat(bm.operatingBudget));//"
//   budget = parseFloat(budget) + (parseFloat(trade.amt) * parseFloat(trade.sellPrice)) - .01;
//   console.log("\tcompleted tranches: " + completedTrades.length);
//   console.log("\tBUDGET:" + parseFloat(budget)  ); //nan
//   console.log("\t(415)");
//   //console.log("\t incrementBudgetWithTradeAtSale: BUDGET UPDATED TO $" + parseFloat(bm.operatingBudget));
// }

function removeTradeAtIndex(i) {
  activeTrades.splice(i, 1); //remove that element while not accessing it
}

// function tryTestTradeAtIRR(irr) //test trade should be the first trade of the fleet,
// {
//       var amt = bm.defineTrancheForOrder(irr); //MUST VIEW OUR ACTIVE TRADES ARRAY, FOR BUDGET CALIBRATION, WITH RISK
//       if(amt != 0.0) //0 connotes that no budget can be allocated, the purpose of the loop is to initiate trades continuously, with constraints.
//       {
//             //3. get market prices
//             var bid = mw.getMarketPrice();
//             var bidPrice = bid - (bid * (irr/2.0));
//             //4. initiate buy order with available budget information
//             //placeBuyOrder(tranche, bidPrice); //submits order to exchange, and sends order record to our unfilledOrders array, will become activeTrades, as they are budget allocated for use.
//             console.log("placeBuyOrder: ready to buy " + amt + " at price, " + parseInt(bidPrice));
//             // Buy 1 LTC @ 75 USD
//             var params = {
//               side: 'buy',
//               price: parseInt(bidPrice), // USD
//               size: amt, // LTC
//               product_id: currencyForThisAlgo,
//             };
//             // authedClient.placeOrder(params, (err, response, data) => {
//             // if(err)
//             // {
//             //   console.log("placeBuyOrder: error, was " +  err);
//             // }if(response)
//             // {
//             //   //console.log("placeBuyOrder: response was : "+  response);
//             //   console.log("placeBuyOrder: data was : "+  data.id);
//             //   //put into the trade array, with flag 'probe', so we watch it for two minutes before proceeding
//             // }
//             // });
//       }
// }

// function useAuthClientToGetOrderById()
// {
//   //console.log("inspectPendingOrders: order id is " + i.id); //yes
//     authedClient.getOrder(i.id, (err, response, data) => {// call on coinbase for status of orders
//     if(err)
//     {
//       console.log(": error, was " +  err);
//     }if(response)
//     {
//         //console.log("inspectPendingOrders: " + data.created_at);
//         //compare item price to input parameter, price
//         console.log(typeof i.price); //string
//         if(midPointPrice >= (parseFloat(i.price) + 2.5)){
//           //recalibrate
//         }
//         //but if price is now less than or = to i.price, authorize a sale
//         if(parseFloat(i.price) == price || price <= parseFloat(i.price))
//         {
//         //trigger the sales order process, below if the price hasn't crashed
//           //if(data.settled =="true") { //sell that parcel, which just settled
//             /**  "trade_id": 74,
//                 "product_id": "BTC-USD",
//                 "price": "10.00",
//                 "size": "0.01",
//                 "order_id": "d50ec984-77a8-460a-b958-66f114b0de9b",
//                 "created_at": "2014-11-07T22:19:28.578544Z",
//                 "liquidity": "T",
//                 "fee": "0.00025",
//                 "settled": true,
//                 "side": "buy"**/
//                 //move to create a sell order out of the details (price /size)
//                 setSaleParameters(parseFloat(i.price).toFixed(2), parseFloat(i.size));//SELL ORDER
//               //}///end settled
//         } //price comp, whether sold or not
//   }
//   });//end authed client
// }


// exports.initBuyFor = function(coin, irr, tranche) { //Begin the purchase process. gets a fresh ticker read on price
//   var p = 0.0;
//   var irr = rm.initWithBaseIRR(); //set top irr
//   var marketPrice = mw.getMarketPrice(); // fetch pricing
//   setPurchaseParameters(marketPrice.price); //arrives as a dict? see below
// }


function mapDataForPrice(data) { //successfully unpacks a map, from data at coinbase, prototype for doing so
  //const map = new Map(Object.entries(data)); //gives you nice bracketed bids and asks
  //console.log("data contents: " + data);//works, huge unordered dump, unlike the map
  //printMap(map); //works, helps
  //marketPrice = data.price;
  //console.log("mapDataForPrice: $" + data.price); //good
  //setBuySell(data.price);
  setPurchaseParameters(data.price);
}

// function setSaleParameters(price, amt){
//   var genPrice = parseFloat(price) * ceiling;
//   var askPrice = genPrice + parseFloat(price);
//   const sp = {      //sales params
//     side: 'sell',
//     price: askPrice, // USD
//     size: amt, // LTC
//     product_id: currencyForThisAlgo,
//   };

//   authedClient.placeOrder(sp, (err, response, data) => {
//   if(err){
//     console.log("place sell order: error, was " +  err);
//   }if(response) {
//             //console.log("placeBuyOrder: response was : "+  response);
//     console.log("place sell order: data was : "+  data.id);
//             // manageBuyResponse(data);
//   }
// });



function placeBuyOrder(tranche, bidPrice, irr) {
  //in sim market, by me, as practice
  console.log("placeBuyOrder: ready to buy " + tranche + " at price, " + parseInt(bidPrice) + "with IRR: " + irr);
  formActiveTradeObjectForBid(tranche, bidPrice, irr); //eventually pushes new item to activeTrades, moves to inspectPendingOrders
  // Buy 1 LTC @ 75 USD
  //send to coinbase market
  /**    var params = {
        side: 'buy',
        price: parseInt(bid), // USD
        size: amt, // LTC
        product_id: currencyForThisAlgo,
      };
      authedClient.placeOrder(params, (err, response, data) => {
      if(err){
        console.log("placeBuyOrder: error, was " +  err);
      }if(response) {
        //console.log("placeBuyOrder: response was : "+  response);
        console.log("placeBuyOrder: data was : "+  data.id);
      }
    });**/
}

function setPurchaseParameters(price) { //OLD SYSTEMS, 1.0; allocates a purchase amount of the coin, given price and your budget, reworked in trade loop above with rm and bm info
  //get a budget for purchase, amt,  based on your initial budget and the current price of coin
  amt = budget / parseFloat(price); //now this is the tranche
  floorQ = price * floor;
  bidPrice = price - floorQ;
  //console.log("setPurchaseParameters: $" +  amt  + " worth of coin prepped, bidding: $" + bidPrice);
  amt = Number(amt.toFixed(3));
  placeBuyOrder(amt, bidPrice);
}

function defineSafeToTrade() //works, an important part of the pre-histogram period; replaced by oba/histo as of feb 24
{
  //read safeToTrade.csv for latest second to second trade
  const csv = require('csv-parser')
  const fs = require('fs')
  const results = [];

  fs.createReadStream('./safeToTrade.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      //console.log(results);
      let lim = results.length - 1;
      //get last safeToTrade entry, top of stack
      safeToTrade = results[lim].safeToTrade; //here, originates as a string, must be case to bool in order to be useful
      analysisID = results[lim].analysisID;
    }); //need to separate the chaser and sim-3 folders right now
  console.log("currenlty using analysis id, " + analysisID + ", (" + typeof(safeToTrade) + ")");
  if (safeToTrade == true) { console.log("tested safeToTrade value, type " + typeof(safeToTrade)); }
}
