const {
  getQueryFromParams,
  recodeSearchQuery,
  getIndexMapping,
} = require('./util.js');

BASE_SCC_URL = 'http://discovery.nypl.org/research/collections/shared-collection-catalog/';

const expressions = [
  // used to match the homepage
  // matches path '/', full url e.g. 'http://catalog.nypl.org/'
  {
    name: 'homepage',
    expr: /^\/$/,
    handler: () => BASE_SCC_URL,
  },
  // matches path /iii/cas/login
  {
    name: 'auth',
    expr: /\/iii\/cas\/login/,
    handler: (match, parsedURL) => parsedURL.href.replace('catalog.nypl.org', 'ilsstaff.nypl.org'),
  },
  // matches search pages that include the search term in the path e.g.
  // /search~S1234/tProgramming+in+Javascript
  {
    name: 'searchWith',
    expr: /\/search(?:~S\d*)?\/([a-zA-Z])([^/]+)/,
    handler: match => `${BASE_SCC_URL}search?q=${recodeSearchQuery(match[2])}${getIndexMapping(match[1])}`
  },
  // matches search pages without search terms in the path,
  // but that may put the search terms in the query e.g.
  // /search~S1234/t?/Programming+in+Javascript
  {
    name: 'searchWithout',
    expr: /\/search(?:~S\d*)?(?:\/([a-zA-Z]))?/,
    handler: (match, parsedURL) => `${BASE_SCC_URL}search?q=${getQueryFromParams(match[0], parsedURL)}${getIndexMapping(match[1])}`
  },
  // matches patron info pages, which we haven't finished implementing yet in SCC
  // e.g. /patroninfo/12345
  {
    name: 'patron',
    expr: /\/patroninfo[^\/]*\/(\d+)/,
    handler: match => `${BASE_SCC_URL}?fakepatron=${match[1]}`
  },
  // matches bib record pages,
  // e.g. /record=b123456789
  {
    name: 'record',
    expr: /\/record=(\w+)/,
    handler: match => `${BASE_SCC_URL}bib/${match[1]}`
  },
];

module.exports = {
  expressions,
  BASE_SCC_URL,
};
