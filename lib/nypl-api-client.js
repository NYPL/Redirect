const NyplApiClient = require('@nypl/nypl-data-api-client');
const { decrypt } = require('./kms-helper')

const CACHE = { clients: [] };

async function nyplApiClient(options = { apiName: 'platform' }) {
  let clientId = process.env.CLIENT_ID;
  let clientSecret = process.env.CLIENT_SECRET;

  const { apiName } = options;
  if (CACHE.clients[apiName]) {
    return Promise.resolve(CACHE.clients[apiName]);
  }

  const baseUrl = process.env.PLATFORM_BASE_URL;
  const kmsEnvironment = process.env.KMS_ENV || 'encrypted';

  if (kmsEnvironment === 'encrypted') {
    clientId = await decrypt(clientId)
    clientSecret = await decrypt(clientSecret)
  }

  const nyplApiClient = new NyplApiClient({
    base_url: baseUrl,
    oauth_key: clientId,
    oauth_secret: clientSecret,
    oauth_url: process.env.TOKEN_URL,
  });

  CACHE.clients[apiName] = nyplApiClient;

  return Promise.resolve(nyplApiClient);
}

module.exports = { nyplApiClient };
