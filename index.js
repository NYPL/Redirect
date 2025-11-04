const {
  getIndexMapping,
  reconstructQuery,
  getQueryFromParams
} = require('./lib/utils')
const logger = require('./lib/logger')

require('dotenv').config({ path: `./config/${process.env.ENVIRONMENT}.env` })

const {
  hostsToHandlers,
  redirectServiceHandler
} = require('./handlers')

const {
  RC_BASE_URL,
  ENCORE_HOST,
  VEGA_HOST,
  REDIRECT_SERVICE_HOST
} = process.env

logger.setLevel(process.env.LOG_LEVEL || 'error')

/**
 *  @typedef {Object} Request
 *  @property {string} proto - Original protocol (http, https)
 *  @property {string} host  - Original request host
 *  @property {string} path  - Original request path
 *  @property {Object} query - Hash of query string params (all multi-value)
 **/

/**
 *  The main method to build the redirectURL based on the incoming request
 *  Finds the first expression that matches the host, path, and query,
 *  returning the resulting redirect URI
 *
 *  @param {Request} request - The request to handle.
 **/
function mapToRedirectURL (request) {
  logger.debug(`Index::mapToRedirectURL: Handling request ${request.host}${request.path}...`)

  const handler = hostsToHandlers()[request.host]

  if (handler) {
    return handler.redirectUrl(request)
  } else {
    logger.warn(`Could not find handler for host: ${request.handler}`)
    return VEGA_HOST
  }
}

/**
 *  Determine `host` for request
 *  In some cases allows host to be overriden by header/query-param
 * **/
const parseHost = (event) => {
  const headers = event.multiValueHeaders || {}
  const query = event.multiValueQueryStringParameters || {}

  let host = headers.Host
    ? headers.Host[0]
    : (headers.host ? headers.host[0] : ENCORE_HOST)

  // Remove port:
  host = host.replace(/:\d+$/, '')

  // Apply override when testing locally:
  if (host === 'localhost') {
    logger.debug(`Original host: ${host}`)
    const overrideHost = headers['X-Request-Host'] || query['override-host'] || REDIRECT_SERVICE_HOST
    host = overrideHost
    if (Array.isArray(overrideHost)) {
      host = overrideHost[0]
    }
    logger.debug(`Overriding host with ${host}`)
  }

  return host
}

/**
 * Main Lambda handler
 **/
const handler = async (event, context, callback) => {
  const headers = event.multiValueHeaders || {}
  const proto = headers['X-Forwarded-Proto']
    ? headers['X-Forwarded-Proto'][0]
    : (headers['x-forwarded-proto'] ? headers['x-forwarded-proto'][0] : 'https')

  try {
    const path = event.path
    const query = event.multiValueQueryStringParameters || {}
    const host = parseHost(event)

    const request = { path, query, host, proto }
    logger.debug('Handling request: ', request)

    // First check to see if the app should respond with a custom response
    // instead of a redirect:
    const customResponse = redirectServiceHandler.customResponse(request)
    if (customResponse) {
      return callback(null, customResponse)
    }

    const mappedUrl = await mapToRedirectURL(request)
    logger.debug('Serving redirect to ' + mappedUrl)

    const redirectLocation = `https://${mappedUrl}`

    // Support debug param to display incoming values and result:
    if (query && query['redirect-service-debug']) {
      return callback(null, {
        statusCode: 200,
        multiValueHeaders: { 'content-type': ['application/json'] },
        body: JSON.stringify({ redirectLocation, input: { query, proto, host, path, event } }, null, 2)
      })
    }

    const response = {
      isBase64Encoded: false,
      statusCode: 302,
      multiValueHeaders: {
        Location: [redirectLocation]
      }
    }
    return callback(null, response)
  } catch (err) {
    logger.error('Error', err)
    const mappedUrl = RC_BASE_URL
    const redirectLocation = `${proto}://${mappedUrl}`
    const response = {
      isBase64Encoded: false,
      statusCode: 302,
      multiValueHeaders: {
        Location: [redirectLocation]
      }
    }
    return callback(null, response)
  }
}

module.exports = {
  mapToRedirectURL,
  getQueryFromParams,
  getIndexMapping,
  handler,
  reconstructQuery
}
