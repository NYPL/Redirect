const { expect } = require('chai');

require('./test-helper').loadTestEnvironment()

const utils = require('../../utils')

describe('utils', function () {
  describe('validRedirectUrl', () => {
    it('should mark unknown domains/base URLs as not valid', function () {
      expect(utils.validRedirectUrl('https://duckduckgo.com')).to.eq(false)
      expect(utils.validRedirectUrl('https://duckduckgo.com?q=https://catalog.nypl.org')).to.eq(false)
      expect(utils.validRedirectUrl('https://www.nypl.org.us')).to.eq(false)
      // Require a trailing slash:
      expect(utils.validRedirectUrl('https://nypl.na2.iiivega.com')).to.eq(false)
    })

    it('should mark known domains as valid', function () {
      expect(utils.validRedirectUrl('https://www.nypl.org/')).to.eq(true)
      expect(utils.validRedirectUrl('https://legacycatalog.nypl.org/')).to.eq(true)
      expect(utils.validRedirectUrl('https://www.nypl.org/research/research-catalog')).to.eq(true)
      expect(utils.validRedirectUrl('https://nypl.na2.iiivega.com/')).to.eq(true)
    })
  })
})
 
