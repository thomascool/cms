

exports.sma = function() {
  var _cnt = 0;
  var _tot = 0.0;
  var _lst = [];

  return {
    get : function(interval, val) {
      _lst.push(val);
      _tot= _tot + val;
      (_cnt == interval) ? _tot=_tot - _lst.shift() : _cnt++;

      console.log('~%s', _tot);
      console.log('~%s', _cnt);
      return(_tot / _cnt);
    }
  };
};

exports.ema = function() {
  var _cnt = 0;
  var _tot = 0.0;
  var _lst = [];

  return {
    get : function(interval, val) {
      _lst.push(val);
      _tot= _tot + val;
      (_cnt == interval) ? _tot=_tot - _lst.shift() : _cnt++;

      console.log('~%s', _tot);
      console.log('~%s', _cnt);
      return(_tot / _cnt);
    }
  };
};
