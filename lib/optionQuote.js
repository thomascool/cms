var request = require('request'),
  zlib = require('zlib'),
  async = require('async'),
  _ = require('underscore'),
  MongoClient = require('mongodb').MongoClient,
  cheerio = require('cheerio');

var _conn_mongo = 'mongodb://127.0.0.1:27017/optiondata',
  dataSet = {},
  stocktick = undefined;

if (process.argv.length != 3) {
  console.log('%s <symbol>', process.argv[1]);
  process.exit(1);
}

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

var greeksAnalytical= function(action) {
  return {
    url: "https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain?pagehandler=PHAnalyticalOptionChain&source=&symbol="+process.argv[2]+"&type=A&range=ALL&expire=A&strike=&action=Y&call_or_put="+action+"#",
    headers: headers
  }
}

var optionsPrice = {
  url: "https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain?symbol="+process.argv[2]+"&leg=symbol&type=CP&range=ALL&expire=AL&tabid=0",
  headers: headers
}


var requestWithEncoding = function(optionsVal, callback) {
console.log(optionsVal);
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

var greeksExtraction = function(action_code, callback) {

  requestWithEncoding(greeksAnalytical(action_code), function(err, data) {
    if (err) callback(err);
    else {
      var $ = cheerio.load(data);

      var rtnData = {};
      var header = [];
      $('table.underlyingTable').children().eq(1).children().each(function(i, element){
        var val = $(this).text()
        if (val !== '')
          header.push( (val==='--') ? null :  val );
      });

      if (header.length == 0) {
        console.log('User account have been timeout!');
        process.exit(2);
      }

      var dt = new Date();
      // it only run between 6:20am and 13:10pm
      if (((dt.getHours()*100 + dt.getMinutes()) <= 618) || ((dt.getHours()*100 + dt.getMinutes()) >= 1312)) {
        console.log('Out of market hours!');
// tku     process.exit(0);
      }

      var realtime = header[header.length - 1].split(" ");
      realtime.pop();
      var createDate = new Date( realtime.join(" ") + " GMT-0500 (PST)" ) ;
      var timeStamp = new Date( realtime.join(" ") + " GMT-0500 (PST)" ).getTime();

      if (typeof stocktick == "undefined") {
        stocktick = {
          symbol : header[0],
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

        console.log('define stocktick:', stocktick );
      }

      var lastHeader;

      $('table.t0').children().each(function(i, element){
        if (i > 0) {
          var row = [];
          $(this).children().each(function(i, elem) {
            var val = $(this).text()
            if (val !== '' && val !== ' ')
              row.push( (val==='--') ? null :  val );
          });
//        console.log( i, row );

          // create contract date format from 'Feb 27 2015' to '20150227' from data element 'AAPL (Mini) Jul 17 2015 165 Call'
          var tmpDate = row[1].split(" ");
          if (tmpDate.length == 7) tmpDate.splice(1, 1);
          var tmpDate2 = new Date(tmpDate[1]+ ' ' + tmpDate[2]+ ' ' + tmpDate[3]);
          var contractDate = (tmpDate2.getFullYear() + '' + ('0'+(tmpDate2.getMonth()+1)).slice(-2) + '' + ('0'+(tmpDate2.getDate())).slice(-2));
//        console.log( contractDate );

          // create the colletion name AAPL-20150227-165
          var action = tmpDate[tmpDate.length-1];
          var key = header[0] + '-' + contractDate  + '-' + tmpDate[tmpDate.length-2];
//        console.log( key );

          rtnData = {contract : key , createdDate : createDate, timeStamp : timeStamp, Call : {}, Put : {}};
          rtnData[action] = { strike: row[0] , bid: row[2], ask: row[3], IV: row[4], Theo: row[5], Delta: row[6], Gamma: row[7], Theta:row[8], Vega:row[9], Rho:row[10] };
          if (dataSet[key]) {
            dataSet[key][action] = rtnData[action]
          } else {
            dataSet[key] = rtnData;
          }
        }
      });
      callback(null, rtnData);
    }
  });
};

var optionExtraction = function(options, callback) {

  requestWithEncoding(options, function(err, data) {

    if (err) console.log(err);
    else {
      var $ = cheerio.load(data);

      var header = [];
      $('tr.altrows').children().each(function(i, element){
        var val = $(this).text()
        if (val !== '')
          header.push( (val==='--') ? null :  val );
      });

      var realtime = header[header.length - 1].split(" ");
      realtime.pop();
      var createDate = new Date( realtime.join(" ") + " GMT-0500 (PST)" ) ;
      var timeStamp = new Date( realtime.join(" ") + " GMT-0500 (PST)" ).getTime();

      var stocktick = {
        symbol : header[0],
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

      var lastHeader, rtnData = {};
      $('tr.header.greyBG').parent().children().each(function(i, element){
        if (i > 0) {
          var $$ = cheerio.load($(this).children().next().html());
          var tmpDate;

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
            if (val !== '' && val !== ' ')
              row.push( (val==='--') ? null :  val );
          });

          if ((row.length > 6) && (row[0].split(" ")[1] !== '')) {
            var tmpData = {};
            var strike = row[0].split(" ")[0];
            var action = row[0].split(" ")[1];
            var key = header[0] + '-' + contractDate  + '-' + tmpDate[tmpDate.length - 2];

            tmpData = {contract : key , createdDate : createDate, timeStamp : timeStamp};
            tmpData[action] = { strike: strike , bid: row[1], ask: row[2], last: row[3], change: row[4], vol: row[5], opInt:row[6]};

//            console.log( tmpData  );
            if (dataSet[key] && dataSet[key][action]) {
              dataSet[key][action].last = row[3];
              dataSet[key][action].change = row[4];
              dataSet[key][action].vol = row[5];
              dataSet[key][action].opInt = row[6];
            } else  if (dataSet[key]) {
              dataSet[key][action] = tmpData[action]
            }
          }
        }
      });
      callback(null, dataSet);
    }

  });
};


exports.optionQuote = function(SYMBOL) {
  async.waterfall([
      function(cb) {
        // get the Call data first with saving it
        greeksExtraction('C', function(err, data) {
          if (err) cb(err);
          else {
            cb(null, data);
          };
        });
      },
      function(allData, cb) {
// get the Put data second
        greeksExtraction('P', function(err, data) {
          if (err) cb(err);
          else {
            cb(null, data);
          };
        });
      },
      function(allData, cb) {
        optionExtraction(optionsPrice, function(err, data) {
          if (err) cb(err);
          else {
            cb(null, data);
          };
        });
      }],
    function(err, allData) {
      if (err) {
        console.log('Error: ', err  );
        process.exit(10);
      } else {
        var endCnt = _.toArray(dataSet).length;
        MongoClient.connect(_conn_mongo, function(err, db) {
          if(err) throw err;

          var stockColl = db.collection('~'+stocktick.symbol);
          stockColl.insert(stocktick, function(err, docs) {
            if (err)
              console.log('ERROR: ', err);
          });

          _.map(dataSet, function(item, key) {
            var optionColl = db.collection(item.contract);
            optionColl.insert(item, function(err, docs) {
              if (err)
                console.log('ERROR: ', err);

              endCnt--;
//            console.log('endCnt: ', endCnt)
              if (endCnt <= 0)
                db.close();

              return key
            });
          });
        });

      }
    });
}




