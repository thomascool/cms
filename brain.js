//  https://github.com/harthur/brain/
var _ = require('underscore');
var brain = require('brain')
, net = new brain.NeuralNetwork();

var dataset = []

_.each(_.range(3), function(item) {
  var out = {};

    out[ ((Math.random() > 0.5) ? 'black' : 'white') ] = Math.random();
    inputVal = _.reduce(_.range(10), function(memo, num) {
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

var output = net.run({ a0: 0.10502143274061382,
  a1: 0.9767115139402449,
  a2: 0.7244157237000763,
  a3: 0.7497721111867577,
  a4: 0.29375994950532913,
  a5: 0.039424927439540625,
  a6: 0.5869070172775537,
  a7: 0.006673179566860199,
  a8: 0.38234652346000075,
  a9: 0.47436763090081513});

console.log(output);

