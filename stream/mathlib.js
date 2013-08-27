var _ = require('underscore');

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
  ,_output=[];

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
    pushOutput : function(aLine) {
      _output.push(aLine);
      return _output;
    },
    findScale : function() {
      _max = _.max(_input, function(item) { return item[5]});
      _min = _.min(_input, function(item) { return item[5]});
      _distance = _output.shift()[5] - _output.pop()[5];
    },
    getBoth : function() {
      return({input: _input, output : _output});
    },
    getDistance : function() {
      return _distance;
    }
  };
};

