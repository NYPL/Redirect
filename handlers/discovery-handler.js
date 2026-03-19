const { reconstructQuery } = require('../lib/utils')
const logger = require('../lib/logger')

module.exports.redirectUrl = async (request) => {
  logger.debug(`DiscoveryHandler::redirectUrl: Handling ${request.path}`)

  const requestPath = request.path + reconstructQuery(request.query)

  const referer = request.headers.Referer
  logger.warn(`DiscoveryHandler::Handling ${requestPath} (Referer: ${referer || '[None]'})`)

  return `${process.env.WWW_HOST}${requestPath}`
}
