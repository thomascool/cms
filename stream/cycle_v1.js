
var yearNum = monthNum = weekNum = 1;
var firstWeek;
var _ = require('underscore');
var moment = require('moment');
var Transform = require('stream').Transform
  , csv = require('csv-streamify')
  , JSONStream = require('JSONStream');
var sf = require('slice-file');
var async = require('async');

var brain = require('brain');


var csvToJson = csv({delimiter: ',', objectMode: true});

var uniformData = new Transform({objectMode: true});
var lineNum = 0;
var lastUniformData=null;

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
var last=null;

calucateTheClosing._transform = function(data, encoding, done) {
  _.once(function() { last = data; tranings = {}; });
  var transform = [data[7], data[8], data[9], data[10], data[0], (parseFloat(data[2])+parseFloat(data[3])+(parseFloat(data[4])*2))/4, parseInt(data[5],10) ];

  // prepare the training data by creating all the group head in JSON
  _.map(patterns, function(pattern) {
    var patternStr = pattern.join("");
    if (!tranings[patternStr])
      tranings[patternStr] = {
        maxUp : -10000,
        minDown : -10000,
        maxDown : 10000,
        minUp : 10000,
        dataSetCnt : 0,
        net : new brain.NeuralNetwork()
      };

    var grpData = tranings[patternStr];

    var ymwVal = function() {
      if (pattern[0] == 'y') {
        return transform[1];
      } if (pattern[0] == 'm') {
        return transform[2];
      } if (pattern[0] == 'w') {
        return transform[3];
      }
    };

    if (!grpData['_' + pattern[0] + ymwVal()]) {
      grpData['_' + pattern[0] + ymwVal()] = new require('./mathlib').bayesItem(patternStr, '_' + pattern[0] + ymwVal());
    }

  });

  this.push(transform);
  done();
};

var extractTrainingData = new Transform({objectMode: true});
var lastData=null;

extractTrainingData._transform = function(data, encoding, done) {
  _.once(function() { lastData = data }); // inital the value for once only
  var dataset = this;

  _.map(patterns, function(pattern) {
    var grpData = tranings[pattern.join("")];
    if (pattern[0] == 'm') {
      _.map(_.range(pattern[1]), function(item) {
        if (grpData['_m'+(data[2]-item)])
          grpData['_m'+(data[2]-item)].pushInput(data);
      });
    }
    if (pattern[2] == 'm') {
      _.map(_.range(pattern[3]), function(item) {
        if (grpData['_m'+(data[2]-pattern[1]-item)])
          grpData['_m'+(data[2]-pattern[1]-item)].pushOutput(data);
      });
      if (!(_.isNull(lastData)) &&(lastData[2] != data[2])) {
        if (grpData['_m'+(data[2]-pattern[1]-pattern[3])]) {
          grpData['_m'+(data[2]-pattern[1]-pattern[3])].setScale();
          dataset.push(grpData['_m'+(data[2]-pattern[1]-pattern[3])]);
        }
      }
    }

  });

  lastData = data;
  done();
};

var setupDataScale = new Transform({objectMode: true});

setupDataScale._transform = function(data, encoding, done) {

  if (data.getDistance() > 0) {
    if (data.getDistance() > tranings[data.getPattern()].maxUp) {
      tranings[data.getPattern()].maxUp = data.getDistance();
    }
    if (data.getDistance() < tranings[data.getPattern()].minUp) {
      tranings[data.getPattern()].minUp = data.getDistance();
    }
  } if (data.getDistance() < 0) {
    if (data.getDistance() < tranings[data.getPattern()].maxDown) {
      tranings[data.getPattern()].maxDown = data.getDistance();
    }
    if (data.getDistance() > tranings[data.getPattern()].minDown) {
      tranings[data.getPattern()].minDown = data.getDistance();
    }
  }

//  this.push(data);
  done();
};

