
var last=null;
var lastData=null;
var lastUniformData=null;
var yearNum = monthNum = weekNum = 1;
var firstWeek;
var _ = require('underscore');
var moment = require('moment');
var Transform = require('stream').Transform
  , csv = require('csv-streamify')
  , JSONStream = require('JSONStream');
var sf = require('slice-file');
var xs = sf('/tmp/EEM.csv');

var csvToJson = csv({delimiter: ',', objectMode: true});

var uniformData = new Transform({objectMode: true});
var lineNum = 0;

uniformData._transform = function(data, encoding, done) {
  var dataset = this;
  var aDay = (24*60*60);

  if (_.isNull(lastUniformData) == false) {
    if (lastUniformData[0].split('-')[0] != data[0].split('-')[0]) yearNum++;
    if (lastUniformData[0].split('-')[1] != data[0].split('-')[1]) monthNum++;

    var dataMoment = moment.utc(data[0])
      , lastMoment = moment.utc(lastUniformData[0])
      , dataJDAY = dataMoment.format("X")/aDay
      , lastJDAY = lastMoment.format("X")/aDay;

    if ((dataJDAY - lastJDAY)>1 ) {
      _.each(_.range(1, (dataJDAY-lastJDAY) ), function(item) {
        var tmp = lastMoment.seconds(aDay)
        if ((tmp.format("d") >= 1) && (tmp.format("d") <= 5)) {
          lastUniformData[0] = tmp.format("YYYY-MM-DD");
          lastUniformData[5] = "0"; // set the volumn to zero(0) to indicate this is a generated data
          lastUniformData[7] = 0;
          dataset.push(lastUniformData);
        }
      });
    }
    weekNum = Math.ceil((dataJDAY - firstWeek) / 7);

  } else {
    firstWeek = moment.utc(data[0]).format("X")/aDay;
  }

  data[7] = ++lineNum; // add the record number
  data[8] = yearNum; // add the Year number
  data[9] = monthNum; // add the Month number
  data[10] = weekNum; // add the Week number
  this.push(data);
  lastUniformData = data;
  done();
};

var calucateTheClosing = new Transform({objectMode: true});

calucateTheClosing._transform = function(data, encoding, done) {
  _.once(function() { last = data; tranings = {}; });
  var transform = [data[7], data[8], data[9], data[10], data[0], (parseFloat(data[2])+parseFloat(data[3])+(parseFloat(data[4])*2))/4, parseInt(data[5],10) ];

  // prepare the training data by creating all the group head in JSON
  _.map(patterns, function(pattern) {
    var patternStr = pattern.join("");
    if (!tranings[patternStr])
      tranings[patternStr] = {};

    var grpData = tranings[patternStr];

    if (pattern[0] == 'y') {
      if (!grpData['y' + transform[1]])
        grpData['y' + transform[1]] = {input: [], output: []}
    }
    if (pattern[0] == 'm') {
      if (!grpData['m' + transform[2]]) {
        grpData['m' + transform[2]] = {input: [], output: []}
      }
    }
    if (pattern[0] == 'w') {
      if (!grpData['w' + transform[3]])
        grpData['w' + transform[3]] = {input: [], output: []}
    }
  });

  this.push(transform);

  done();
};

var buildTrainingData = new Transform({objectMode: true});

buildTrainingData._transform = function(data, encoding, done) {
  _.once(function() { lastData = data }); // inital the value for once only
  var dataset = this;

  _.map(patterns, function(pattern) {
    var grpData = tranings[pattern.join("")];
    if (pattern[0] == 'm') {
      _.map(_.range(pattern[1]), function(item) {
        grpData['m'+(data[2]-item)].input.push(data);
      });
    }
    if (pattern[2] == 'm') {
      _.map(_.range(pattern[3]), function(item) {
        if (grpData['m'+(data[2]-pattern[1]-item)])
          grpData['m'+(data[2]-pattern[1]-item)].output.push(data);
      });
      if (!(_.isNull(lastData)) &&(lastData[2] != data[2])) {
        if (grpData['m'+(data[2]-pattern[1]-pattern[3])])
          dataset.push(grpData['m'+(data[2]-pattern[1]-pattern[3])]);
      }
    }

  });

  lastData = data;
  done();
};

var jsonToStrings = JSONStream.stringify(false);
var request = require('request');

//request.get('http://chartapi.finance.yahoo.com/instrument/1.0/UVXY/chartdata;type=quote;range=5d/csv')

// tick data from google:
// http://www.google.com/finance/info?client=ig&q=gld

var patterns = [['m',1,'m',1]];
var tranings = {};

xs.sliceReverse(1)
.pipe(csvToJson)
.pipe(uniformData)
.pipe(calucateTheClosing)
.pipe(buildTrainingData)
.pipe(jsonToStrings)
.pipe(process.stdout);


