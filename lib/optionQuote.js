var request = require('request'),
  zlib = require('zlib'),
  async = require('async'),
  _ = require('underscore'),
  MongoClient = require('mongodb').MongoClient,
  cheerio = require('cheerio');

var _conn_mongo = 'mongodb://127.0.0.1:27017/optiondata',
  dataSet = {},
  stocktick = undefined;

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
//headers.Cookie=process.env.COOKIES;
headers.Cookie="HTTPOnly; dbox_logout=ADVNCED; optionchainview=all; loginPromo=3; TDATRADING=0000bxNnNDZOjSvUgcSDmppkxXe:17pbkcciu; invest_VCE_Account_en=SBLnbsjmkQZQlxaY7AqZ072CLEC4NLuQxu17POPOVZo%253D; invest_VENDOR=HEADER_PATH=/cgi-bin/apps/u/ResearchHeader&HEADER_HEIGHT=1&HEADER_WIDTH=100%&HEADER_STYLE=&HEADER_SCROLL=no&FOOTER_PATH=/cgi-bin/apps/u/ResearchFooter&FOOTER_HEIGHT=1&FOOTER_WIDTH=100%&FOOTER_STYLE=&FOOTER_SCROLL=no&CONTENT_SWITCH=1111311111011210111111101100101111&DOMAIN_NAME=https://invest.ameritrade.com&COMPANY_NAME=TD Ameritrade&TIME_STAMP=20150223 16:24:47&ACCT_ID=B6D3501853E62832F15471A5C7232F4755EE2BC206F0BB76&WALLST_CLIENTID=aac689a69d55e710f6c4aa94b9df0b9cb78b1949&MORNINGSTART_ CLIENTID=436c1d24b45ffde9aebd73c5bf02e0a8456abf49&SANDP_ CLIENTID=ad2ac2d2f23451857b1bd656bb2615fdbef4d93a&SNITILY_CARR_ CLIENTID=804e938f876bfbaf1246612cdf395179cf03ed4d&MINYANVILLE_ CLIENTID=0c9be6dc903209a921864467968df26f23769dfc&VALUEBOND_ CLIENTID=7e96b478d1becb6c710856405bef3f696def74ea&PREDICTWALLST_ CLIENTID=d58526369cea11d87fba74fb59b7213f6d56a072&VCE_ CLIENTID=083a97b2a3a10b1019fe6bd784d1b54d3501934a&GK_CLIENTID=ad94c616799314f8ad590b1d1a600b8daff765a6&INVESTOOLS_CLIENTID=1f33fcca96031d0d2b3f40d5bc4286f6fc86ae58&OPINION_CLIENTID=60001ba35305e8765ad3806edaf53816264608f1; dv_data=466606d25886d14b80c4c3fc184e128110219dd198fe; oo_inv_percent=0; invest_VCE_Context=Context%3DMain%26Indicator%3DFalse; mbox=PC#1423681422000-358062.20_39#1425971484|check#true#1424761944|session#1424761883037-596634#1424763744; audience=client; oo_OODynamicRewrite_weight=0; oo_inv_hit=2; s_pers=%20s_fid%3D70355F32E0489462-3ED4673A96417F37%7C1487920306233%3B%20s_pageName%3Dgrd%253Ahome%253Ahome%2520page%7C1424763706236%3B; s_sess=%20s_ppv%3D-%252C100%252C100%252C735%3B%20s_cc%3Dtrue%3B%20s_sq%3D%3B"


var greeksAnalytical= function(action, symbol) {
  return {
    url: "https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain?pagehandler=PHAnalyticalOptionChain&source=&symbol="+symbol+"&type=A&range=ALL&expire=A&strike=&action=Y&call_or_put="+action+"#",
    headers: headers
  }
}

