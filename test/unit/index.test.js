const { expect } = require('chai');
const env = require('./test.js');
const { mapWebPacUrlToSCCURL, handler, BASE_SCC_URL, LEGACY_CATALOG_URL, CLASSIC_CATALOG_URL } = require('../../index.js');
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

  it('should map search pages with index but no search term', function() {
    const path = '/search/t';
    const query = {};
    const mapped = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft`)
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
    host = CLASSIC_CATALOG_URL;
    const path = '/pinreset~S1'
    const query = {};
    const mappedUrl = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mappedUrl)
      .to.eql('https://catalog.nypl.org/pinreset~S1');
  });

  it('should redirect to legacy for selfreg pages', () => {
    host = CLASSIC_CATALOG_URL;
    const path = '/screens/selfregpick.html'
    const query = {};
    const mappedUrl = mapWebPacUrlToSCCURL(path, query, host, method);
    expect(mappedUrl)
      .to.eql('https://catalog.nypl.org/screens/selfregpick.html');
  })
});

describe('handler', () => {
  const context = {};
  const callback = (_, resp) => resp.statusCode;

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
