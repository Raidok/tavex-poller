const argv = require('minimist')(process.argv.slice(2));
const get = require('../lib/get');

async function run(uri) {
  const response = await get(uri);
  console.log('response', response);
}

run(argv._[0]);


