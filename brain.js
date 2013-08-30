//  https://github.com/harthur/brain/
var _ = require('underscore');
var brain = require('brain')
, net = new brain.NeuralNetwork();

var dataset = []

_.each(_.range(300), function(item) {
  var out = {};

    out[ ((Math.random() > 0.5) ? 'black' : 'white') ] = Math.random();
    inputVal = _.reduce(_.range(20), function(memo, num) {
      var aaa = {};
      aaa['a'+num] = Math.random();
      return  _.extend(memo, aaa);
    }, {});

    dataset.push({'input':inputVal, 'output':out});
});

console.log('~~~');
console.log(dataset);
console.log('~~~');
/*
Math.random()


[{input: { r: 0.03, g: 0.7, b: 0.5 }, output: { black: 1 }},
               {input: { r: 0.16, g: 0.09, b: 0.2 }, output: { white: 1 }},
               {input: { r: 0.5, g: 0.5, b: 1.0 }, output: { white: 0.9 }}];
*/
net.train(dataset);

var output = net.run( _.reduce(_.range(20), function(memo, num) {
  var aaa = {};
  aaa['a'+num] = Math.random();
  return  _.extend(memo, aaa);
}, {}));

console.log(output);


console.log(
net.run(
_.reduce(_.range(20), function(memo, num) {
  var aaa = {};
  aaa['a'+num] = Math.random();
  return  _.extend(memo, aaa);
}, {})
));

