BASE_SCC_URL = 'http://discovery.nypl.org/research/collections/shared-collection-catalog/';


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

const getQueryFromParams = (url, parsedURL) => {
  const searchArg = parsedURL.searchParams.get('searcharg');
  const searchArgAlt = parsedURL.searchParams.get('SEARCH');
  let searchIndex;
  let searchArgFromQueryParam;
  let breaker = false;
  parsedURL.searchParams.forEach((v,k) => {
    if (!v && !breaker) {
      const splitted = k.split('/');
      if (splitted[1]) {
        searchIndex = splitted[1][0];
        searchArgFromQueryParam = splitted[1].slice(1);
        breaker = true;
      }
    }
  });
  const q = searchArg || searchArgAlt || searchArgFromQueryParam || '';
  const searchType = parsedURL.searchParams.get('searchtype') || searchIndex;
  return recodeSearchQuery(q + (searchType ? getIndexMapping(searchType) : ''));
}

// declare some regular expressions

const expressions = {
  nothingReg: {
    expr: /^\/$/,
    handler: () => BASE_SCC_URL,
  },
  searchRegWith: {
    expr: /\/search(~S\d*)?\/([a-zA-Z])((\w|\W)+)/,
    handler: match => `${BASE_SCC_URL}search?q=${recodeSearchQuery(match[3])}${getIndexMapping(match[2])}`
  },
  searchRegWithout: {
    expr: /\/search(~S\d*)?(\/([a-zA-Z]))?/,
    handler: (match, parsedURL) => `${BASE_SCC_URL}search?q=${getQueryFromParams(match[0], parsedURL)}${getIndexMapping(match[3])}`
  },
  patroninfoReg: {
    expr: /\/patroninfo[^\/]\/(\d+)/,
    handler: match => `${BASE_SCC_URL}?fakepatron=${match[1]}`
  },
  recordReg: {
    expr: /\/record=(\w+)/,
    handler: match => `${BASE_SCC_URL}bib/${match[1]}`
  },
};

const mapWebPacUrlToSCCURL = (url) => {
  let redirectURL;
  for (let pathType of Object.values(expressions)) {
      const parsedURL = new URL(url);
      const pathname = parsedURL.pathname
      const match = pathname.match(pathType.expr);
      if (match) {
        console.log('matching: ', pathType);
        redirectURL = pathType.handler(match, parsedURL);
        break
      }
  }
  return redirectURL;
}

module.exports = {
  mapWebPacUrlToSCCURL,
  expressions,
  getQueryFromParams,
  getIndexMapping,
  indexMappings,
};
