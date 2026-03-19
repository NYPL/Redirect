const encoreHandler = require('./encore-handler')
const logger = require('../lib/logger')
const webpacHandler = require('./webpac-handler')
const redirectServiceHandler = require('./redirect-service-handler')
const discoveryHandler = require('./discovery-handler')

/**
 *  Be noisy (in the logs) about any hosts mapped to multiple handlers:
 * **/
const checkForDupes = (map, hosts) => {
  const existingHosts = Object.keys(map)
  if (hosts.some((host) => existingHosts.includes(host))) {
    const offendingHost = hosts.find((host) => existingHosts.includes(host))
    logger.error(`Duplicate host mapping: ${offendingHost}`)
  }
}

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
      handler: webpacHandler
    },
    {
      hosts: [process.env.REDIRECT_SERVICE_HOST],
      handler: redirectServiceHandler
    },
    {
      hosts: [process.env.DEPRECATED_DISCOVERY_HOST],
      handler: discoveryHandler
    }
  ]
    .reduce((map, { hosts, handler }) => {
      checkForDupes(map, hosts)

      return hosts.reduce((m, host) => Object.assign(m, { [host]: handler }), map)
    }, {})

  return this._hostsToHandlers
}

module.exports = {
  hostsToHandlers,
  redirectServiceHandler
}
