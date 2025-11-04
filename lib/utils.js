const logger = require('./logger')

/**
 * Given a request object and a expressions[], returns the result of evaluating
 * the first matching expression.
 * **/
const matchFirstExpression = async (request, expressions) => {
  for (const [name, pathType] of Object.entries(expressions)) {
    let match
    if (pathType.expr) {
      match = request.path.match(pathType.expr)
    } else if (pathType.custom) {
      match = pathType.custom(request)
    }
    if (match) {
      logger.debug(`Utils::matchFirstExpression: Found match: ${name}`)
      return pathType.handler(match, request)
    } else {
      logger.debug(`Utils::matchFirstExpression: (${request.path} Did not match: ${name})`)
    }
  }
}

const indexMappings = {
  // X: '',
  // Y: '',
  a: '&search_scope=contributor',
  t: '&search_scope=title',
  s: '&search_scope=journal_title',
  // h: '', // there is no genre search
  // d: '', // this is the subject search, might want to do something different
  i: '&search_scope=standard_number', // what to do with these?
  c: '&search_scope=callnumber'
}
const homeHandler = (match, query, host) => {
  // If host is catalog.nypl.org (or qa-catalog.nypl.org), redirect to RC (else Vega)
  const isCatalogDotNyplDomain = host.includes('catalog.nypl.org')
  return isCatalogDotNyplDomain ? process.env.RC_BASE_URL : process.env.VEGA_HOST + '/'
}

const getIndexMapping = index => indexMappings[index] || ''

function reconstructQuery (query) {
  const reconstructedQuery = Object.entries(query).map(([key, values]) => {
    return values.map(value => value.length ? `${key}=${value}` : key).join('&')
  })
    .join('&')
  return reconstructedQuery.length ? `?${reconstructedQuery}` : ''
}

function reconstructOriginalURL (request) {
  return encodeURIComponent(
    `https://${request.host}` +
    `${request.path}${reconstructQuery(request.query)}`)
}

/**
 *  Get RC query for Webpac params..
 *
 *  TODO: Place in legacy-catalog-handler
 */
const getQueryFromParams = (url, query) => {
  const getParam = param => (query[param] || [])[0]
  const searchArg = getParam('searcharg')
  const searchArgAlt = getParam('SEARCH')
  let searchIndex
  let searchArgFromQueryParam
  for (const key in query) {
    const value = getParam(key)
    if (!value) {
      const splitted = key.split('/')
      if (splitted[1]) {
        searchIndex = splitted[1][0]
        searchArgFromQueryParam = splitted[1].slice(1)
        break
      } else if (splitted[0]) {
        searchArgFromQueryParam = splitted[0]
        break
      }
    }
  }
  const q = searchArg || searchArgAlt || searchArgFromQueryParam || ''
  if (!q.length) return null
  const searchType = getParam('searchtype') || searchIndex
  return recodeSearchQuery(q + (searchType ? getIndexMapping(searchType) : ''))
}
const recodeSearchQuery = query => query.split(/\+|\s/).join('%20')

/**
 *  Given a URL, returns true if we should redirect there (i.e. it's a domain
 *  that we control or a local testing domain)
 */
function validRedirectUrl (url) {
  if (!url) return false

  // It's valid if it matches https://*.nypl.org or http://local.nypl.org:PORT:
  const valid = /^(https:\/\/[\w-]+\.nypl.org\/|http:\/\/local.nypl.org:\d+\/)/.test(url)
  logger.debug(`Determined redirect_uri ${valid ? 'is valid' : 'is not valid'}`)
  return valid
}

/**
 *  Given a query hash, extracts and validates the request_uri, returning the
 *  request_uri or a sensible default if it's invalid/missing.
 *
 *  @param query {object} - Hash representing multi-value query params
 *  @param param {string} - Param name to use. Default redirect_uri
 */
function getRedirectUriParam (query, param = 'redirect_uri') {
  let redirectUri = Array.isArray(query[param]) ? query[param][0] : null
  if (redirectUri) redirectUri = redirectUri.replace(/(www\.)?discovery\.nypl\.org/, 'www.nypl.org')
  // Query string values arrive decoded through sam; They are not decoded when
  // arriving via ELB integration (i.e. deployed). So attempt to detect:
  if (redirectUri && /^https?%3A/.test(redirectUri)) redirectUri = decodeURIComponent(redirectUri)
  return validRedirectUrl(redirectUri)
    ? redirectUri
    : `https://${process.env.VEGA_HOST}/`
}

const casLogoutUrl = (redirectUri) => {
  return `${process.env.CAS_HOST}/iii/cas/logout?service=${encodeURIComponent(redirectUri)}`
}

module.exports = {
  casLogoutUrl,
  getIndexMapping,
  reconstructQuery,
  reconstructOriginalURL,
  getQueryFromParams,
  matchFirstExpression,
  recodeSearchQuery,
  homeHandler,
  validRedirectUrl,
  getRedirectUriParam
}
