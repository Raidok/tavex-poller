
var request = require('request');
var cheerio = require('cheerio');

/*
nonce:bf9be69a70
action:pricelist
data[]:GB20gPaFo
data[]:GB20gVa
*/

function postData(data) {
  var url = 'https://api.thingspeak.com/update?api_key=PYGDSXDW46QND9JW&field1=' + data.sell + '&field2=' + data.buy;
  console.log('posting:', url);
  request(url, function (error, response, html) {
    if (!error && response.statusCode === 200) {
      console.log('thingspeak responded with:', html);
    } else {
      console.error('error getting data:', error, response);
    }
  });
}

function parseResponse(data, item) {
  var json = JSON.parse(data);
  var $ = cheerio.load(json.results[item]);
  var result = {};

  $('li.wesell span').each(function (i, element) {
    var from = element.attribs['data-from'];
    var price = $(element).text().replace(' €', '');
    console.log('they sell', from, 'for', price);
    if (from === '0') {
      result.sell = price;
    }
  });

  $('li.webuy span').each(function (i, element) {
    var from = element.attribs['data-from'];
    var price = $(element).text().replace(' €', '');
    console.log('they buy', from, 'for', price);
    if (from === '0') {
      result.buy = price;
    }
  });
  postData(result);
}

function getData(json, item) {
  var requestData = { url: json.ajax_path, form: { "nonce": json.ajax_nonce, "action": "pricelist", "data[]": item }};
  console.log('getting data with:', requestData);
  request.post(requestData, function (error, response, html) {
    if (!error && response.statusCode === 200) {
      parseResponse(html, item);
    } else {
      console.error('error getting data:', error, response);
    }
  });
}

function parseScript(script) {
  var lines = script.split('\n');
  // we pick only the second line and remove var declaration from it
  var line = lines[2].replace('var globals = ', '');
  // remove semicolon
  line = line.substr(0, line.length-1);
  // parse json
  var json = JSON.parse(line);
  // verify json
  if (json.ajax_path && json.ajax_nonce) {
    return json;
  } else {
    throw new Error('Failed parsing json out of page script');
  }
}

function findScript($) {
  var result;
  $('script').each(function (i, element) {
    if (element.children.length > 0) {
      var data = element.children[0].data;
      if (!!~data.indexOf('ajax_nonce')) {
        result = parseScript(data);
      }
    }
  });
  if (result) {
    return result;
  } else {
    throw new Error('Failed to find json script from page!');
  }
}

function parsePage(html) {
  var $ = cheerio.load(html);
  var jsonFromPage = findScript($);
  var items = [];
  $('ul[data-id]').each(function (i, element) {
    console.log('item:', element.attribs['data-id']);
    items.push(element.attribs['data-id']);
  });
  if (items.length > 0) {
    getData(jsonFromPage, items[0]);
  } else {
    throw new Error('No items found!');
  }
}

// 'ul[data-id]'

request('https://tavid.ee/kuld/20-g-valcambi-suisse-kuldplaat/', function (error, response, html) {
  if (!error && response.statusCode === 200) {
    parsePage(html);
  } else {
    console.error('error getting html:', error, response);
  }
});
