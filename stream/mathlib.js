

exports.sma = function(interval) {
  var _cnt = 0
  ,_tot = 0.0
  ,_lst = []
  ,_interval = interval;

  return {
    get : function(val) {
      _lst.push(val);
      _tot= _tot + val;
      (_cnt == _interval) ? _tot=_tot - _lst.shift() : _cnt++;

      console.log('~%s', _tot);
      console.log('~%s', _cnt);
      return(_tot / _cnt);
    }
  };
};

exports.ema = function(interval) {
  var _cnt = 0
  ,_tot = 0.0
  ,_lst = []
  ,_interval = interval;

  return {
    get : function(val) {
      _lst.push(val);
      _tot= _tot + val;
      (_cnt == _interval) ? _tot=_tot - _lst.shift() : _cnt++;

      console.log('~%s', _tot);
      console.log('~%s', _cnt);
      return(_tot / _cnt);
    }
  };
};
