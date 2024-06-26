const { readFileSync } = require('fs')

const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  VEGA_URL,
  ENCORE_URL,
  CAS_SERVER_DOMAIN
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
const homeHandler = (match, query, host) => {
  // If host is catalog.nypl.org (or qa-catalog.nypl.org), redirect to RC (else Vega)
  const isCatalogDotNyplDomain = host.includes('catalog.nypl.org')
  return isCatalogDotNyplDomain ? BASE_SCC_URL : VEGA_URL + '/'
}

const getIndexMapping = index => indexMappings[index] || '';

function reconstructQuery (query) {
  const reconstructedQuery = Object.entries(query).map(([key, values]) => {
    return values.map(value => value.length ? `${key}=${value}` : key).join('&')
  })
    .join('&');
  return reconstructedQuery.length ? `?${reconstructedQuery}` : ''
}

function reconstructOriginalURL (path, query, host, proto) {
  return encodeURIComponent(`${proto}://${host}${path}${reconstructQuery(query)}`);
}

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
const recodeSearchQuery = query => query.split(/\+|\s/).join("%20");

/**
 *  Given a URL, returns true if we should redirect there (i.e. it's a domain
 *  that we control or a local testing domain)
 */
function validRedirectUrl (url) {
  if (!url) return false

  // It's valid if it matches https://*.nypl.org or http://local.nypl.org:PORT:
  return /^(https:\/\/[\w-]+\.nypl.org\/|http:\/\/local.nypl.org:\d+\/)/.test(url)
}

/**
 *  Given a query hash, extracts and validates the request_uri, returning the
 *  request_uri or a sensible default if it's invalid/missing.
 *
 *  @param query {object} - Hash representing multi-value query params
 *  @param param {string} - Param name to use. Default redirect_uri
 */
function getRedirectUri (query, param = 'redirect_uri') {
  let redirectUri = Array.isArray(query[param]) ? query[param][0] : null
  if (redirectUri) redirectUri = redirectUri.replace(/(www\.)?discovery\.nypl\.org/, 'www.nypl.org')
  // Query string values arrive decoded through sam; They are not decoded when
  // arriving via ELB integration (i.e. deployed). So attempt to detect:
  if (redirectUri && /^https?%3A/.test(redirectUri)) redirectUri = decodeURIComponent(redirectUri)
  return validRedirectUrl(redirectUri)
    ? redirectUri
    : `https://${VEGA_URL}/`
}


module.exports = {
  getIndexMapping,
  reconstructQuery,
  reconstructOriginalURL,
  getQueryFromParams,
  recodeSearchQuery,
  homeHandler,
  validRedirectUrl,
  getRedirectUri
}
