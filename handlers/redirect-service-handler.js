const logger = require('../lib/logger')
const {
  matchFirstExpression,
  getRedirectUriParam,
  casLogoutUrl
} = require('../lib/utils.js')

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
*/
const jsConditionalRedirect = (request) => {
  const jsRedirect = getRedirectUriParam(request.query)
  const noscriptRedirect = getRedirectUriParam(request.query, 'noscript_redirect_uri')
  if (jsRedirect && noscriptRedirect) {
    return {
      statusCode: 200,
      isBase64Encoded: false,
      multiValueHeaders: {
        'Content-Type': ['text/html']
      },
      body: `<html>
          <head>
            <script type="text/javascript">window.location.replace("${jsRedirect}");</script>
            <meta http-equiv="refresh" content="1;url=${noscriptRedirect}" />
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

  catchAll: {
    expr: /./,
    handler: () => {
      return process.env.VEGA_HOST + '/'
    }
  }
}

module.exports.customResponse = (request) => {
  switch (request.path) {
    case '/check':
      return healthCheck()
    case '/js-conditional-redirect':
      return jsConditionalRedirect(request)
  }
}

module.exports.redirectUrl = (request) => {
  logger.debug(`RedirectserviceHandler::redirectUrl: Finding match for ${request.path} among ${Object.keys(expressions).length} expressions`)

  return matchFirstExpression(request, expressions)
}
