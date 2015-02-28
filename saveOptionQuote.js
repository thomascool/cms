var async = require('async'),
  _ = require('underscore');

 async.eachSeries(['UVXY','SVXY','SPY','SPXL','SPLS','$SPX.X'], function(item, ecb) {
   var oQuote = require('./lib/optionQuote');
   oQuote.optionQuote(item, function() {
   ecb();
   });
 }, function(err) {
 if (err)
 console.log(err);
 });

/*
 var savethem = function(item, ecb) {
 var oQuote = require('./lib/optionQuote');
 oQuote.optionQuote(item, function () {
 return ecb(null);
 });
 };

 async.map(['AAPL','$SPX.X','UVXY','SVXY','V','SPXL','SPLS']
 , savethem
 , function(err) {
 if (err)
 console.log(err);
 });
 */

