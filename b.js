var http = require('http');
var ts = new Date().getTime();
var parser = require("node-xml2json");

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

 */


wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=Last&Symbol=AAPL&QESymbol=AAPL&ts='+ts, false, function (atom) {
  console.log(  JSON.stringify(parser.parser(atom) ,null," ") );
});


wget('www.nasdaq.com', '/aspx/NLS/NLSHandler.ashx?msg=MIN&Symbol=UVXY&QESymbol=UVXY&ts='+ts, false, function (atom) {
  console.log(  JSON.stringify(parser.parser(atom) ,null," ") );
});


