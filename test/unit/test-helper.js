const loadTestEnvironment = () => {
  // These values should match production deployment:
  process.env.BASE_SCC_URL = 'www.nypl.org/research/research-catalog'
  process.env.LEGACY_CATALOG_URL = 'legacycatalog.nypl.org'
  process.env.ENCORE_URL = 'browse.nypl.org'
  process.env.VEGA_URL = 'borrow.nypl.org'
  process.env.CAS_SERVER_DOMAIN = 'ilsstaff.nypl.org'
  process.env.REDIRECT_SERVICE_DOMAIN = 'redir-browse.nypl.org'
}

module.exports = {
  loadTestEnvironment
}
