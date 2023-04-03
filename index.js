const expressions = require('./expressions')
const { getIndexMapping, reconstructQuery, reconstructOriginalURL, getQueryFromParams, homeHandler } = require('./utils')
const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  ENCORE_URL,
  VEGA_URL
} = process.env;

// The main method to build the redirectURL based on the incoming request
// Given a path and a query, finds the first expression declared above which matches
// the path, and returns the corresponding handler with the matchdata and query
// As a default, returns the BASE_SCC_URL
function mapToRedirectURL (path, query, host, proto) {
  const redirectingFromEncore = host === ENCORE_URL
  const redirectingFromLegacyOrVegaToSCC = !redirectingFromEncore
  let redirectURL;
  for (let pathType of Object.values(expressions)) {
    let match;
    if (pathType.expr) {
      match = path.match(pathType.expr);
    } else if (pathType.custom) {
      match = pathType.custom(path, query, host, proto)
    }
    if (match) {
      redirectURL = pathType.handler(match, query, host);
      break
    }
  }
  // instead of a 404, we are just sending them to the landing page
  if (redirectingFromEncore && !redirectURL) {
    redirectURL = VEGA_URL + '/'
  }
  if (redirectingFromLegacyOrVegaToSCC) {
    if (!redirectURL) redirectURL = `${BASE_SCC_URL}/404/redirect`;
    // if a redirect transformation was made, add original url to the redirect url
    if (!redirectURL.includes(LEGACY_CATALOG_URL)) {
      redirectURL = redirectURL + (redirectURL.includes('?') ? '&' : '?') + 'originalUrl=' + reconstructOriginalURL(path, query, host, proto);
    }
  }
  return redirectURL
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
  const headers = event.multiValueHeaders || {}
  const proto = Array.isArray(headers['x-forwarded-proto'])
    ? headers['x-forwarded-proto'][0]
    : 'https';
  try {
    const path = event.path;
    if (path === '/check') return callback(null, healthCheck());

    const query = event.multiValueQueryStringParameters || {};
    const host = Array.isArray(headers.host) ? headers.host[0] : ENCORE_URL;
    const mappedUrl = mapToRedirectURL(path, query, host, proto);
    const redirectLocation = `${proto}://${mappedUrl}`;

    // Support debug param to display incoming values and result:
    if (query && query['redirect-service-debug']) {
      return callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { query, proto, host, path, event }, redirectLocation })
      })
    }

    const response = {
      isBase64Encoded: false,
      statusCode: 302,
      multiValueHeaders: {
        Location: [redirectLocation],
      },
    };
    return callback(null, response);
  }
  catch (err) {
    console.log('err: ', err.message);
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
  mapToRedirectURL,
  expressions,
  getQueryFromParams,
  getIndexMapping,
  handler,
  reconstructOriginalURL,
  reconstructQuery,
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  VEGA_URL,
  ENCORE_URL
};
