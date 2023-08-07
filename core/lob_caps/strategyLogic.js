/** v 1.0
the strategy logic unit. Supplies strategy arithmetic, for a budget in a market.
inputs: budget, exchange, trade rates (in/out), currency pair, clientid, goal percentage/pct,
delivers: a selection of strategy options for the inputs, stored, as a table. returns a strategy object with 3 vars:
number of blocks, amount per block, where blocks are synonymous with tranches (easier to say).
defers execution strategy to TM.
takes the trade problem and subdivides into 5 areas: 1) what is the goal, 2)what is the context, 3) what will be the strategy,
4)who is the client, and 5) what is the time. (Delivers a strategy for a client, in a market, at a certain time with a presupposed
goal).
v1.1 changes various arithmetic functions to exports, so can calculate from tm
v 1.2 utilizes mathjs, not calculating well for inFee, outFee, when used in csvManager. Provides a constant fee percentage

**/
var mj = require("mathjs");
var goal = {};
var client = {};
var context = {}; //provides some working constants for the table of possible solutions
var selections = [];//a set of strategies for you to select. You tell us later which one to use, and we store that choice in db, but you use the
var feePct = 0.15;

exports.initWithClient = function(c)//accepts a client object with client id and budget
{
  client = c;
}

exports.initWithContext = function(con)//gets an exchage, with respective fee basis,
{
  context = con;
}

exports.initWithGoal = function(g)//presupposes a goal, distinct from client, means a client could have many goals
{
  goal = g;
}

exports.printAssump = function()
{
  console.log("budget = " + client.budget );
  console.log("goal = " + goal.roiPct);
  console.log("context = " + context.currencyPair + "\t" + (feePct/100.0) + "\t" + context.exchange);
}

exports.setStrategyFromUserSelection = function(selectedStrategy)//take input on what strategy they chose, as integer in our existing selections[] array
{
 storeUserStrategy(selections[selectedStrategy]);
}

exports.runCalc = function()
{
  populateStrategyArray();
  //exports.printStrategiesForSession();
}

function populateStrategyArray()
{
    for(var i = 0; i <= 10; i++ )
    {
        //populates strategies[];
        var strategy = calculateStrategyWithGoalAndContext( i); //takes teh constant goal, client and context for every level
        selections.push(strategy);
    }
}

function calculateStrategyWithGoalAndContext(diluteIndex) //di is the level in the table we divide, or dilute the budget into block/tranches
{
  /**goal.roiPct = 1.5; client.budget = 100000.0; context.currencyPair = 'BTC-USD'; context.exchange = 'coinbase';**/
  strategy = {};
  strategy.level = provideDilutionValueWithIndex(diluteIndex); //translates 0, 1, 2 to 2, 4, 8, 10 unitl 2500, number of blocks
  //now that you have a level of dilution
  strategy.valuePerBlock = provideValPerBlock(strategy.level);

  strategy.inFee = exports.calcInFee(strategy.valuePerBlock); //initial fee for purchased amount
  strategy.goalBalance = calcGoalBalance(strategy.valuePerBlock); //value of block, after the trade
  strategy.endFee = exports.calcEndFee(strategy.goalBalance);
  //smaller necessary point gains are better strategies for HFT
  strategy.necessaryPointsToGain = calcNecessaryPoints(strategy.valuePerBlock); //how many $ the price must go up, during the trade, the swing from low to high in price needed
  strategy.earningsThisCycle = strategy.goalBalance - (strategy.inFee + strategy.endFee); //what you end up with after fees and gains
  //strategy.totalTimeToComplete = calcTTC(strategy.necessaryPointsToGain); //measures how long, 1 second per dollar transition
  strategy.endRoi = exports.calcEndRoi(strategy.earningsThisCycle, strategy.valuePerBlock);

  return strategy;
}

exports.calcEndRoi = function(earnings, initialValue)
{
  // return parseFloat(((earnings - initialValue) / initialValue) *100.0).toFixed(2);
  var r = mj.subtract(earnings, initialValue);
  var d = mj.divide(r, initialValue);
  var m = mj.multiply(d, 100);
  return m;
}

exports.getStrategiesForSession = function()//prints strategies for budget, blocks, qty per block, simplicity of each strategy
{
  // console.log("level" + "\tval" + "\tgoal" + "    earned" + "\t\tprice change needed");
  // for(var i = 0; i < selections.length; i++)
  // {
  //   console.log(selections[i].level + "\t" + selections[i].valuePerBlock + "\t" + selections[i].goalBalance + "    " +  selections[i].earningsThisCycle + "\t" + selections[i].necessaryPointsToGain);
  // }
  return selections;
}

function calcNecessaryPoints(valuePerBlock)
{
  return parseFloat(valuePerBlock).toFixed(2) * goal.roiPct ;
}

exports.calcEndFee = function(e)
{
  //console.log("end fee: " + context.feePct * parseFloat(e).toFixed(2))
  //return (feePct/100.0) * parseFloat(e).toFixed(2);
  var r = mj.divide(feePct, 100.0);
  return mj.multiply(r, e);
}

function calcGoalBalance(s) //after trade balance, this block only
{
    return parseFloat(((goal.roiPct) * s) + s).toFixed(2);
}

exports.calcInFee = function(e)
{
  //console.log(e + " in fee: " + context.feePct * parseFloat(e).toFixed(2) );
  return (feePct/100.0) * parseFloat(e).toFixed(2);
}

function provideValPerBlock(level)
{
  return parseFloat(client.budget) / parseFloat(level) ;
}

function provideDilutionValueWithIndex(i)
{ //refers to the number of potential tranches in the array of potential solutions (strategties)
  switch (i){
  case 0: dilutionValue = 2;
  break;
  case 1: dilutionValue = 4;
  break;
  case 2: dilutionValue = 8;
  break;
  case 3: dilutionValue = 10;
  break;
  case 4: dilutionValue = 20;
  break;
  case 5: dilutionValue = 40;
  break;
  case 6: dilutionValue = 80;
  break;
  case 7: dilutionValue = 160;
  break;
  case 8: dilutionValue = 320;
  break;
  case 9: dilutionValue = 640;
  break;
  case 10: dilutionValue = 1280;
  break;
  case 11: dilutionValue = 2560;
  break;
  default: dilutionValue = 10;
}
  return dilutionValue;
}

// function storeUserStrategy(strategy) //go to dynamo and store the client id, time, and strategy details, will save outcomes there later a
// {
//
// }
