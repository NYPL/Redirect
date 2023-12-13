const expressions = require('./expressions')
const {
  getIndexMapping,
  reconstructQuery,
  reconstructOriginalURL,
  getQueryFromParams,
  homeHandler,
  getRedirectUri
} = require('./utils')
const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  ENCORE_URL,
  VEGA_URL,
  REDIRECT_SERVICE_DOMAIN
} = process.env;

// The main method to build the redirectURL based on the incoming request
// Given a path and a query, finds the first expression declared above which matches
// the path, and returns the corresponding handler with the matchdata and query
// As a default, returns the BASE_SCC_URL
function mapToRedirectURL (path, query, host, proto) {
  const redirectingFromEncore = host === ENCORE_URL
  const redirectingFromLegacyOrVegaToSCC = !redirectingFromEncore && host !== REDIRECT_SERVICE_DOMAIN
  let redirectURL;
  for (let pathType of Object.values(expressions)) {
    let match;
    if (pathType.expr) {
      match = path.match(pathType.expr);
    } else if (pathType.custom) {
      match = pathType.custom(path, query, host, proto)
    }
    if (match) {
      redirectURL = pathType.handler(match, query, host, proto);
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
    body: JSON.stringify({ version })
  };
};

/**
*   Special handler to serve a page that performs a conditionanl client-side redirect:
*    - If JS is enabled, JS redirects the user to `jsRedirect`
*    - If JS is disabled, a META tag redirects the user to `noscriptRedirect`
*/
const jsConditionalRedirect = (jsRedirect, noscriptRedirect) => {
  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': "'*'",
      'Access-Control-Allow-Methods': 'GET'
    },
    body: `<html>
        <head>
          <script type="text/javascript">window.location.replace("${jsRedirect}");</script>
          <meta http-equiv="refresh" content="1;url=${noscriptRedirect}" />
        </head>
      </html>`
  }
}

const handler = async (event, context, callback) => {
  const headers = event.headers || {}
  const proto = headers['X-Forwarded-Proto'] || headers['x-forwarded-proto'] || 'https'
  try {
    const path = event.path;
    if (path === '/check') return callback(null, healthCheck());

    const query = event.multiValueQueryStringParameters || {};

    if (path === '/js-conditional-redirect') {
      const redirectUri = getRedirectUri(query)
      const noscriptRedirectUri = getRedirectUri(query, 'noscript_redirect_uri')
      if (redirectUri && noscriptRedirectUri) {
        return callback(null, jsConditionalRedirect(redirectUri, noscriptRedirectUri));
      }
    }

    const host = headers.host || ENCORE_URL;
    const mappedUrl = mapToRedirectURL(path, query, host, proto);
    const redirectLocation = `${proto}://${mappedUrl}`;

    // Support debug param to display incoming values and result:
    if (query && query['redirect-service-debug']) {
      return callback(null, {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: { query, proto, host, path, event }, redirectLocation })
      })
    }

    const response = {
      isBase64Encoded: false,
      statusCode: 302,
      multiValueHeaders: {
        Location: [redirectLocation]
      }
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