setupDataScale.on('end', function() {

  async.map(patterns, function(pattern, callback) {
    var grpData = tranings[pattern.join("")];
    var lineNum = 0;
    var thisFinal = [];

    async.waterfall([
      function(cb) {
        // counting the completed dataset
        grpData.dataSetCnt = _.filter(_.keys(grpData), function(item) {
          if ((item.charAt(0) === '_') && (grpData[item].isCompleted()))
//        console.log(grpData[item].getDistance());
            return ((item.charAt(0) === '_') && (grpData[item].isCompleted()));
        }).length;
        cb(null);
      },
      function(cb) {
        // In order to filter market crashed price values, setup 95% of the maxDown array for the maxDown
        var tmpArray = _.sortBy( _.map(_.filter(_.keys(grpData), function(item) { return ((item.charAt(0) === '_') && (grpData[item].getDistance() < 0) && (grpData[item].isCompleted())   ); }), function(objName) {
          return grpData[objName].getDistance();
        }) , function(num) {
          return num;
        });
        grpData.maxDown = tmpArray[Math.floor(tmpArray.length * 0.05)];
        cb(null);
      },
      function(cb) {
        var validDataSet = _.filter(_.keys(grpData), function(item) { return ((item.charAt(0) === '_') && (grpData[item].isCompleted())); });

        // get the dataset for training by ttRatio(Training and Testing Ratio)
        var trainSet = _.map(_.first( validDataSet, Math.ceil( grpData.dataSetCnt * (ttRatio/100))) , function(objName) {
          var tmpVal = grpData[objName].getDataSet(grpData.maxUp, grpData.minDown, grpData.maxDown, grpData.minUp);
          if (_.values(tmpVal.output)[0] >= minOutput) {
            return tmpVal;
          } else {
            return {input : {}, output: {}};
          }
        });
//    console.log(trainSet);
        cb(null, validDataSet, grpData.net.train(trainSet, {
          errorThresh: 0.008,  // error threshold to reach
          iterations: 20000,   // maximum training iterations
          log: false,           // console.log() progress periodically
          logPeriod: 100        // number of iterations between logging
        }));
      },
      function(validDataSet, dummy, cb) {

        // get the raw dataset for testing by ttRatio
        cb(null,
          _.map(_.last( validDataSet, grpData.dataSetCnt - Math.ceil( grpData.dataSetCnt * (ttRatio/100))) , function(objName) {
            lineNum++;
            var tmpDataSet = grpData[objName].getDataSet(grpData.maxUp, grpData.minDown, grpData.maxDown, grpData.minUp)
            , tmpRun =  grpData.net.run( tmpDataSet.input );

            return ({
              pattern : grpData[objName].getPattern(),
              name : objName,
              line : lineNum,
              Actual_outcome : JSON.stringify( tmpDataSet.output ),
              testDIR : JSON.stringify((tmpRun.up > tmpRun.down) ? {up:(tmpRun.up - tmpRun.down)} : {down:(tmpRun.down - tmpRun.up)}),
              testResult : JSON.stringify( tmpRun )
            });
          })
        );
      }
    ],
    function(err, results) {
      callback(null, results);
    });
  }, function(err, finalresults) {
    // OUTPUT ALL TOGETHER BY GROUP OF SAME TESTING DATA SOURCE (e.g. same month)
    var rptGroupBy = _.groupBy(
    _.reduce( finalresults, function(finalset, item) {
      return finalset = finalset.concat(item);
    }, [])
    , function(item) {
      return 'p' + item.line + '_m' + item.pattern[3];
    });

    console.log(rptGroupBy);

    console.log(_.map(rptGroupBy, function(v, n) {
      var tmpRtn = {};
      tmpRtn[n] = _.countBy(v, function(item) {
        return _.keys(JSON.parse(item.Actual_outcome))[0] == _.keys(JSON.parse(item.testDIR))[0];
      });
      return(tmpRtn);
    }));
  });


});

var jsonToStrings = JSONStream.stringify(false);
var request = require('request');

//request.get('http://chartapi.finance.yahoo.com/instrument/1.0/UVXY/chartdata;type=quote;range=5d/csv')

// tick data from google:
// http://www.google.com/finance/info?client=ig&q=gld

// training and testing ratio like 90% and 10%
var ttRatio = 97;
var minOutput = 0.1;

var patterns = [['m',1,'m',1],
                ['m',2,'m',1],
                ['m',3,'m',1],
                ['m',4,'m',1],
                ['m',5,'m',1],
                ['m',6,'m',1],
                ['m',7,'m',1],
                ['m',8,'m',1],
                ['m',9,'m',1],
                ['m',10,'m',1],
                ['m',11,'m',1],
                ['m',12,'m',1],

                ['m',2,'m',2],
                ['m',3,'m',2],
                ['m',4,'m',2],
                ['m',5,'m',2],
                ['m',6,'m',2],
                ['m',7,'m',2],
                ['m',8,'m',2],
                ['m',9,'m',2],
                ['m',10,'m',2],
                ['m',11,'m',2],
                ['m',12,'m',2],

                ['m',3,'m',3],
                ['m',4,'m',3],
                ['m',5,'m',3],
                ['m',6,'m',3],
                ['m',7,'m',3],
                ['m',8,'m',3],
                ['m',9,'m',3],
                ['m',10,'m',3],
                ['m',11,'m',3],
                ['m',12,'m',3],

                ['m',4,'m',4],
                ['m',5,'m',4],
                ['m',6,'m',4],
                ['m',7,'m',4],
                ['m',8,'m',4],
                ['m',9,'m',4],
                ['m',10,'m',4],
                ['m',11,'m',4],
                ['m',12,'m',4],

];

 patterns = [['m',1,'m',1]];


var tranings = {};

if (process.argv.length <= 2) {
  console.log ('%s <datafile.csv from "http://finance.yahoo.com/q/hp?s=EEM+Historical+Prices">', process.argv[1]);
  process.exit(1);
} else {
  _.each(_.range(2,process.argv.length), function(idx) {
    var path = process.argv[idx];
    console.log('==========================');
    console.log(path);
    console.log('==========================');

    var xs = sf(path);

    xs.sliceReverse(1)
    .pipe(csvToJson)
    .pipe(uniformData)
    .pipe(calucateTheClosing)
    .pipe(extractTrainingData)
    .pipe(setupDataScale)
//.pipe(jsonToStrings)
    .pipe(process.stdout);

  });
}


