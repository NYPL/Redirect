const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
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
  if (!q.length) return null;
  const searchType = getParam('searchtype') || searchIndex;
  return recodeSearchQuery(q + (searchType ? getIndexMapping(searchType) : ''));
}

// declare some regular expressions

const expressions = {
  nothingReg: {
    expr: /^\/$/,
    handler: () => BASE_SCC_URL,
  },
  oclc: {
    expr: /\/search\/o\=?(\d+)/,
    handler: match => `${BASE_SCC_URL}/search?oclc=${match[1]}&redirectOnMatch=true`,
  },
  issn: {
    expr: /\/search\/i(\d{4}\-\d{4})/,
    handler: match => `${BASE_SCC_URL}/search?issn=${match[1]}&redirectOnMatch=true`,
  },
  isbn: {
    expr: /\/search\/i(\w+)/,
    handler: match => `${BASE_SCC_URL}/search?isbn=${match[1]}&redirectOnMatch=true`,
  },
  searchRegWith: {
    expr: /\/search(~S\w*)?\/([a-zA-Z])(([^\/])+)/,
    handler: match => `${BASE_SCC_URL}/search?q=${recodeSearchQuery(match[3])}${getIndexMapping(match[2])}`
  },
  searchRegWithout: {
    expr: /\/search(~S\w*)?(\/([a-zA-Z]))?/,
    handler: (match, query) => {
      const mappedQuery = getQueryFromParams(match[0], query);
      if (!mappedQuery) return BASE_SCC_URL;
      return `${BASE_SCC_URL}/search?q=${mappedQuery}${getIndexMapping(match[3])}`;
    }
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
  legacyReg: {
    expr: /pinreset|selfreg/,
    handler: (match, query) => {
        return `${LEGACY_CATALOG_URL}${match.input}${reconstructQuery(query)}`
    }
  },
};

function reconstructQuery(query) {
  const reconstructedQuery = Object.entries(query).map(([key, values]) => {
      return values.map(value => value.length ? `${key}=${value}` : key).join('&')
    })
    .join('&');
  return reconstructedQuery.length ? `?${reconstructedQuery}` : ''
}

function reconstructOriginalURL(path, query, host, proto) {
  const reconstructedQuery = Object.entries(query).map(([key, values]) => {
      return values.map(value => value.length ? `${key}=${value}` : key).join('&')
    })
    .join('&');
  return encodeURIComponent(`${proto}://${host}${path}${reconstructQuery(query)}`);
}

// The main method to build the redirectURL based on the incoming request
// Given a path and a query, finds the first expression declared above which matches
// the path, and returns the corresponding handler with the matchdata and query
// As a default, returns the BASE_SCC_URL
function mapWebPacUrlToSCCURL(path, query, host, proto) {
  let redirectURL;
  for (let pathType of Object.values(expressions)) {
      const match = path.match(pathType.expr);
      if (match) {
        console.log('expr: ', pathType.expr);
        redirectURL = pathType.handler(match, query);
        break
      }
  }
  if (!redirectURL) redirectURL = `${BASE_SCC_URL}/404/redirect`;
  if (!redirectURL.includes(LEGACY_CATALOG_URL)) {
    redirectURL = redirectURL + (redirectURL.includes('?') ? '&' : '?') + 'originalUrl=' + reconstructOriginalURL(path, query, host, proto);
  }
  return redirectURL;
}

const healthCheck = () => {
  const version = require('./package.json').version;
  return {
    isBase64Encoded: false,
    statusCode: 200,
    body: { version },
  };
};

const handler = async (event, context, callback) => {
  try {
    console.log('event: ', event);
    let path = event.path;
    if (path === '/check') return callback(null, healthCheck());
    let query = event.multiValueQueryStringParameters || {};
    let proto = event.multiValueHeaders['x-forwarded-proto'][0] ;
    let host = event.multiValueHeaders.host[0];

    let mappedUrl = mapWebPacUrlToSCCURL(path, query, host, proto);
    let redirectLocation = `${proto}://${mappedUrl}`;
    const response = {
      isBase64Encoded: false,
      statusCode: 302,
      multiValueHeaders: {
        Location: [redirectLocation],
      },
    };
    return callback(null, response);
  }
  catch(err) {
    console.log('err: ', err.message);
    let proto = event.multiValueHeaders['x-forwarded-proto'][0] ;
    let mappedUrl = BASE_SCC_URL;
    let redirectLocation = `${proto}://${mappedUrl}`;
    const response = {
      isBase64Encoded: false,
      statusCode: 302,
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
  LEGACY_CATALOG_URL,
};
