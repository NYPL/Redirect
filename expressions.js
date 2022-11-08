const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  ENCORE_URL,
  VEGA_URL
} = process.env;
const { getQueryFromParams, recodeSearchQuery, reconstructQuery, getIndexMapping } = require('./utils')

module.exports = {
  nothingReg: {
    expr: /^\/$/,
    handler: (match, query, host) => LEGACY_CATALOG_URL.includes(host) ? BASE_SCC_URL : VEGA_URL,
  },
  vega: {
    custom: (path, query, host, proto) => {
      if (!path.match(/\/search\/X/i)) { return null; }
      let searchKey = Object.keys(query).find(key => key.match(/search/i));
      if (!searchKey) { return null; }
      let searchValue = query[searchKey];
      if (!Array.isArray(searchValue) || !searchValue[0] || (typeof searchValue[0] !== 'string')) { return null; }
      return searchValue[0].match(/t:\((.*)\)(?:%20|\s*)and(?:%20|\s*)a:\((.*)\)/i)
    },
    handler: match => `${BASE_SCC_URL}/search?contributor=${match[2]}&title=${match[1]}`
  },
  // Encore => Vega redirects
  encoreBibPage: {
    expr: /C__Rb(\d{8})/,
    handler: (match) => `${VEGA_URL}/search/card?recordId=${match[1]}`
  },
  // WebPac => SCC redirects
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