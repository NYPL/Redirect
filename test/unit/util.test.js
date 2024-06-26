const { expect } = require('chai');

require('./test-helper').loadTestEnvironment()

const utils = require('../../utils')

const {
  mapToRedirectURL,
  handler,
  reconstructOriginalURL,
  ENCORE_URL,
  BASE_SCC_URL,
  VEGA_URL,
  LEGACY_CATALOG_URL
} = require('../../index.js');

describe('utils', function () {
  describe('validRedirectUrl', () => {
    it('should mark unknown domains/base URLs as not valid', function () {
      expect(utils.validRedirectUrl('https://duckduckgo.com')).to.eq(false)
      expect(utils.validRedirectUrl('https://duckduckgo.com?q=https://catalog.nypl.org')).to.eq(false)
      expect(utils.validRedirectUrl('https://www.nypl.org.us')).to.eq(false)
      // Require a trailing slash:
      expect(utils.validRedirectUrl(`https://${VEGA_URL}`)).to.eq(false)
      // Require https on nypl.org (allow http: on local.nypl.org only):
      expect(utils.validRedirectUrl('http://www.nypl.org/')).to.eq(false)
    })

    it('should mark known domains as valid', function () {
      expect(utils.validRedirectUrl('https://www.nypl.org/')).to.eq(true)
      expect(utils.validRedirectUrl('https://legacycatalog.nypl.org/')).to.eq(true)
      expect(utils.validRedirectUrl('https://www.nypl.org/research/research-catalog')).to.eq(true)
      expect(utils.validRedirectUrl('https://qa-research-catalog.nypl.org/research/research-catalog')).to.eq(true)
      expect(utils.validRedirectUrl(`https://${VEGA_URL}/`)).to.eq(true)

      // Also local domains over http:
      expect(utils.validRedirectUrl('http://local.nypl.org:8080/')).to.eq(true)
      expect(utils.validRedirectUrl('http://local.nypl.org:3001/')).to.eq(true)
      expect(utils.validRedirectUrl('http://local.nypl.org:1234/')).to.eq(true)
    })
  })

  describe('getRedirectUri', () => {
    ; [
      'https://www.nypl.org/path',
      'https://legacycatalog.nypl.org/foo/bar',
    ]
      .forEach((uri) => {
        it(`should parse redirect_uri=${uri}`, () => {
          expect(utils.getRedirectUri({ redirect_uri: [ uri ] }))
            .to.eq(uri)
        })
    })

    it('supports custom param', () => {
      expect(utils.getRedirectUri({ custom_param: ['https://www.nypl.org/'] }, 'custom_param'))
            .to.eq('https://www.nypl.org/')
    })

    it('decodes encoded redirect_uri value', () => {
      expect(utils.getRedirectUri({ redirect_uri: [encodeURIComponent('https://www.nypl.org/')] }))
            .to.eq('https://www.nypl.org/')
    })
  })
})
 