var optionsPrice = function(symbol) {
  return {
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

var greeksExtraction = function(options, callback) {
  requestWithEncoding(options, function(err, data) {
    if (err) callback(err);
    else {
      var $ = cheerio.load(data);

      var header = [], rtnData = [];
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
          symbol : header[0].replace("$",""),
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

//        console.log('~define stocktick:', stocktick );
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
          var title = row.join('~').replace("$","");
          var tmpDate = row[1].split(" ");
          if (tmpDate.length == 7) tmpDate.splice(1, 1);
          var tmpDate2 = new Date(tmpDate[1]+ ' ' + tmpDate[2]+ ' ' + tmpDate[3]);
          var contractDate = (tmpDate2.getFullYear() + '' + ('0'+(tmpDate2.getMonth()+1)).slice(-2) + '' + ('0'+(tmpDate2.getDate())).slice(-2));
//        console.log( contractDate );

          // create the colletion name AAPL-20150227-165
          var action = tmpDate[tmpDate.length-1];
          var key = header[0].replace("$","") + '-' + contractDate  + '-' + tmpDate[tmpDate.length-2];
//        console.log( key );

          var tmpData = {contract : key, title : title , createdDate : createDate, timeStamp : timeStamp, Call : {}, Put : {}};
          tmpData[action] = { strike: row[0] , bid: row[2], ask: row[3], IV: row[4], Theo: row[5], Delta: row[6], Gamma: row[7], Theta:row[8], Vega:row[9], Rho:row[10] };

          rtnData.push(tmpData);
/*
          if (dataSet[key]) {
            dataSet[key][action] = rtnData[action]
          } else {
            dataSet[key] = rtnData;
          }
          */
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
        symbol : header[0].replace("$",""),
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

      var lastHeader, rtnData = [];
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
            var strike = row[0].split(" ")[0];
            var action = row[0].split(" ")[1];
            var key = header[0].replace("$","") + '-' + contractDate  + '-' + tmpDate[tmpDate.length - 2];

            var tmpData = {contract : key , createdDate : createDate, timeStamp : timeStamp};
            tmpData[action] = { strike: strike , bid: row[1], ask: row[2], last: row[3], change: row[4], vol: row[5], opInt:row[6]};

            rtnData.push(tmpData);

//            console.log( tmpData  );

/*
            if (dataSet[key] && dataSet[key][action]) {
              dataSet[key][action].last = row[3];
              dataSet[key][action].change = row[4];
              dataSet[key][action].vol = row[5];
              dataSet[key][action].opInt = row[6];
            } else  if (dataSet[key]) {
              dataSet[key][action] = tmpData[action]
            }
*/

          }
        }
      });
      callback(null, rtnData);
    }

  });
};


exports.optionQuote = function(newSymbol, callback) {
  var dataSet = {};

    async.waterfall([
      function(cb) {
        // Reset the stocktick for the new collection name
        stocktick = undefined;
        // get the Call data first with saving it
        greeksExtraction(greeksAnalytical('C', newSymbol), function(err, data) {
          if (err) cb(err);
          else {
            _.map(data, function(item) {
              if (dataSet[item.contract]) {
                dataSet[item.contract].Call = item.Call;
              } else {
                dataSet[item.contract] = item;
              }
            });
            cb(null, data);
          };
        });
      },
      function(allData, cb) {
// get the Put data second
        greeksExtraction(greeksAnalytical('P', newSymbol), function(err, data) {
          if (err) cb(err);
          else {
            _.map(data, function(item) {
              if (dataSet[item.contract]) {
                dataSet[item.contract].Put = item.Put;
              } else {
                dataSet[item.contract] = item;
              }
            });
            cb(null, data);
          };
        });
      },
      function(allData, cb) {
        optionExtraction(optionsPrice(newSymbol), function(err, data) {
          if (err) cb(err);
          else {
            var endCnt = data.length;

            _.map(data, function(item) {
              var key = item.contract;
              if (dataSet[key] && dataSet[key].Call && item.Call) {
                dataSet[key].Call.last = item.Call.last;
                dataSet[key].Call.change = item.Call.change;
                dataSet[key].Call.vol = item.Call.vol;
                dataSet[key].Call.opInt = item.Call.opInt;
              };
              if (dataSet[key] && dataSet[key].Put && item.Put) {
                dataSet[key].Put.last = item.Put.last;
                dataSet[key].Put.change = item.Put.change;
                dataSet[key].Put.vol = item.Put.vol;
                dataSet[key].Put.opInt = item.Put.opInt;
              };

              endCnt--;
              if (endCnt <= 0) cb(null, data);
            });
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
              if (err) {
                console.log('ERROR: ', err);
                callback(err);
              }

              endCnt--;
              if (endCnt <= 0) {
                db.close();
                callback(null);
              }

              return key
            });
          });
        });

      }
    });
}




