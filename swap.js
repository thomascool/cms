
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');

fs.readFile('/tmp/EEM.csv', 'utf8', function (err, data) {
  if (err) throw err;
  var lines = data.split(/\r?\n/);

  var result = ( _.sortBy(_.filter(lines, function(item) { return item.charAt(0) === '2';}),
//  function(item){ return moment( item.split(',')[0].split('-') ).utc().valueOf(); }) );
  function(item){ return item.split(',')[0]; }) );

  _.each(result, function(item) {console.log(item);})
});