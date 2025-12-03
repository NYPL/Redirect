const logger = require('../lib/logger')
const {
  matchFirstExpression,
  getRedirectUriParam,
  casLogoutUrl
} = require('../lib/utils.js')

/**
 *  Special custom HTML response that simply returns the app version.
 *  (For debugging DNS and verifying deployments.)
 */
const healthCheck = () => {
  const version = require('../package.json').version
  return {
    isBase64Encoded: false,
    multiValueHeaders: {
      'Content-Type': ['application/json']
    },
    statusCode: 200,
    body: JSON.stringify({ version })
  }
}

/**
*   Special handler to serve a page that performs a conditionanl client-side redirect:
*    - If JS is enabled, JS redirects the user to `jsRedirect`
*    - If JS is disabled, a META tag redirects the user to `noscriptRedirect`
*
*   Note that the js detection necessarily happens client-side, so the page is
*   built with both the js and noscript redirect URIs.
*/
const jsConditionalRedirect = (request) => {
  const jsRedirectUri = getRedirectUriParam(request.query)
  const noscriptRedirectUri = getRedirectUriParam(request.query, 'noscript_redirect_uri')
  if (jsRedirectUri && noscriptRedirectUri) {
    return {
      statusCode: 200,
      isBase64Encoded: false,
      multiValueHeaders: {
        'Content-Type': ['text/html']
      },
      // Serve custom HTML that:
      //  - If JS is enabled, immediately redirects to jsRedirectUri
      //  - If JS is not enabled, redirects to noscriptRedirectUri after 1s
      body: `<html>
          <head>
            <script type="text/javascript">window.location.replace("${jsRedirectUri}");</script>
            <meta http-equiv="refresh" content="1;url=${noscriptRedirectUri}" />
          </head>
        </html>`
    }
  }
}

const expressions = {
  /**
   *  Handler for post-Vega logout. Doubly assures the patron is logged out of
   *  CAS after logging out of Vega.
   */
  vegaLogoutHandler: {
    expr: /^\/vega-logout-handler\b/,
    handler: (match, request) => {
      const redirectToAfterLogout = getRedirectUriParam(request.query)
      return casLogoutUrl(redirectToAfterLogout)
    }
  },

  /**
   *  When handling any other path on a redirect-service host, just send patron
   *  to Vega.
   * **/
  catchAll: {
    expr: /./,
    handler: () => {
      return process.env.VEGA_HOST + '/'
    }
  }
}

/**
 *  This handler, in addition to serving redirects for certain requests,
 *  defines a number of "custom responses", which are full status 200 html
 *  responses.
 * **/
module.exports.customResponse = (request) => {
  switch (request.path) {
    // Serve special health-check endpoint (for verifying DNS and
    // RedirectService app version):
    case '/check':
      return healthCheck()
    // Special custom JS-conditional-redirect response, for performing JS-
    // dependent redirects
    case '/js-conditional-redirect':
      return jsConditionalRedirect(request)
  }
}

module.exports.redirectUrl = (request) => {
  logger.debug(`RedirectserviceHandler::redirectUrl: Finding match for ${request.path} among ${Object.keys(expressions).length} expressions`)

  return matchFirstExpression(request, expressions)
}
