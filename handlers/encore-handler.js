const {
  matchFirstExpression,
  getRedirectUriParam,
  casLogoutUrl
} = require('../lib/utils')
const logger = require('../lib/logger')

const vegaHome = () => {
  return `${process.env.VEGA_HOST}/`
}

const expressions = {
  /**
  * Handle requests for, e.g.:
  *  - //browse.nypl.org/iii/encore
  *  - //browse.nypl.org/iii/encore/bookcart
  *  - //browse.nypl.org/iii/encore/home
  *
  * Redirect to Vega
  */
  encoreHome: {
    // empty path or /bookcart, /home endpoint (from encore)
    expr: /(?:^\/$)|(?:^\/iii\/encore$)|bookcart$|home$/,
    handler: vegaHome
  },

  encoreBibPage: {
    expr: /C__Rb(\d{8})(__|~\$1|$)/,
    handler: (match) => `${process.env.VEGA_HOST}/search/card?recordId=${match[1]}`
  },

  languagesOtherThanEnglish: {
    expr: /C__Sf:\((a|v)(%20| )(\||%7C)(%20| )(u|y)\)(?:.*?)l:\(?([a-z]{3})\)?/,
    handler: (match) => {
      const materialTypes = match[1] + ',' + match[5]
      const languageId = match[6]
      return `${process.env.VEGA_HOST}/search?query=*&searchType=everything&pageSize=10&languageIds=${languageId}&pageNum=0&materialTypeIds=${materialTypes}&sorting=publicationDate&sortOrder=desc`
    }
  },

  authorOrTitleSearch: {
    custom: (request) => {
      const decodedPath = decodeURIComponent(request.path)
      const regEx = /(?:[(]+([^-)]+)[^)]*)/g
      const matches = [...decodedPath.matchAll(regEx)]
      const searchTerms = encodeURIComponent(matches
        .map((match) => `${match[1]}`).join(' '))
      return searchTerms
    },
    handler: (match) => {
      return `${process.env.VEGA_HOST}/search?query=${match}&searchType=everything&pageSize=10`
    }
  },

  encoreSearch: {
    expr: /\/search\/C__S(.*?)(__|[?]|$)/,
    handler: (match) => `${process.env.VEGA_HOST}/search?query=${match[1]}&searchType=everything&pageSize=10`
  },

  encoreAccountPage: {
    expr: /\/myaccount/,
    handler: () => `${process.env.VEGA_HOST}/?openAccount=checkouts`
  },

  /**
   *  Handle requests on //browse.nypl.org/iii/encore/logoutFilterRedirect
   *  Redirect requests to the Vega Auth logout endpoint (which in turn should
   *  redirect the patron through the CAS Logout endpoint)
   */
  encoreLogoutFilterRedirect: {
    expr: /^\/iii\/encore\/logoutFilterRedirect\b/,
    handler: (match, request) => {
      // Get requested (i.e. ultimate) redirect_uri:
      const redirectToAfterLogout = getRedirectUriParam(request.query)

      const casLogout = casLogoutUrl(redirectToAfterLogout)
      // Optionally skip Vega Auth redirect:
      if (process.env.SKIP_VEGA_LOGOUT === 'true') {
        // Send patron straight to CAS logout endpoint, which would normally
        // happen after hitting the Vega Auth logout endpoint.
        return casLogout
      }

      // Set up Vega-logout route (for JS-enabled users):
      const vegaLogoutHandlerRedirect = `https://${process.env.REDIRECT_SERVICE_HOST}/vega-logout-handler?redirect_uri=${encodeURIComponent(redirectToAfterLogout)}`
      const vegaLogoutUri = `https://${process.env.VEGA_HOST}/logout?redirect_uri=${encodeURIComponent(vegaLogoutHandlerRedirect)}`

      // Send user through js-conditional redirect:
      // - JS-enabled users will pass through Vega logout (which includes CAS)
      // - NOSCRIPT users will skip Vega and go straight to CAS logout
      const jsRedirectUri = encodeURIComponent(vegaLogoutUri)
      const noscriptRedirectUri = encodeURIComponent(`https://${casLogout}`)
      return `${process.env.REDIRECT_SERVICE_HOST}/js-conditional-redirect?redirect_uri=${jsRedirectUri}&noscript_redirect_uri=${noscriptRedirectUri}`
    }
  },

  catchAll: {
    expr: /./,
    handler: vegaHome
  }
}

module.exports.redirectUrl = async (request) => {
  logger.debug(`EncoreHandler::redirectUrl: Finding match for ${request.path} among ${Object.keys(expressions).length} expressions`)
  const url = await matchFirstExpression(request, expressions)

  return url
}
