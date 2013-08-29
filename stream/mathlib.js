var _ = require('underscore');
var async = require('async');

exports.sma = function(interval) {
  var _cnt = 0
  ,_tot = 0.0
  ,_lst = [];

  return {
    get : function(val) {
      _lst.push(val);
      _tot= _tot + val;
      (_cnt == interval) ? _tot=_tot - _lst.shift() : _cnt++;
      return(_tot / _cnt);
    }
  };
};


exports.bayesItem = function(pattern, name) {
  var _pattern = pattern
  ,_name = name
  ,_max = -10.0
  ,_min = 1000.0
  ,_distance = 0
  ,_input=[]
  ,_output=[]
  ,_completed=false;

  var __row = 0
  , __year = 1
  , __month = 2
  , __week = 3
  , __date = 4
  , __close = 5
  , __volumn = 6;

  return {
    getPattern : function() {
      return _pattern;
    },
    getName : function() {
      return _name;
    },
    pushInput : function(aLine) {
      _input.push(aLine);
      return _input;
    },
    getInput : function() {
      return _.map(_input, function(item) { return (item[__close] - _min) / (_max - _min); });
    },
    pushOutput : function(aLine) {
      _output.push(aLine);
      return _output;
    },
    getOutput : function() {
      return _output;
    },
    getDataSet : function(maxUp, minDown, maxDown, minUp) {
      var outputData = {};
      if (_distance >= 0) {
        outputData['up'] = (_distance - minUp) / (maxUp - minUp);
      } else {
        var tmpVal = Math.abs(_distance - minDown) / (minDown - maxDown);
        outputData['down'] = (tmpVal > 1) ? 1 : tmpVal;
      }
      var inputData = _.reduce(_.range(_input.length), function(memo, num){
        var tmp = {}
        tmp['a' + num] = (_input[num][__close] - _min) / (_max - _min);
        return memo = _.extend(memo, tmp);
      }, {});

      return {input: inputData, output: outputData};
    },
    setScale : function() {
      _max = _.max(_input, function(item) { return item[__close]})[__close];
      _min = _.min(_input, function(item) { return item[__close]})[__close];
      _distance = _output[_output.length-1][__close] - _output[0][__close];
      _completed=true;
    },
    getScale : function() {
      return ({
        max: _max,
        min: _min,
        distance: _distance
      });
    },
    getBoth : function() {
      return({input: _input, output : _output});
    },
    getDistance : function() {
      return _distance;
    },
    isCompleted : function() {
      return _completed;
    }
  };
};

