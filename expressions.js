const {
  BASE_SCC_URL,
  LEGACY_CATALOG_URL,
  ENCORE_URL,
  VEGA_URL,
  VEGA_AUTH_DOMAIN,
  CAS_SERVER_DOMAIN,
  REDIRECT_SERVICE_DOMAIN
} = process.env;

const {
  getQueryFromParams, recodeSearchQuery, reconstructQuery, getIndexMapping,
  homeHandler, getRedirectUri
} = require('./utils')

module.exports = {
  nothingReg: {
    // empty path or /bookcart, /home endpoint (from encore)
    expr: /(?:^\/$)|(?:^\/iii\/encore$)|bookcart$|home$/,
    handler: homeHandler
  },
  rc_from_vega: {
    // handling for legacy author/title search URLs in redirect service
    custom: (path, query, host, proto) => {
      if (host === VEGA_URL)
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
    expr: /C__Rb(\d{8})(__|~\$1|$)/,
    handler: (match) => `${VEGA_URL}/search/card?recordId=${match[1]}`
  },
  languagesOtherThanEnglish: {
    expr: /C__Sf:\((a|v)%20(\||%7C)%20(u|y)\)(?:.*?)l:\(?([a-z]{3})\)?/,
    handler: (match) => {
      const materialTypes = match[1] + ',' + match[3]
      const languageId = match[4]
      return `${VEGA_URL}/search?query=*&searchType=everything&pageSize=10&languageIds=${languageId}&pageNum=0&materialTypeIds=${materialTypes}&sorting=publicationDate&sortOrder=desc`
    }
  },
  authorOrTitleSearch: {
    custom: (path) => {
      const decodedPath = decodeURIComponent(path)
      const regEx = /(?:[(]+([^-)]+)[^)]*)/g
      const matches = [...decodedPath.matchAll(regEx)]
      const searchTerms = encodeURIComponent(matches
        .map((match) => `${match[1]}`).join(' '))
      return searchTerms
    },
    handler: (match) => {
      return `${VEGA_URL}/search?query=${match}&searchType=everything&pageSize=10`
    }
  },
  encoreSearch: {
    expr: /\/search\/C__S(.*?)(__|[?]|$)/,
    handler: (match) => `${VEGA_URL}/search?query=${match[1]}&searchType=everything&pageSize=10`
  },
  encoreAccountPage: {
    expr: /\/myaccount/,
    handler: () => `${VEGA_URL}/?openAccount=checkouts`
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
    expr: /\/record=(b\d{8})/,
    handler: (match, query) => {
      const { collection } = query;
      console.log("query", query);
      const bnum = match[1];
      if (Array.isArray(collection) && collection.includes("circ")) {
        return `${VEGA_URL}/search/card?recordId=${bnum.replace(/\D/g, '')}`;
      }
      return `${BASE_SCC_URL}/bib/${bnum}`;
    }
  },
  legacyReg: {
    expr: /pinreset|selfreg/,
    handler: (match, query) => {
      return `${LEGACY_CATALOG_URL}${match.input}${reconstructQuery(query)}`
    }
  },
  /**
   *  Handle requests on //browse.nypl.org/iii/encore/logoutFilterRedirect
   *  Redirect requests to the Vega Auth logout endpoint (which in turn should
   *  redirect the patron through the CAS Logout endpoint)
   */
  encoreLogoutFilterRedirect: {
    expr: /^\/iii\/encore\/logoutFilterRedirect\b/,
    handler: (match, query) => {
      const redirectToAfterLogout = getRedirectUri(query)
      const vegaLogoutHandlerRedirect = `https://${REDIRECT_SERVICE_DOMAIN}/vega-logout-handler?redirect_uri=${encodeURIComponent(redirectToAfterLogout)}`
      return `${VEGA_AUTH_DOMAIN}/auth/realms/nypl/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(vegaLogoutHandlerRedirect)}`
    }
  },
  /**
   *  Handler for post-Vega logout. Doubly assures the patron is logged out of
   *  CAS after logging out of Vega.
   */
  vegaLogoutHandler: {
    expr: /^\/vega-logout-handler\b/,
    handler: (match, query) => {
      const redirectToAfterLogout = getRedirectUri(query)
      return `${CAS_SERVER_DOMAIN}/iii/cas/logout?service=${encodeURIComponent(redirectToAfterLogout)}`
    }
  }
};
