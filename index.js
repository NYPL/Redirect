global.logArray = [];
global.log = (...args) => { global.logArray = global.logArray.concat(args); console.log(args) }

const { checkRecordSource } = require('./platformUtil.js');

const {
  BASE_SCC_URL,
  CLASSIC_CATALOG_URL,
  CLIENT_ID,
  CLIENT_SECRET,
} = process.env;


const indexMappings = {
  // X: '',
  // Y: '',
  a: '&search_scope=contributor',
  t: '&search_scope=title',
  s: '&search_scope=journal_title',
  // h: '', // there is no genre search
  // d: '', // this is the subject search, might want to do something different
  i: '&search_scope=standard_number', // what to do with these?
  c: '&search_scope=standard_number',
}

const getIndexMapping = index => indexMappings[index] || '';

const recodeSearchQuery = query => query.split(/\+|\s/).join("%20");

const getQueryFromParams = (url, query) => {
  const getParam = param => (query[param] || [])[0];
  const searchArg = getParam('searcharg');
  const searchArgAlt = getParam('SEARCH');
  let searchIndex;
  let searchArgFromQueryParam;
  for (let key in query) {
    const value = getParam(key);
    if (!value) {
      const splitted = key.split('/');
        if (splitted[1]) {
          searchIndex = splitted[1][0];
          searchArgFromQueryParam = splitted[1].slice(1);
          break;
        }
        else if (splitted[0]) {
          searchArgFromQueryParam = splitted[0];
          break;
        }
    }
  }
  const q = searchArg || searchArgAlt || searchArgFromQueryParam || '';
  const searchType = getParam('searchtype') || searchIndex;
  return recodeSearchQuery(q + (searchType ? getIndexMapping(searchType) : ''));
}

// declare some regular expressions

const expressions = {
  nothingReg: {
    expr: /^\/$/,
    handler: () => BASE_SCC_URL,
  },
  searchRegWith: {
    expr: /\/search(~S\d*)?\/([a-zA-Z])(([^\/])+)/,
    handler: match => `${BASE_SCC_URL}/search?q=${recodeSearchQuery(match[3])}${getIndexMapping(match[2])}`
  },
  searchRegWithout: {
    expr: /\/search(~S\d*)?(\/([a-zA-Z]))?/,
    handler: (match, query) => `${BASE_SCC_URL}/search?q=${getQueryFromParams(match[0], query)}${getIndexMapping(match[3])}`
  },
  patroninfoReg: {
    expr: /\/patroninfo[^\/]\/(\d+)/,
    handler: match => `${BASE_SCC_URL}?fakepatron=${match[1]}`
  },
  recordReg: {
    expr: /\/record=(\w+)/,
    handler: async function(match) {
      const bnum = match[1];
      global.log('record: ', bnum);
      let source = await checkRecordSource(bnum);
      global.log('checked record source: ', source);
      // Look it up in Discovery API, if it exists handle it normally.
      if (source === 'discovery') {
        return `${BASE_SCC_URL}/bib/${bnum}`;
      }
      // If it doesn't exist look up the bnumber in the bib service.
      // If it exists there, redirect to classic catalog (it's future URL TBD)
      else if (source === 'bib-service'){
        return `${CLASSIC_CATALOG_URL}/record/${bnum}`;
      }
      // If it doesn't exist in either, return a 404
      else {
        return `${BASE_SCC_URL}/404`;
      }
    }
  },
};

async function mapWebPacUrlToSCCURL(path, query) {
  console.log('mapping');
  let redirectURL;
  for (let pathType of Object.values(expressions)) {
      const match = path.match(pathType.expr);
      if (match) {
        global.log('matching: ', pathType);
        redirectURL = await pathType.handler(match, query);
        break
      }
  }
  if (!redirectURL) redirectURL = BASE_SCC_URL;
  console.log('returning: ', redirectURL);
  return redirectURL;
}

const init = async () => {
  global.log('init env vars: ', process.env);
  const { decrypt } = require('./kms_util.js');

  global.log('decrypting')
  global.decryptedClientId = await decrypt(CLIENT_ID);
  global.decryptedClientSecret = await decrypt(CLIENT_SECRET);
  global.log('successfully decrypted');
  return new Promise(resolve => resolve());
}

const initPromise = init();

const handler = async (event, context, callback) => {
  try {
    global.log('env vars: ', process.env);
    global.log('event: ', event, 'context: ', context);
    const functionConfig = await initPromise;
    global.log('decrypted secrets check ', !!global.decryptedClientId, !!global.decryptedClientSecret);
    let path = event.path;
    let query = event.multiValueQueryStringParameters;
    let method = event.multiValueHeaders['x-forwarded-proto'][0] ;
    let mappedUrl = await mapWebPacUrlToSCCURL(path, query);
    let redirectLocation = `${method}://${mappedUrl}`;
    global.log('location: ', redirectLocation);
    const response = {
      isBase64Encoded: false,
      statusCode: 301,
      multiValueHeaders: {
        Location: [redirectLocation],
      }
    };
    return callback(null, response);
  }
  catch(err) {
    global.log('err: ', err);
    // console.log(JSON.stringify(global.logArray, null, 2));
    let method = event.multiValueHeaders['x-forwarded-proto'][0] ;
    let mappedUrl = BASE_SCC_URL;
    let redirectLocation = `${method}://${mappedUrl}`;
    const response = {
      isBase64Encoded: false,
      statusCode: 301,
      multiValueHeaders: {
        Location: [redirectLocation],
      }
    };
    return callback(null, response)
  }
};

module.exports = {
  mapWebPacUrlToSCCURL,
  expressions,
  getQueryFromParams,
  getIndexMapping,
  indexMappings,
  handler,
  BASE_SCC_URL,
};
