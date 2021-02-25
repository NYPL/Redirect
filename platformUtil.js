let axios = require('axios');
const {
  CLIENT_ID,
  CLIENT_SECRET,
  OAUTH_URL,
  PLATFORM_BASE_URL,
} = process.env;

const oauthConfig = { client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  grant_type: 'client_credentials',
  scope: 'openid' };

const stringifiedOauthConfig =  Object.entries(oauthConfig).map(([k,v]) => `${k}=${v}`).join('&');

async function getToken() {
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
