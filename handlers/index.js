const encoreHandler = require('./encore-handler.js')
const legacyCatalogHandler = require('./legacy-catalog-handler.js')
const redirectServiceHandler = require('./redirect-service-handler.js')

/**
 *  Creates a map associating hostnames to handlers
 * **/
const hostsToHandlers = () => {
  this._hostsToHandlers ||= [
    {
      hosts: process.env.DEPRECATED_ENCORE_HOSTS.split(','),
      handler: encoreHandler
    },
    {
      hosts: process.env.DEPRECATED_WEBPAC_HOSTS.split(','),
      handler: legacyCatalogHandler
    },
    {
      hosts: [process.env.REDIRECT_SERVICE_HOST],
      handler: redirectServiceHandler
    }
  ]
    .reduce((map, { hosts, handler }) => {
      return hosts.reduce((m, host) => Object.assign(m, { [host]: handler }), map)
    }, {})

  return this._hostsToHandlers
}

module.exports = {
  hostsToHandlers,
  redirectServiceHandler
}
