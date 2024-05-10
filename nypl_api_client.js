const NyplApiClient = require('@nypl/nypl-data-api-client');

const CACHE = { clients: [] };

function nyplApiClient(options = { apiName: 'platform' }) {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const keys = [clientId, clientSecret];

  const { apiName } = options;
  if (CACHE.clients[apiName]) {
    return Promise.resolve(CACHE.clients[apiName]);
  }

  const baseUrl = process.env.PLATFORM_BASE_URL;
  const kmsEnvironment = process.env.KMS_ENV || 'encrypted';

  if (kmsEnvironment === 'encrypted') {
    return new Promise((resolve, reject) => {
          const nyplApiClient = new NyplApiClient({
            base_url: baseUrl,
            oauth_key: clientId,
            oauth_secret: clientSecret,
            oauth_url: process.env.TOKEN_URL,
          });

          CACHE.clientId = clientId;
          CACHE.clientSecret = clientSecret;
          CACHE.clients[apiName] = nyplApiClient;

          resolve(nyplApiClient);
    });
  }

  const nyplApiClient = new NyplApiClient({
    base_url: baseUrl,
    oauth_key: clientId,
    oauth_secret: clientSecret,
    oauth_url: process.env.TOKEN_URL,
  });

  CACHE.clientId = clientId;
  CACHE.clientSecret = clientSecret;
  CACHE.clients[apiName] = nyplApiClient;

  return Promise.resolve(nyplApiClient);
}

module.exports = { nyplApiClient };
