var request = require('request'),
  fs = require('fs'),
  zlib = require('zlib'),
  async = require('async'),
  _ = require('underscore'),
  cheerio = require('cheerio');

var headers = {
  "Accept":"application/xml, text/xml, */*",
  "Accept-Encoding":"gzip, deflate, sdch",
  "Accept-Language":"en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4",
  "Cache-Control":"no-cache",
  "Connection":"keep-alive",
  "Host":"invest.ameritrade.com",
  "Pragma":"no-cache",
  "Referer":"https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain",
  "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36",
  "X-Requested-With":"XMLHttpRequest",
}
headers.Cookie=process.env.COOKIES;

var greeksAnalytical= function(action, symbol) {
  return {
    symbol: symbol,
    action: action,
    url: "https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain?pagehandler=PHAnalyticalOptionChain&source=&symbol="+symbol+"&type=A&range=ALL&expire=A&strike=&action=Y&call_or_put="+action+"#",
    headers: headers
  }
}

var optionsPrice = function(symbol) {
  return {
    symbol: symbol,
    url: "https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain?symbol=" + symbol + "&leg=symbol&type=CP&range=ALL&expire=AL&tabid=0",
    headers: headers
  }
}

var requestWithEncoding = function(optionsVal, callback) {
  var req = request.get(optionsVal);

  req.on('response', function(res) {
    var chunks = [];
    res.on('data', function(chunk) {
      chunks.push(chunk);
    });

    res.on('end', function() {
      var buffer = Buffer.concat(chunks);
      var encoding = res.headers['content-encoding'];
      if (encoding == 'gzip') {
        zlib.gunzip(buffer, function(err, decoded) {
          callback(err, decoded && decoded.toString());
        });
      } else if (encoding == 'deflate') {
        zlib.inflate(buffer, function(err, decoded) {
          callback(err, decoded && decoded.toString());
        })
      } else {
        callback(null, buffer.toString());
      }
    });
  });

  req.on('error', function(err) {
    callback(err);
  });
}

var greeksExtraction = function(options, stocktick, callback) {
  requestWithEncoding(options, function(err, data) {
    if (err) callback(err);
    else {
      var $ = cheerio.load(data);

      var header = [], rtnData = [];
      $('table.underlyingTable').children().eq(1).children().each(function(i, element){
        var val = $(this).text()
        if (val !== '')
          header.push( (val==='--') ? null :  val.replace(",","") );
      });

      if (header.length == 0) {
        console.log('User account have been timeout!');
        process.exit(2);
      }

      var dt = new Date();
      // it only run between 6:20am and 13:10pm
      if (((dt.getHours()*100 + dt.getMinutes()) <= 618) || ((dt.getHours()*100 + dt.getMinutes()) >= 1312)) {
         console.log('Out of market hours!');
//!
//         process.exit(0);
      }
/*
//?
      fs.writeFile('./quotehtml/'+options.symbol+'~'+options.action+'^'+dt.getTime(), data, function (err) {
        if (err) throw err;
        console.log('Quote saved: ' + options.symbol+'~'+options.action+'^'+dt.getTime());
      });
*/


      if (stocktick == null) {
        var realtime = header[header.length - 1].split(" ");
        realtime.pop();
        var createDate = new Date( realtime.join(" ") + " GMT-0500 (PST)" ) ;
        var timeStamp = new Date( realtime.join(" ") + " GMT-0500 (PST)" ).getTime();

        stocktick = {
          symbol : header[0].replace("$","").replace(".","_"),
          bid : header[1],
          ask : header[2],
          last : header[3],
          change : header[4],
          BAsize : header[6],
          high : header[7],
          low : header[8],
          volume : header[9],
          createdDate : createDate,
          timeStamp : timeStamp
        };

        console.log('~define stocktick:', stocktick );
      }

      var lastHeader;

      $('table.t0').children().each(function(i, element){
        if (i > 0) {
          var row = [];
          var key;
          $(this).children().each(function(i, elem) {
            var val = $(this).text()
            if (val.length > 14) {
              var $$ = cheerio.load($(elem).html());
              key = $$('a').attr('onclick').split("','")[2];
//              console.log('XXXX2',     $$('a').attr('onclick').split("','")[2] );
            }
            if (val !== '' && val !== ' ')
              row.push( (val==='--') ? null :  val.replace(",","") );
          });
//        console.log( i, row );

          // create contract date format from 'Feb 27 2015' to '20150227' from data element 'AAPL (Mini) Jul 17 2015 165 Call'
          var title = row[1].replace("$","");
          var tmpDate = row[1].split(" ");
          if (tmpDate.length == 7) tmpDate.splice(1, 1);
          var tmpDate2 = new Date(tmpDate[1]+ ' ' + tmpDate[2]+ ' ' + tmpDate[3]);
          var contractDate = (tmpDate2.getFullYear() + '' + ('0'+(tmpDate2.getMonth()+1)).slice(-2) + '' + ('0'+(tmpDate2.getDate())).slice(-2));
//        console.log( contractDate );

          // create the colletion name AAPL-20150227-165
          var action = tmpDate[tmpDate.length-1];
//          var key = header[0].replace("$","") + '-' + contractDate  + '-' + tmpDate[tmpDate.length-2];
//        console.log( key );

          var tmpData = {contract : key, title : title , createdDate : stocktick.createdDate, timeStamp : stocktick.timeStamp, action : action, strike: row[0] , bid: row[2], ask: row[3], IV: row[4], Theo: row[5], Delta: row[6], Gamma: row[7], Theta:row[8], Vega:row[9], Rho:row[10] };

          rtnData.push(tmpData);
        }
      });
      callback(null, rtnData, stocktick);
    }
  });
};

