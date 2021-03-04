let axios = require('axios');
const {
  OAUTH_URL,
  PLATFORM_BASE_URL,
  CLIENT_ID,
  CLIENT_SECRET,
} = process.env;


async function getToken() {

  console.log('getting token')

  const oauthConfig = { client_id: global.decryptedClientId,
    client_secret: global.decryptedClientSecret,
    grant_type: 'client_credentials',
    scope: 'openid'
  };

  const stringifiedOauthConfig =  Object.entries(oauthConfig).map(([k,v]) => `${k}=${v}`).join('&');
  console.log('posting to axios for bearer');
  let resp = await axios.post(OAUTH_URL, stringifiedOauthConfig);
  console.log('received bearer')
  return resp.data.access_token;
}

async function checkRecordSource(bnum) {
  console.log('checkRecordSource requesting bearer')
  let bearer = await getToken();
  console.log('checkRecordSource received bearer')
  let headers = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`
    }
  };

  let discoveryApiHasBnum = false;

  try {
    console.log('trying discovery api')
    let resp = await axios.get(
      `${PLATFORM_BASE_URL}/discovery/resources/${bnum}`,
      headers,
    );

    console.log('resp.data.uri', resp.data.uri);
    discoveryApiHasBnum = (resp.data.uri === bnum)
  }
  catch (err) {
    console.log('caught discovery api error')
  }

  if (discoveryApiHasBnum) {
    return 'discovery';
  }
  else {
    try {
      console.log('trying bibservice')
      let bibResp = await axios.get(
        `${PLATFORM_BASE_URL}/bibs/sierra-nypl/${bnum.slice(1)}`,
        headers,
      );

      console.log('received bibservice')
      if (bibResp.status === 200) {
        return 'bib-service'
      }

      return false;
    }
    catch (err) {
      console.log('bib service error')
      return false;
    }
  }

}

module.exports = { checkRecordSource };
