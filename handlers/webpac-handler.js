const {
  matchFirstExpression,
  recodeSearchQuery,
  getIndexMapping,
  getQueryFromParams,
  reconstructQuery,
  reconstructOriginalURL
} = require('../lib/utils')
const logger = require('../lib/logger')
const { nyplApiClient } = require('../lib/nypl-api-client.js')

const expressions = {
  /**
  *   Match root:
  */
  nothingReg: {
    // Match root:
    expr: /^\/?$/,
    handler: () => process.env.RC_BASE_URL
  },

  /**
  * Handle requests for:
  *  - //catalog.nypl.org/search..
  */
  rc_from_vega: {
    // handling for legacy author/title search URLs in redirect service
    custom: (request) => {
      const searchKey = Object.keys(request.query).find(key => key.match(/search/i))
      if (!searchKey) { return null }
      const searchValue = request.query[searchKey]
      if (!Array.isArray(searchValue) || !searchValue[0] || (typeof searchValue[0] !== 'string')) { return null }
      return searchValue[0].match(/t:\((.*)\)(?:%20|\s*)and(?:%20|\s*)a:\((.*)\)/i)
    },
    handler: match => `${process.env.RC_BASE_URL}/search?contributor=${match[2]}&title=${match[1]}`
  },

  oclc: {
    expr: /\/search\/o=?(\d+)/,
    handler: async (match) => {
      // check if bib is research or circulating
      const oclcNum = match[1]
      const client = await nyplApiClient({ apiName: 'discovery' })
      const resp = await client.get(`/bibs?nyplSource=sierra-nypl&controlNumber=${oclcNum}`)
      const id = resp && resp.data && resp.data[0] && resp.data[0].id
      const varFields = resp && resp.data && resp.data[0] && resp.data[0].varFields
      const field910a = varFields && varFields.find(field =>
        field.marcTag === '910' &&
        field.subfields.some(subfield => subfield.tag === 'a')
      )
      const isResearch = field910a && field910a.subfields.some(subfield => subfield.tag === 'a' && subfield.content === 'RL')

      if (isResearch) {
        return `${process.env.RC_BASE_URL}/search?oclc=${oclcNum}&redirectOnMatch=true`
      } else {
        return `${process.env.VEGA_HOST}/search/card?recordId=${id}`
      }
    }
  },

  issn: {
    expr: /\/search\/i(\d{4}-\d{4})/,
    handler: match => `${process.env.RC_BASE_URL}/search?issn=${match[1]}&redirectOnMatch=true`
  },

  isbn: {
    expr: /\/search\/i(\w+)/,
    handler: match => `${process.env.RC_BASE_URL}/search?isbn=${match[1]}&redirectOnMatch=true`
  },

  /**
   * Match legacy subject searches
   *  - /search~S1/d?{term} => /browse?q=${term}&search_scope=starts_with
   */

  subjectBrowseReg: {
    expr: /\/search(~S\w*)?\/d/,
    handler: (match, request) => {
      const searchKey = Object.keys(request.query)[0] ||'';
      const searchTerm = decodeURIComponent(searchKey.replace(/\+/g, ' '));
      if (!searchTerm) return process.env.RC_BASE_URL;
      return `${process.env.RC_BASE_URL}/browse?q=${searchTerm}&search_scope=starts_with`;
    },
  },



  /**
  * Match:
  *  - /search/i{query} => ?q={query}&search_scope=standard_number
  *  - /search~S1/i{query} => ?q={query&search_scope=standard_number
  *
  * where "i" can be a, t, s, i, or c to trigger a specific search_scope
  *
  * E.g.:
  *  - /search/i{query} => ?q={query}&search_scope=standard_number
  *  - /search~S1/t{query} => ?q={query&search_scope=title
  *  - /search/s{query} => ?q={query}&search_scope=journal_title
  */
  searchRegWith: {
    expr: /\/search(~S\w*)?\/([a-zA-Z])(([^/])+)/,
    handler: match => `${process.env.RC_BASE_URL}/search?q=${recodeSearchQuery(match[3])}${getIndexMapping(match[2])}`
  },

  /**
  * Match:
  *  - /search~S1/{query}
  *  - /search/{query}
  */
  searchRegWithout: {
    // search~S1/?searchtype=a&searcharg=winspeare%2C
    expr: /\/search(~S\w*)?(\/([a-zA-Z]))?/,
    handler: (match, request) => {
      const mappedQuery = getQueryFromParams(match[0], request.query)
      if (!mappedQuery) return process.env.RC_BASE_URL
      return `${process.env.RC_BASE_URL}/search?q=${mappedQuery}${getIndexMapping(match[3])}`
    }
  },

  patroninfoReg: {
    expr: /^\/patroninfo/,
    handler: match => `${process.env.RC_BASE_URL}/account`
  },

  recordReg: {
    expr: /\/record=(b\d{8})/,
    handler: (match, request) => {
      const { collection } = request.query
      const bnum = match[1]
      if (Array.isArray(collection) && collection.includes('circ')) {
        return `${process.env.VEGA_HOST}/search/card?recordId=${bnum.replace(/\D/g, '')}`
      }
      return `${process.env.RC_BASE_URL}/bib/${bnum}`
    }
  },

  legacyReg: {
    expr: /pinreset|selfreg/,
    handler: (match, request) => {
      return `${process.env.WEBPAC_HOST}${match.input}${reconstructQuery(request.query)}`
    }
  },

  catchAll: {
    expr: /./,
    handler: () => process.env.RC_BASE_URL + '/404/redirect'
  }
}

module.exports.redirectUrl = async (request) => {
  logger.debug(`LegacyCatalogHandler::redirectUrl: Finding match for ${request.path} among ${Object.keys(expressions).length} expressions`)
  let url = await matchFirstExpression(request, expressions)

  // If navigating to RC, include originalUrl param:
  // Historicaqlly, we added this param any time we're linking anywhere when
  // the original URL was not Encore or redirect-service (i.e. any time request.host
  // was catalog.nypl).
  if (
    url && (
      url.includes('www.nypl.org/research/research-catalog') ||
      url.includes('borrow.nypl.org')
    )
  ) {
    url += (url.includes('?') ? '&' : '?') + 'originalUrl=' + reconstructOriginalURL(request)
  }
  return url
}