

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


