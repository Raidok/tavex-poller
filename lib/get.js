const Promise = require('bluebird');
const rp = require('request-promise');
const cheerio = require('cheerio');



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

function parseResponseData(data) {
  console.log('about to parse results from ', data);
  console.log('about parse ', data.results);
  var results = [];
  Object.keys(data.results).forEach(item => {
    console.log(item + ':');
    results[item] = parseItem(data.results[item]);
  });
  return results;
}

function parseItem(itemHtml) {
  var $ = cheerio.load(itemHtml);
  var result = {};

  $('li.wesell span').each(function (i, element) {
    var from = element.attribs['data-from'];
    var price = $(element).text().replace(' €', '');
    console.log(' they sell', from, 'for', price);
    if (from === '0') {
      result.sell = price;
    }
  });

  $('li.webuy span').each(function (i, element) {
    var from = element.attribs['data-from'];
    var price = $(element).text().replace(' €', '');
    console.log(' they buy', from, 'for', price);
    if (from === '0') {
      result.buy = price;
    }
  });

  return result;
}

async function getPricelists(globals, items) {
  var options = {
    uri: globals.ajax_path,
    method: 'POST',
    form: { "nonce": globals.ajax_nonce, "action": "pricelist", "data": items },
    transform: data => JSON.parse(data)
  };
  console.log('getting data with:', options);
  return rp(options);
}

function extractGlobalsJson(script) {
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

function getGlobalsJson($) {
  var result;
  $('script').each(function (i, element) {
    if (element.children.length > 0) {
      var data = element.children[0].data;
      if (!!~data.indexOf('ajax_nonce')) {
        // TODO break out early?
        result = extractGlobalsJson(data);
      }
    }
  });
  if (result) {
    return result;
  } else {
    throw new Error('Failed to find json script from page!');
  }
}

function getItems($) {
  var items = [];
  $('ul.price-list[data-id]').each(function (i, element) {
    console.log('item:', element.attribs['data-id']);
    items.push(element.attribs['data-id']);
  });
  return items;
}

module.exports = async function (uri) {
  const $ = await rp({ uri, transform: body => cheerio.load(body) });
  const globals = getGlobalsJson($);
  console.log('globals:', globals);
  const items = getItems($);
  console.log('items:', items);
  const data = await getPricelists(globals, items);
  const result = parseResponseData(data);
  return result;
};
