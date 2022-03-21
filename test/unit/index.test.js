const { expect } = require('chai');
const env = require('./test.js');
const { mapWebPacUrlToSCCURL, handler, reconstructOriginalURL, BASE_SCC_URL, LEGACY_CATALOG_URL } = require('../../index.js');
const axios = require('axios');

let host = 'catalog.nypl.org';
const method = 'https';

describe('mapWebPacUrlToSCCURL', function() {
  it('should map the base URL correctly', function() {
    const path = '/';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql(BASE_SCC_URL + '?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2F')
  });

  it('should map bib pages correctly', function() {
    const path = '/record=b12172157~S1'
    axios.post = () => ({ data: { access_token: '' } });
    axios.get = () => ({ data: { uri: 'b12172157' } });
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/bib/b12172157?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Db12172157~S1`)
  })

  it('should map search pages using the format /Xsearchterm', function() {
    const path = '/search~S1/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2FaRubina%252C%2BDina%2Farubina%2Bdina%2F1%252C2%252C84%252CB%2Fexact%26FF%3Darubina%2Bdina%2Bauthor%261%252C-1%252C%2Findexsort%3D-)`)
  });

  it('should allow LANG in/Xsearchterm', function() {
    const path = '/search~S1ENG/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1ENG%2FaRubina%252C%2BDina%2Farubina%2Bdina%2F1%252C2%252C84%252CB%2Fexact%26FF%3Darubina%2Bdina%2Bauthor%261%252C-1%252C%2Findexsort%3D-)`)
  });

  it('should map search pages with index but no search term to the base url', function() {
    const path = '/search/t';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft`);
  });

  it('should map search pages with no index and no search term to the base url', function() {
    const path = '/search';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch`);
  });

  it('should map search pages with no index and no search term, plus screen type to the base url', function() {
    const path = '/search~S98';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S98`);
  });


  it('should map search pages with searcharg and searchtype given as parameters', function() {
    const path = '/search~S1/';
    const query = {
      searchtype: ['a'],
      searcharg: ['winspeare, j'],
      searchscope: ['1'],
      sortdropdown: ['-'],
      SORT: ['D'],
      extended: ['0'],
      SUBMIT: ['Search'],
      searchlimits: [''],
      searchorigarg: ['dmystery'],
    };

    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);

    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2F%3Fsearchtype%3Da%26searcharg%3Dwinspeare%2C%20j%26searchscope%3D1%26sortdropdown%3D-%26SORT%3DD%26extended%3D0%26SUBMIT%3DSearch%26searchlimits%26searchorigarg%3Ddmystery`)
  });

  it('should allow LANG as param in searches with searcharg and searchtype given as parameters', function() {
    const path = '/search~S1ENG/';
    const query = {
      searchtype: ['a'],
      searcharg: ['winspeare, j'],
      searchscope: ['1'],
      sortdropdown: ['-'],
      SORT: ['D'],
      extended: ['0'],
      SUBMIT: ['Search'],
      searchlimits: [''],
      searchorigarg: ['dmystery'],
    };

    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);

    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1ENG%2F%3Fsearchtype%3Da%26searcharg%3Dwinspeare%2C%20j%26searchscope%3D1%26sortdropdown%3D-%26SORT%3DD%26extended%3D0%26SUBMIT%3DSearch%26searchlimits%26searchorigarg%3Ddmystery`)
  });

  it('should map search pages with SEARCH given as parameter', function() {
    const path = '/search/t'
    const query = {
      SEARCH: ['The+Mothers+'],
      sortdropdown: ['-'],
      searchscope: ['1'],
    };
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);

    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=The%20Mothers%20&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft%3FSEARCH%3DThe%2BMothers%2B%26sortdropdown%3D-%26searchscope%3D1`)
  });

  it('should map search pages with search query given as query param', function() {
    const path = '/search~S1/a';
    const query = {
      'jac+winspeare%2C': [''],
    };
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=jac%20winspeare%2C&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2Fa%3Fjac%2Bwinspeare%252C`)
  });

  it('should map search pages with search query and search type as query param', function() {
    const path = '/search~S97';
    const query = {
      '/tbrainwash/tbrainwash/1,3,10,B/exact': [''],
      'FF': ['tbrainwash'],
      '1,4,': [''],
    };
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=brainwash&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S97%3F%2Ftbrainwash%2Ftbrainwash%2F1%2C3%2C10%2CB%2Fexact%26FF%3Dtbrainwash%261%2C4%2C`)
  });

  it('should map search pages for oclc records', () => {
    const path = '/search/o1081334684';
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.include(`${BASE_SCC_URL}/search?oclc=1081334684&redirectOnMatch=true`);
  });

  it('should map search pages for oclc records including =', () => {
    const path = '/search/o=75307280';
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.include(`${BASE_SCC_URL}/search?oclc=75307280&redirectOnMatch=true`);
  });

  it('should map search pages for issn numbers', () => {
    const path = '/search/i0012-9976';
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.include(`${BASE_SCC_URL}/search?issn=0012-9976&redirectOnMatch=true`);
  });

  it('should map search pages for short isbn numbers', () => {
    const path = '/search/i1465351078';
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.include(`${BASE_SCC_URL}/search?isbn=1465351078&redirectOnMatch=true`);
  })

  it('should map search pages for long isbn numbers', () => {
    const path = '/search/i9781568987873';
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.include(`${BASE_SCC_URL}/search?isbn=9781568987873&redirectOnMatch=true`);
  });

  it('should map search pages for isbn numbers including X', () => {
    const path = '/search/i178694135X';
    const mapped = mapWebPacUrlToSCCURL(path, {}, host, method);
    expect(mapped)
      .to.include(`${BASE_SCC_URL}/search?isbn=178694135X&redirectOnMatch=true`)
  });

  it('should return 404 page if no match is found', function() {
    const path = '/record=&%!^/';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql('https://discovery.nypl.org/404/redirect?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3D%26%25!%5E%2F');
  });

  it('should return account page for research my account', () => {
    const path = '/patroninfo/1234567';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped).to.eql(`${BASE_SCC_URL}/account?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fpatroninfo%2F1234567`);
  });

  it('should redirect to legacy for pinreset pages', () => {
    host = 'qa-catalog.nypl.org';
    const path = '/pinreset~S1'
    const query = {};
    const mappedUrl = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mappedUrl)
      .to.eql('https://catalog.nypl.org/pinreset~S1');
  });

  it('should redirect to legacy for selfreg pages', () => {
    host = 'qa-catalog.nypl.org';
    const path = '/screens/selfregpick.html'
    const query = {};
    const mappedUrl = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mappedUrl)
      .to.eql('https://catalog.nypl.org/screens/selfregpick.html');
  })


  // {
  //   requestContext: {
  //     elb: {
  //       targetGroupArn: 'arn:aws:elasticloadbalancing:us-east-1:946183545209:targetgroup/qa-al-ALBTa-A94OW4WLVA9U/ba415806accd24b9'
  //     }
  //   },
  //   httpMethod: 'GET',
  //   path: '/search/X',
  //   multiValueQueryStringParameters: {
  //     SEARCH: [
  //       't:(The%20dark%20is%20rising)and%20a:(Cooper,%20Susan,%201935-)'
  //     ]
  //   },
  //   multiValueHeaders: {
  //     accept: [
  //       'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
  //     ],
  //     'accept-encoding': [ 'gzip' ],
  //     'accept-language': [ 'en-US,en;q=0.9' ],
  //     connection: [ 'keep-alive' ],
  //     cookie: [
  //       '_ga=GA1.2.77587791.1624993479; SESSION_LANGUAGE=eng; III_EXPT_FILE=aa30115; III_ENCORE_PATRON=nypl.org; optimizelyEndUserId=oeu1625071663619r0.6695455276112785; __utmc=50329657; __utma=50329657.77587791.1624993479.1633032036.1634069652.12; __utmz=50329657.1634069652.12.7.utmcsr=ilsstaff.nypl.org|utmccn=(referral)|utmcmd=referral|utmcct=/; _omra=%7B%22xrjq1iuto8tbvmw54ixe%22%3A%22view%22%2C%22h9ngxfwg6bomgaisagqs%22%3A%22view%22%2C%22nzzvvmsqgf0cuce0thbh%22%3A%22view%22%2C%22lhvhhdhneivisubr7t0g%22%3A%22view%22%7D; III_SESSION_ID=7aee2338c7acd4c3db0fdabf633db084; ADRUM=s=1644865482240&r=https%3A%2F%2Fnypl-encore-test.nypl.org%2Fiii%2Fencore%2F%3F-968485644'
  //     ],
  //     host: [ 'qa-catalog.nypl.org' ],
  //     'incap-client-ip': [ '96.250.7.181' ],
  //     'incap-proxy-1458': [ 'OK' ],
  //     'sec-ch-ua': [
  //       '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"'
  //     ],
  //     'sec-ch-ua-mobile': [ '?0' ],
  //     'sec-ch-ua-platform': [ '"macOS"' ],
  //     'sec-fetch-dest': [ 'document' ],
  //     'sec-fetch-mode': [ 'navigate' ],
  //     'sec-fetch-site': [ 'none' ],
  //     'sec-fetch-user': [ '?1' ],
  //     'upgrade-insecure-requests': [ '1' ],
  //     'user-agent': [
  //       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
  //     ],
  //     'x-amzn-trace-id': [ 'Root=1-6238de15-54399bd13d9a825d752f9996' ],
  //     'x-forwarded-for': [ '96.250.7.181', '96.250.7.181, 198.143.38.32' ],
  //     'x-forwarded-port': [ '443' ],
  //     'x-forwarded-proto': [ 'https' ]
  //   },
  //   body: '',
  //   isBase64Encoded: false
  // }
  describe('vega links', () => {
    it('should handle vega link', () => {
      let path = '/search/X';
      let query = {
        SEARCH: [
          't:(The%20dark%20is%20rising)and%20a:(Cooper,%20Susan,%201935-)'
        ]
      };
      let host = 'qa-catalog.nypl.org' ;
      let proto = 'https';
      let original = reconstructOriginalURL(path, query, host, proto);
      console.log(path, query, host, proto, original)
      const mappedUrl = mapWebPacUrlToSCCURL(path, query, host, proto, original);
      expect(mappedUrl)
        .to.eql('https://catalog.nypl.org/screens/selfregpick.html')

    })
    it('should handle case variations')
    it('should handle spacing variations')
  })

});

describe('handler', () => {
  const context = {};
  const callback = (_, resp) => resp.statusCode;

  it('should respond 200 to /check', async function () {
    const event ={
      path: '/check',
    }

    const version = require('../../package.json').version;

    const resp = await handler(event, context, (_, resp) => resp);
    expect(resp.statusCode).to.eql(200);
    expect(resp.body.version).to.eql(version);
  });

  it('should call the callback with 302 response for matching url', async function () {
    const event = {
      path: '/',
      multiValueHeaders: {
        'x-forwarded-proto': ['https']
      }
    }

    const resp = await handler(event, context, callback);
    expect(resp).to.eql(302);
  });

  it('should call the callback with 302 response for non-matching url', async function () {
    // the record id here is just nonsense. It shouldn't match anything.
    const event = {
        path: '/record=&%!^/',
        multiValueHeaders: {
          'x-forwarded-proto': ['https']
        }
    }

    const resp = await handler(event, context, callback);
    expect(resp).to.eql(302);
  });
})
