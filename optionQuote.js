var request = require('request'),
  zlib = require('zlib'),
  async = require('async'),
  _ = require('underscore'),
  cheerio = require('cheerio');

var dataSet = {};

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

var options = {
  url: "https://invest.ameritrade.com/cgi-bin/apps/u/OptionChain?symbol=SVXY&leg=symbol&type=CP&range=N&expire=AL&tabid=0",
  headers: headers
}

var requestWithEncoding = function(options, callback) {
  var req = request.get(options);

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

function pad2(n) {  // always returns a string
  return (n < 10 ? '0' : '') + n;
}


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

    console.log( {
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
    }  );

    var lastHeader;

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

        if (tmpDate[1] == '(Weekly)') tmpDate.splice(1, 1);
        var tmpDate2 = new Date(tmpDate[1]+ ' ' + tmpDate[2]+ ' ' + tmpDate[3]);
        var contractDate = (tmpDate2.getFullYear() + '' + pad2(tmpDate2.getMonth()+1) + '' + pad2(tmpDate2.getDate()));

        var row = []
        $(this).children().each(function(i, elem) {
          var val = $(this).text()
          if (val !== '' && val !== ' ')
            row.push( (val==='--') ? null :  val );
        });

        if (row[0].split(" ")[1] !== '') {
          var tmpData = {};
          var strike = row[0].split(" ")[0];
          var action = row[0].split(" ")[1];
          var key = header[0] + '-' + contractDate  + '-' + strike;

          tmpData = {contract : key , createdDate : createDate, timeStamp : timeStamp};
          tmpData[action] = [{ strike: strike , bid: row[1], ask: row[2], last: row[3], change: row[4], vol: row[5], opInt:row[6] }];

//          console.log( tmpData  );
          if (dataSet[key]) {
            dataSet[key][action] = tmpData[action]
          }
          else dataSet[key] = tmpData;
        }
      }


    });

    console.log( dataSet  );

  }
})