var optionExtraction = function(options, stocktick, callback) {
  requestWithEncoding(options, function(err, data) {

    if (err) console.log(err);
    else {
      var dt = new Date();
//
//?
      /*
      fs.writeFile('./quotehtml/'+options.symbol+'^'+dt.getTime(), data, function (err) {
        if (err) throw err;
        console.log('Quote saved: ' + options.symbol+'^'+dt.getTime());
      });
*/
      var $ = cheerio.load(data);

      var header = [];
      $('tr.altrows').children().each(function(i, element){
        var val = $(this).text()
        if (val !== '')
          header.push( (val==='--') ? null :  val.replace(",","") );
      });

      var lastHeader, rtnData = [];
      $('tr.header.greyBG').parent().children().each(function(i, element){
        if (i > 0) {
          var $$ = cheerio.load($(this).children().next().html());
          var tmpDate, key;

          if (typeof $$('a').attr('id') == 'undefined') {
            tmpDate = lastHeader;
          } else {
            tmpDate = $$('a').attr('id').split(" ");
            lastHeader = tmpDate;
          }

          // remove the 'Weekly' word, could be others
          if (tmpDate.length > 6) tmpDate.splice(1, 1);
          var tmpDate2 = new Date(tmpDate[1]+ ' ' + tmpDate[2]+ ' ' + tmpDate[3]);
          var contractDate = (tmpDate2.getFullYear() + '' + ('0'+(tmpDate2.getMonth()+1)).slice(-2) + '' + ('0'+(tmpDate2.getDate())).slice(-2));
          var row = []
          $(this).children().each(function(i, elem) {
            var val = $(this).text()


            if (i == 1) {
//              console.log('~',i, $(elem).html())
              var $$ = cheerio.load($(elem).html());
              if ($$('a').attr('onclick'))
                key = $$('a').attr('onclick').split("','")[2];
            }
            if (val !== '' && val !== ' ')
              row.push( (val==='--') ? null :  val.replace(",","") );
          });

          if ((row.length > 6) && (row[0].split(" ")[1] !== '')) {
            var strike = row[0].split(" ")[0];
            var action = row[0].split(" ")[1];
//            var key = header[0].replace("$","") + '-' + contractDate  + '-' + tmpDate[tmpDate.length - 2];

            var tmpData = {contract : key , createdDate : stocktick.createdDate, timeStamp : stocktick.timeStamp, action : action, strike: strike , bid: row[1], ask: row[2], last: row[3], change: row[4], vol: row[5], opInt:row[6]};

            rtnData.push(tmpData);

//            console.log( tmpData  );

          }
        }
      });
      callback(null, rtnData, stocktick);
    }

  });
};


exports.getOptionsQuote = function(newSymbol, callback) {
  var dataSet = {};

    async.waterfall([
      function(cb) {
        // Reset the stocktick for the new collection name
        // get the Call data first with saving it
        greeksExtraction(greeksAnalytical('C', newSymbol), null, function(err, data, tick) {
          if (err) cb(err);
          else {
            _.map(data, function(item) {
              if (dataSet[item.contract]) {
                dataSet[item.contract].Call = item.Call;
              } else {
                dataSet[item.contract] = item;
              }
            });
            cb(null, data, tick);
          };
        });
      },
      function(allData, tick, cb) {
// get the Put data second
        greeksExtraction(greeksAnalytical('P', newSymbol), tick, function(err, data, tick) {
          if (err) cb(err);
          else {
            _.map(data, function(item) {
              if (dataSet[item.contract]) {
                dataSet[item.contract].Put = item.Put;
              } else {
                dataSet[item.contract] = item;
              }
            });
            cb(null, data, tick);
          };
        });
      },
      function(allData, tick, cb) {
        optionExtraction(optionsPrice(newSymbol), tick, function(err, data, tick) {
          if (err) cb(err);
          else {
            var endCnt = data.length;

            _.map(data, function(item) {
              var key = item.contract;
              if (dataSet[key]) {
                dataSet[key].last = item.last;
                dataSet[key].change = item.change;
                dataSet[key].vol = item.vol;
                dataSet[key].opInt = item.opInt;
              };

              endCnt--;
              if (endCnt <= 0) cb(null, data, tick);
            });
          };
        });
      }],
    function(err, allData, tick, cb) {
      console.log('done', newSymbol);
      callback(err, dataSet, tick);

    });
}




