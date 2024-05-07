const NyplApiClient = require('@nypl/nypl-data-api-client');
const aws = require('aws-sdk');

const kmsEnvironment = process.env.KMS_ENV || 'encrypted';
let decryptKMS;
let kms;

if (kmsEnvironment === 'encrypted') {
  kms = new aws.KMS({
    region: 'us-east-1',
  });

  decryptKMS = (key) => {
    const params = {
      CiphertextBlob: new Buffer(key, 'base64'),
    };

    return new Promise((resolve, reject) => {
      kms.decrypt(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Plaintext.toString());
        }
      });
    });
  };
}

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const keys = [clientId, clientSecret];
const CACHE = { clients: [] };

function nyplApiClient(options = { apiName: 'platform' }) {
  const { apiName } = options;
  if (CACHE.clients[apiName]) {
    return Promise.resolve(CACHE.clients[apiName]);
  }

  const baseUrl = process.env.PLATFORM_BASE_URL;

  if (kmsEnvironment === 'encrypted') {
    return new Promise((resolve, reject) => {
      Promise.all(keys.map(decryptKMS))
        .then(([decryptedClientId, decryptedClientSecret]) => {
          const nyplApiClient = new NyplApiClient({
            base_url: baseUrl,
            oauth_key: decryptedClientId,
            oauth_secret: decryptedClientSecret,
            oauth_url: process.env.TOKEN_URL,
          });

          CACHE.clientId = clientId;
          CACHE.clientSecret = clientSecret;
          CACHE.clients[apiName] = nyplApiClient;

          resolve(nyplApiClient);
        })
        .catch((error) => {
          logger.error('ERROR trying to decrypt using KMS.', error);
          reject('ERROR trying to decrypt using KMS.', error);
        });
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
