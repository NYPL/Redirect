const { expect } = require('chai')
const sinon = require('sinon')
const requests = require('../../lib/requests')
const NyplApiClient = require('@nypl/nypl-data-api-client')
const { bibServiceResponse } = require('./fixtures')
const kmsClient = require("../../lib/kms-helper")

describe('requests', () => {
  describe('queryIsResearch', () => {
    let nyplApiClientGetStub
    before(() => {
      nyplApiClientGetStub = sinon.stub(NyplApiClient.prototype, 'get')
      kmsClientDecryptStub = sinon.stub(kmsClient, 'decrypt')
    })
    after(() => {
      nyplApiClientGetStub.restore()
      kmsClientDecryptStub.restore()
    })
    it('bib, 910$a =RL', async () => {
      nyplApiClientGetStub.resolves(bibServiceResponse({ isResearch: true }))
      const { isResearch } = await requests.queryIsResearch(123, 'id')
      expect(nyplApiClientGetStub.calledWith(`/bibs?nyplSource=sierra-nypl&id=123`))
      expect(isResearch).to.equal(true)
    })
    it('oclc, 910$a =RL', async () => {
      nyplApiClientGetStub.resolves(bibServiceResponse({ isResearch: true }))
      const { isResearch, bibId } = await requests.queryIsResearch(123, 'controlNumber')
      expect(nyplApiClientGetStub.calledWith(`/bibs?nyplSource=sierra-nypl&controlNumber=123`))
      expect(isResearch).to.equal(true)
      expect(bibId).to.equal('abcdefg')
    })
    it('bib, 910$a =BL', async () => {
      nyplApiClientGetStub.resolves(bibServiceResponse({ isResearch: false }))
      const { isResearch } = await requests.queryIsResearch(123, 'id')
      expect(isResearch).to.equal(false)
    })
    it('oclc, 910$a =BL', async () => {
      nyplApiClientGetStub.resolves(bibServiceResponse({ isResearch: false }))
      const {isResearch, bibId} = await requests.queryIsResearch(123, 'controlNumber')
      expect(isResearch).to.equal(false)
      expect(bibId).to.equal('abcdefg')
    })
  })
})