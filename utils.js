const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  VEGA_URL,
  VEGA_AUTH_DOMAIN,
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
const homeHandler = (match, query, host) => LEGACY_CATALOG_URL.includes(host) ? BASE_SCC_URL : VEGA_URL + '/'

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
 *  Given a URL, returns true if the URL we should redirect there (i.e. is a
 *  known catalog URL)
 */
function validRedirectUrl (url) {
  if (!url) return false

  const wwwDomain = BASE_SCC_URL.split('/')[0]
  return [wwwDomain, ENCORE_URL, LEGACY_CATALOG_URL, VEGA_URL, VEGA_AUTH_DOMAIN, CAS_SERVER_DOMAIN]
    .map((domain) => `https://${domain}/`)
    .some((baseUrl) => url.indexOf(baseUrl) === 0)
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
