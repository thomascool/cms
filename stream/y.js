
var math5 = require('./mathlib').ema(6);
var math10 = require('./mathlib').sma(10);
var Transform = require('stream').Transform
  , csv = require('csv-streamify')
    , JSONStream = require('JSONStream');

    var csvToJson = csv({delimiter: ',', objectMode: true});

    var parser = new Transform({objectMode: true});
    parser._transform = function(data, encoding, done) {
     // console.log('^%s',math5.get(6, JSON.stringify(data).length));
     // console.log('^%s',math10.get(10, JSON.stringify(data).length));
      var k = JSON.stringify(data).length;
      data.push(math5.get(10));
      data.push(math10.get(10));
	      this.push(data);
	        done();
    };

var jsonToStrings = JSONStream.stringify(false);
var request = require('request');

//request.get('http://chartapi.finance.yahoo.com/instrument/1.0/UVXY/chartdata;type=quote;range=5d/csv')
process.stdin
.pipe(csvToJson)
	.pipe(parser)
	.pipe(jsonToStrings)
	.pipe(process.stdout);


