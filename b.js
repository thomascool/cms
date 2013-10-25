var http = require('http')
, ts = new Date().getTime()
, parser = require("node-xml2json")
,  _ = require("underscore")
, async = require('async')
, MongoClient = require('mongodb').MongoClient
, moment = require('moment');

var _conn_mongo = 'mongodb://127.0.0.1:27017/test';

function wget (host, path, https, callback) {
  var options = {
    hostname: host,
    port: (https)? 443: 80,
    path: path,
    method: 'GET'
  };
  var response_body = '';
  var request = http.request(options);
   request.on('response', function (response) {
      response.on('data', function (chunk) {
         response_body += chunk;
      });
      response.on('end', function () {
         callback(response_body);
      });
   });
  request.end();
}

/*
 wget('chartapi.finance.yahoo.com', '/instrument/1.0/aapl/chartdata;type=quote;range=5d/json', false, function (atom) {
 console.log(atom);
 });

 wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=Last&Symbol=UVXY&QESymbol=UVXY&ts='+ts, false, function (atom) {
 console.log(  JSON.stringify(parser.parser(atom) ,null," ") );
 });

 wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=MIN&Symbol=UVXY&QESymbol=UVXY&ts='+ts, false, function (atom) {
 console.log(atom);
 });



wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=Last&Symbol=AAPL&QESymbol=AAPL&ts='+ts, false, function (atom) {
  console.log(  JSON.stringify(parser.parser(atom) ,null," ") );
});


wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=MIN&Symbol=UVXY&QESymbol=UVXY&ts='+ts, false, function (atom) {
  console.log(  JSON.stringify(parser.parser(atom) ,null," ") );
});


 wget('chartapi.finance.yahoo.com', '/instrument/1.0/aapl/chartdata;type=quote;range=5d/json?finance_charts_json_callback=?', false, function (atom) {
 var response = eval(atom.replace('00"\n }' , '00},'));
 console.log(atom);
 });

// http://http://download.finance.yahoo.com/d/quotes.csv?s=%40%5EDJI,GOOG&f=nsl1op&e=.csv/d/quotes.csv?s=%40%5EDJI,GOOG&f=nsl1op&e=.csv
// http://chartapi.finance.yahoo.com/instrument/1.0/GOOG/chartdata;type=quote;range=1d/csv
 */

/*
wget('chartapi.finance.yahoo.com', '/instrument/1.0/UVXY/chartdata;type=quote;range=5d/csv', false, function (atom) {
  console.log(_.last(_.first(atom.split('\n'),20),7));
  -- range
});

 [ 'labels:1363613400,1363699800,1363786200,1363872600,1363959000',
 'values:Timestamp,close,high,low,open,volume',
 'close:7.8200,9.6520',
 'high:7.8300,9.7000',
 'low:7.8000,9.5900',
 'open:7.8200,9.6510',
 'volume:0,4404400' ]

 db.symbolList.insert({ 'segment':1, 'symbol':['UVXY','SVXY','TVIX','XIV'] } )

ALL DATA IN TICKET LEVEL:
 http://www.nasdaq.com/aspx/NLS/NLSHandler.ashx?msg=Price&Symbol=TVIX#!

 */


MongoClient.connect(_conn_mongo, function(err, db) {
  if(err) throw err;

  db.collection('symbolList').find().toArray(function(err, settings) {
    async.mapSeries(settings[0].symbol, function(ticksymbol, callback) {
      var interval = settings[0].segment * (60*1000); // 5 minutes

      wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=MIN&Symbol='+ticksymbol+'&QESymbol='+ticksymbol+'&ts='+ts, false, function (atom) {
        out = _.map(_.groupBy(parser.parser(atom).documentelement.min, function(item){ return Math.ceil(item.time / interval); }), function(item) {
          return( {"row": Math.ceil(item[0].time / interval),
            "time":  _.max(item, function(item){ return item.time; }).time,
            "high":  _.max(item, function(item){ return item.price; }).price,
            "low":  _.min(item, function(item){ return item.price; }).price,
            "volume" :  _.reduceRight(item, function(memo, arr){ return memo + arr.shares; }, 0)
          });
        });
        var dataset = {"symbol":ticksymbol ,"timestamp": moment().format(), "interval": settings[0].segment, "datasize":out.length, "dataset":out};
        var collection = db.collection(ticksymbol);
        collection.insert(dataset, function(err, docs) {
          callback(err, docs);
        });
      });

    }, function(err, result){
      if (err) console.log(err);
      console.log(result);
      db.close();
    });
  });

});


wget('chartapi.finance.yahoo.com', '/instrument/1.0/UVXY/chartdata;type=quote;range=5d/csv', false, function (atom) {
  var data = (_.last(_.first(atom.split('\n'),20),7));
  var summary = {};

  summary["close"] = data[2].split(':')[1].split(',');
  summary["high"] = data[3].split(':')[1].split(',');
  summary["low"] = data[4].split(':')[1].split(',');
  summary["open"] = data[5].split(':')[1].split(',');

//  console.log(summary);

});
