const dotenv = require('dotenv')
const logger = require('../../lib/logger')

before(() => {
  // Load production config:
  dotenv.config({ path: './config/production.env' })
  logger.debug('Loaded production config')
})
