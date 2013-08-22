
var last=null;
var _ = require('underscore');
var moment = require('moment');
var Transform = require('stream').Transform
  , csv = require('csv-streamify')
  , JSONStream = require('JSONStream');

var csvToJson = csv({delimiter: ',', objectMode: true});

var parser = new Transform({objectMode: true});

    parser._transform = function(data, encoding, done) {
      var dataset = this;

      if (_.isNull(last) == false) {
        var aDay = (24*60*60)
          , dataMoment = moment.utc(data[0])
          , lastMoment = moment.utc(last[0])
          , dataJDAY = dataMoment.format("X")/aDay
          , lastJDAY = lastMoment.format("X")/aDay;

        if ((dataJDAY - lastJDAY)>1 ) {
          _.each(_.range(1, (dataJDAY-lastJDAY) ), function(item) {
            var tmp = lastMoment.seconds(aDay)
            if ((tmp.format("d") >= 1) && (tmp.format("d") <= 5)) {
              last[0] = tmp.format("YYYY-MM-DD");
              last[5] = "0"; // set the volumn to zero(0) to indicate this is a generated data
              dataset.push(last);
            }
          });
        }
      }

      this.push(data);
      last = data;
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


