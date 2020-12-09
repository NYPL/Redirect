// declare some regular expressions and how to handle them
const { expressions, BASE_SCC_URL } = require('./expressions.js');

// the main mapping method

const mapWebPacUrlToSCCURL = (url) => {
  let redirectURL;
  const parsedURL = new URL(url);
  const pathname = decodeURIComponent(parsedURL.pathname)
  for (let pathType of expressions) {
      const match = pathname.match(pathType.expr);
      if (match) {
        redirectURL = pathType.handler(match, parsedURL);
        break
      }
  }
  return redirectURL;
}

const handler = async (event, context, callback) => {
  const redirectLocation = mapWebPacUrlToSCCURL(event.queryStringParameters.origin);
  const response = redirectLocation ?
    {
      statusCode: 301,
      headers: {
        Location: redirectLocation,
      }
    }
    : {
      statusCode: 404
    };
  return callback(null, response);
};

module.exports = {
  mapWebPacUrlToSCCURL,
  handler,
  BASE_SCC_URL,
};
