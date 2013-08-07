var Transform = require('stream').Transform
  , csv = require('csv-streamify')
    , JSONStream = require('JSONStream');

    var csvToJson = csv({delimiter: '/', objectMode: true});

    var parser = new Transform({objectMode: true});
    parser._transform = function(data, encoding, done) {
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


