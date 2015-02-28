var async = require('async'),
  _ = require('underscore')
  pg = require('pg'),
  QueryStream = require('pg-query-stream'),
  JSONStream = require('JSONStream');

var conString = "postgres://thomas:@localhost:5432/bigoptions";


//async.eachSeries(['SPXL','SPXS'], function(item, ecb) {
//async.eachSeries(['SPXL', 'SPXS'], function(item, ecb) {
async.each(['UVXY','SVXY','SPY','SPXL','SPLS','$SPX.X'], function(item, ecb) {
  var qQuote = require('./lib/getOptionsQuote');
  var con;
   qQuote.getOptionsQuote(item, function(err, allData, stockTick) {
     if (err) {
       ecb(err);
     } else {
       async.waterfall([
         function(xcb) {
           con = new pg.Client({
             host: 'localhost',
             port: 5432,
             user: 'thomas',
             database: 'bigoptions'
           });
           con.connect();
           xcb();
         },
         function(xcb) {
           con.query('CREATE TABLE IF NOT EXISTS '+stockTick.symbol+' ( id serial NOT NULL, symbol character varying(32) NOT NULL,' +
             ' bid double precision, ask double precision, last double precision,' +
             ' change double precision, basize character varying(32), high double precision,' +
             ' low double precision, volume bigint, tstamp timestamp with time zone NOT NULL)'
           ).on('end', function(){
               console.log("Created stock table :", stockTick.symbol);
               async.each([stockTick],function(tick, cb) {
                 var qStr = "insert into "+tick.symbol+" (symbol, bid, ask, last, change, basize, high, low, volume, tstamp) values('"
                   +tick.symbol + "', "
                   +tick.bid +  ",  "
                   +tick.ask +  ", "
                   +tick.last + ", "
                   +tick.change + ", '"
                   +tick.BAsize + "', "
                   +tick.high + ", "
                   +tick.low + ", "
                   +parseInt(tick.volume,10) + ", '"
                   +tick.createdDate.toUTCString()
                   + "')"
                 console.log(qStr);
                 return con.query(qStr, function() {
                   cb();
                 });
               }, function(err) {
                 console.log('inserted : ', stockTick.symbol);
                 if (err)
                   console.log('Stock insert error : ',err);
                 xcb()
               });
             });
         },
         function(xcb) {
           con.query('CREATE TABLE IF NOT EXISTS '+stockTick.symbol+
             '__ ( id serial NOT NULL, contract character varying(32) NOT NULL, title character varying(48), act character varying(5),' +
             ' strike double precision, ' +
             ' bid double precision, ' +
             ' ask double precision, ' +
             ' iv double precision, ' +
             ' theo double precision, ' +
             ' delta double precision, ' +
             ' gamma double precision, ' +
             ' theta double precision, ' +
             ' vega double precision, ' +
             ' rho double precision, ' +
             ' last double precision, ' +
             ' change double precision, ' +
             ' vol bigint, ' +
             ' opint double precision, ' +
             ' tstamp timestamp with time zone NOT NULL)'
           ).on('end', function(){
               console.log("Created contracts table :", stockTick.symbol+'__');

               async.each(_.toArray(allData),function(tick, cb) {
                 con.query("insert into "+stockTick.symbol+"__" +
                 " (contract, title, act, strike, bid, ask, iv, theo, delta, gamma, theta, vega, rho, last, change, vol, opint, tstamp) values('"
                 +tick.contract + "', '"
                 +tick.title + "', '"
                 +tick.action + "', '"
                 +tick.strike + "',"
                 +tick.bid + ","
                 +tick.ask + ","
                 +tick.IV + ","
                 +tick.Theo + ","
                 +tick.Delta + ","
                 +tick.Gamma + ","
                 +tick.Theta + ","
                 +tick.Vega + ","
                 +tick.Rho + ","
                 +tick.last + ","
                 +tick.change + ","
                 +parseInt(tick.vol,10) + ","
                 +tick.opInt + ", '"
                 +tick.createdDate.toUTCString()
                 + "')", function(err) {
                   if (err) {
                     console.log("insert into "+stockTick.symbol+"__" +
                     " (contract, title, act, strike, bid, ask, iv, theo, delta, gamma, theta, vega, rho, last, change, vol, opint, tstamp) values('"
                     +tick.contract + "', '"
                     +tick.title + "', '"
                     +tick.action + "', '"
                     +tick.strike + "',"
                     +tick.bid + ","
                     +tick.ask + ","
                     +tick.IV + ","
                     +tick.Theo + ","
                     +tick.Delta + ","
                     +tick.Gamma + ","
                     +tick.Theta + ","
                     +tick.Vega + ","
                     +tick.Rho + ","
                     +tick.last + ","
                     +tick.change + ","
                     +parseInt(tick.vol,10) + ","
                     +tick.opInt + ", '"
                     +tick.createdDate.toUTCString()
                     + "')");
                     console.log(tick);
                     console.log('contract insert error : ', err)
                   }
                   cb();
                 });
               }, function(err) {
                 if (err)
                   console.log(err);
                 console.log("Contracts added :", stockTick.symbol+'__');
                 xcb();
               });
             });
         }
       ], function (error) {
         con.end();
         ecb();
       });

     }
   });
 }, function(err) {
  if (err)
   console.log('bigbig problems : ', err);
 });
