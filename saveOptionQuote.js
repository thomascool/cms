var async = require('async'),
  _ = require('underscore');

var oQuote = require('./lib/optionQuote');

//_.map(['AAPL','$SPX.X','UVXY','SVXY'], function(item){

/*
_.map(['AAPL'], function(item){
  return oQuote.optionQuote(item);
});

*/

async.eachSeries(['AAPL','FB'], function(item, ecb) {
  oQuote.optionQuote(item, function() {
    ecb();
  });
}, function(err) {
  if (err)
    console.log(err);
});