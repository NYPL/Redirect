let axios = require('axios');
const {
  OAUTH_URL,
  PLATFORM_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
} = process.env;


async function getToken() {

  const { decrypt } = require('./kms_util.js');

  const decryptedClientId = await decrypt(CLIENT_ID);
  const decryptedClientSecret = await decrypt(CLIENT_SECRET);

  const oauthConfig = { client_id: decryptedClientId,
    client_secret: decryptedClientSecret,
    grant_type: 'client_credentials',
    scope: 'openid'
  };

  const stringifiedOauthConfig =  Object.entries(oauthConfig).map(([k,v]) => `${k}=${v}`).join('&');
  let resp = await axios.post(OAUTH_URL, stringifiedOauthConfig);
  return resp.data.access_token;
}

async function checkRecordSource(bnum) {
  let bearer = await getToken();
  let headers = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`
    }
  };

  let discoveryApiHasBnum = false;

  try {
    let resp = await axios.get(
      `${PLATFORM_BASE_URL}/discovery/resources/${bnum}`,
      headers,
    );

    console.log('resp.data.uri', resp.data.uri);
    discoveryApiHasBnum = (resp.data.uri === bnum)
  }
  catch (err) {

  }

  if (discoveryApiHasBnum) {
    return 'discovery';
  }
  else {
    try {
      let bibResp = await axios.get(
        `${PLATFORM_BASE_URL}/bibs/sierra-nypl/${bnum.slice(1)}`,
        headers,
      );

      if (bibResp.status === 200) {
        return 'bib-service'
      }

      return false;
    }
    catch (err) {
      return false;
    }
  }

}

module.exports = { checkRecordSource };
