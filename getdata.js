var http = require('http'),
xml2js = require('xml2js');

var fold = require("reducers/fold")
var expand = require("reducers/expand")
var map = require("reducers/map")
var take = require("reducers/take")
var drop = require("reducers/drop")

var Stream = require("stream-reduce")

var parser = require("node-xml2json");

var escape = require('escape-html');



// http://chartapi.finance.yahoo.com/instrument/1.0/aapl/chartdata;type=quote;range=5d/json/

var options = {
  hostname: 'www.nasdaq.com',
  port: 80,
  path: '/aspx/NLS/NLSHandler.ashx?msg=MIN&Symbol=UVXY&QESymbol=UVXY',
  method: 'GET'
};

//  path: '/aspx/NLS/NLSHandler.ashx?msg=Last&Symbol=UVXY&QESymbol=UVXY',
// http://www.google.com/finance/getprices?q=AAPL&i=300&p=10m&f=d,c,v,o,h,l&df=cpct&auto=10&ts=1307994768943
// http://www.google.com/finance/getprices?q=.IXIC&x=INDEXNASDAQ&i=120&p=10m&f=d,c,v,o,h,l&df=cpct&auto=1&ts=1307994768643
// http://www.google.com/finance/getprices?i=60&p=10d&f=d,o,h,l,c,v&df=cpct&q=IBM
var options = {
  hostname: 'chartapi.finance.yahoo.com',
  port: 80,
  path: escape("/instrument/1.0/aapl/chartdata;type=quote;range=5d/json"),
  method: 'GET'
};

var options = {
  hostname: 'www.nasdaq.com',
  port: 80,
  path: '/aspx/NLS/NLSHandler.ashx?msg=MIN&Symbol=UVXY&QESymbol=UVXY',
  method: 'GET'
};

var req = http.request(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  /*
  res.on('data', function (chunk) {
    var stringStream = map(chunk, String)

    var linesStream = expand(stringStream, function(text) {
    //  console.log(  text.split("\n")  );
      return text.split("\n")
    })


    var linesFrom4 = drop(linesStream, 3)
//    console.log(linesFrom4);
    var lines56 = take(linesFrom4, 2)
  //  console.log(lines56);
    fold(lines56, function(line, count) {
//      console.log("line #" + (++count) + " " + line)
      return count
    }, 0);
    console.log( chunk);
    parser.parseString(chunk, function (err, result) {
      console.log(  JSON.stringify(result,null," ") );
    });
bigdump = bigdump + chunk;
  });
 */
  var pageData = "";

  //stream the data into the response
  res.on('data', function (chunk) {
    console.log( chunk );
    pageData += chunk;
  });

  //write the data at the end
  res.on('end', function(){
//    console.log(  JSON.stringify(parser.parser(pageData) ,null," ") );
    console.log(  pageData );
  });

});

req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});

// write data to request body
req.write('data\n');
req.end();


function wget (host, path, https, callback) {
  var port = (https)? 443: 80,
  client = http.createClient(port, host, https),
  request = client.request('get', path, { 'host': host }),
  response_body = '';

  request.end();
  request.on('response', function (response) {
    response.on('data', function (chunk) {
      response_body += chunk;
    });
    response.on('end', function () {
      callback(response_body);
    });
  });
}

wget('chartapi.finance.yahoo.com', '/instrument/1.0/aapl/chartdata;type=quote;range=5d/json', false, function (atom) {
  console.log(atom);
});

