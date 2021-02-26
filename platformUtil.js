let axios = require('axios');
const {
  OAUTH_URL,
  PLATFORM_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
} = process.env;


async function getToken() {

  global.log('getting token')

  const { decrypt } = require('./kms_util.js');

  global.log('decrypting')
  const decryptedClientId = await decrypt(CLIENT_ID);
  const decryptedClientSecret = await decrypt(CLIENT_SECRET);
  global.log('successfully decrypted');

  const oauthConfig = { client_id: decryptedClientId,
    client_secret: decryptedClientSecret,
    grant_type: 'client_credentials',
    scope: 'openid'
  };

  const stringifiedOauthConfig =  Object.entries(oauthConfig).map(([k,v]) => `${k}=${v}`).join('&');
  global.log('posting to axios for bearer');
  let resp = await axios.post(OAUTH_URL, stringifiedOauthConfig);
  global.log('received bearer')
  return resp.data.access_token;
}

async function checkRecordSource(bnum) {
  global.log('checkRecordSource requesting bearer')
  let bearer = await getToken();
  global.log('checkRecordSource received bearer')
  let headers = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`
    }
  };

  let discoveryApiHasBnum = false;

  try {
    global.log('trying discovery api')
    let resp = await axios.get(
      `${PLATFORM_BASE_URL}/discovery/resources/${bnum}`,
      headers,
    );

    global.log('resp.data.uri', resp.data.uri);
    discoveryApiHasBnum = (resp.data.uri === bnum)
  }
  catch (err) {
    global.log('caught discovery api error')
  }

  if (discoveryApiHasBnum) {
    return 'discovery';
  }
  else {
    try {
      global.log('trying bibservice')
      let bibResp = await axios.get(
        `${PLATFORM_BASE_URL}/bibs/sierra-nypl/${bnum.slice(1)}`,
        headers,
      );

      global.log('received bibservice')
      if (bibResp.status === 200) {
        return 'bib-service'
      }

      return false;
    }
    catch (err) {
      global.log('bib service error')
      return false;
    }
  }

}

module.exports = { checkRecordSource };
