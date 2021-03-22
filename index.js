const {
  BASE_SCC_URL,
  CLASSIC_CATALOG_URL,
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
    expr: /^\/patroninfo/,
    handler: match => `${BASE_SCC_URL}/account`
  },
  recordReg: {
    expr: /\/record=(\w+)/,
    handler: (match) => {
      const bnum = match[1];
      return `${BASE_SCC_URL}/bib/${bnum}`;
    }
  },
};

// The main method to build the redirectURL based on the incoming request
// Given a path and a query, finds the first expression declared above which matches
// the path, and returns the corresponding handler with the matchdata and query
// As a default, returns the BASE_SCC_URL
function mapWebPacUrlToSCCURL(path, query) {
  let redirectURL;
  for (let pathType of Object.values(expressions)) {
      const match = path.match(pathType.expr);
      if (match) {
        redirectURL = pathType.handler(match, query);
        break
      }
  }
  if (!redirectURL) redirectURL = BASE_SCC_URL;
  return redirectURL;
}

const handler = async (event, context, callback) => {
  try {
    console.log('event: ', event);
    let path = event.path;
    let query = event.multiValueQueryStringParameters;
    let method = event.multiValueHeaders['x-forwarded-proto'][0] ;
    let mappedUrl = mapWebPacUrlToSCCURL(path, query);
    let redirectLocation = `${method}://${mappedUrl}`;
    const response = {
      isBase64Encoded: false,
      statusCode: 301,
      multiValueHeaders: {
        Location: [redirectLocation],
      },
    };
    return callback(null, response);
  }
  catch(err) {
    console.log('err: ', err.message);
    let method = event.multiValueHeaders['x-forwarded-proto'][0] ;
    let mappedUrl = BASE_SCC_URL;
    let redirectLocation = `${method}://${mappedUrl}`;
    const response = {
      isBase64Encoded: false,
      statusCode: 301,
      multiValueHeaders: {
        Location: [redirectLocation],
      },
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
