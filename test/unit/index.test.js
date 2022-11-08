const { expect } = require('chai');
// set env vars before requiring file that uses them
process.env.BASE_SCC_URL = 'https://discovery.nypl.org'
process.env.LEGACY_CATALOG_URL = 'https://catalog.nypl.org'
process.env.ENCORE_URL = 'https://browse.nypl.org/iii/encore'
process.env.VEGA_URL = 'https://nypl.na2.iiivega.com'
const { mapToRedirectURL, handler, reconstructOriginalURL, ENCORE_URL, BASE_SCC_URL, VEGA_URL } = require('../../index.js');
const axios = require('axios');



let host = 'catalog.nypl.org';
const method = 'https';

describe('mapToRedirectURL', function () {
  describe('legacy catalog links', () => {
    it('should map the base URL correctly', function () {
      const path = '/';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(BASE_SCC_URL + '?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2F')
    });

    it('should map bib pages correctly', function () {
      const path = '/record=b12172157~S1'
      axios.post = () => ({ data: { access_token: '' } });
      axios.get = () => ({ data: { uri: 'b12172157' } });
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/bib/b12172157?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Db12172157~S1`)
    })

    it('should map search pages using the format /Xsearchterm', function () {
      const path = '/search~S1/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2FaRubina%252C%2BDina%2Farubina%2Bdina%2F1%252C2%252C84%252CB%2Fexact%26FF%3Darubina%2Bdina%2Bauthor%261%252C-1%252C%2Findexsort%3D-)`)
    });

    it('should allow LANG in/Xsearchterm', function () {
      const path = '/search~S1ENG/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1ENG%2FaRubina%252C%2BDina%2Farubina%2Bdina%2F1%252C2%252C84%252CB%2Fexact%26FF%3Darubina%2Bdina%2Bauthor%261%252C-1%252C%2Findexsort%3D-)`)
    });

    it('should map search pages with index but no search term to the base url', function () {
      const path = '/search/t';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft`);
    });

    it('should map search pages with no index and no search term to the base url', function () {
      const path = '/search';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch`);
    });

    it('should map search pages with no index and no search term, plus screen type to the base url', function () {
      const path = '/search~S98';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S98`);
    });


    it('should map search pages with searcharg and searchtype given as parameters', function () {
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

      const mapped = mapToRedirectURL(path, query, host, method);

      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2F%3Fsearchtype%3Da%26searcharg%3Dwinspeare%2C%20j%26searchscope%3D1%26sortdropdown%3D-%26SORT%3DD%26extended%3D0%26SUBMIT%3DSearch%26searchlimits%26searchorigarg%3Ddmystery`)
    });

    it('should allow LANG as param in searches with searcharg and searchtype given as parameters', function () {
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

      const mapped = mapToRedirectURL(path, query, host, method);

      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1ENG%2F%3Fsearchtype%3Da%26searcharg%3Dwinspeare%2C%20j%26searchscope%3D1%26sortdropdown%3D-%26SORT%3DD%26extended%3D0%26SUBMIT%3DSearch%26searchlimits%26searchorigarg%3Ddmystery`)
    });

    it('should map search pages with SEARCH given as parameter', function () {
      const path = '/search/t'
      const query = {
        SEARCH: ['The+Mothers+'],
        sortdropdown: ['-'],
        searchscope: ['1'],
      };
      const mapped = mapToRedirectURL(path, query, host, method);

      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=The%20Mothers%20&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft%3FSEARCH%3DThe%2BMothers%2B%26sortdropdown%3D-%26searchscope%3D1`)
    });

    it('should map search pages with search query given as query param', function () {
      const path = '/search~S1/a';
      const query = {
        'jac+winspeare%2C': [''],
      };
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=jac%20winspeare%2C&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2Fa%3Fjac%2Bwinspeare%252C`)
    });

    it('should map search pages with search query and search type as query param', function () {
      const path = '/search~S97';
      const query = {
        '/tbrainwash/tbrainwash/1,3,10,B/exact': [''],
        'FF': ['tbrainwash'],
        '1,4,': [''],
      };
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=brainwash&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S97%3F%2Ftbrainwash%2Ftbrainwash%2F1%2C3%2C10%2CB%2Fexact%26FF%3Dtbrainwash%261%2C4%2C`)
    });

    it('should map search pages for oclc records', () => {
      const path = '/search/o1081334684';
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?oclc=1081334684&redirectOnMatch=true`);
    });

    it('should map search pages for oclc records including =', () => {
      const path = '/search/o=75307280';
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?oclc=75307280&redirectOnMatch=true`);
    });

    it('should map search pages for issn numbers', () => {
      const path = '/search/i0012-9976';
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?issn=0012-9976&redirectOnMatch=true`);
    });

    it('should map search pages for short isbn numbers', () => {
      const path = '/search/i1465351078';
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?isbn=1465351078&redirectOnMatch=true`);
    })

    it('should map search pages for long isbn numbers', () => {
      const path = '/search/i9781568987873';
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?isbn=9781568987873&redirectOnMatch=true`);
    });

    it('should map search pages for isbn numbers including X', () => {
      const path = '/search/i178694135X';
      const mapped = mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?isbn=178694135X&redirectOnMatch=true`)
    });

    it('should return 404 page if no match is found', function () {
      const path = '/record=&%!^/';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql('https://discovery.nypl.org/404/redirect?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3D%26%25!%5E%2F');
    });

    it('should return account page for research my account', () => {
      const path = '/patroninfo/1234567';
      const query = {};
      const mapped = mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}/account?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fpatroninfo%2F1234567`);
    });

    it('should redirect to legacy for pinreset pages', () => {
      host = 'qa-catalog.nypl.org';
      const path = '/pinreset~S1'
      const query = {};
      const mappedUrl = mapToRedirectURL(path, query, host, method);
      expect(mappedUrl)
        .to.eql('https://catalog.nypl.org/pinreset~S1');
    });

    it('should redirect to legacy for selfreg pages', () => {
      host = 'qa-catalog.nypl.org';
      const path = '/screens/selfregpick.html'
      const query = {};
      const mappedUrl = mapToRedirectURL(path, query, host, method);
      expect(mappedUrl)
        .to.eql('https://catalog.nypl.org/screens/selfregpick.html');
    })
  })

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
      const mappedUrl = mapToRedirectURL(path, query, host, proto);
      expect(mappedUrl)
        .to.eql('https://discovery.nypl.org/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)')

    });

    it('should handle case variations', () => {
      let path = '/SeArCh/x';
      let query = {
        sEarCh: [
          'T:(The%20dark%20is%20rising)and%20a:(Cooper,%20Susan,%201935-)'
        ]
      };
      let host = 'qa-catalog.nypl.org' ;
      let proto = 'https';
      const mappedUrl = mapToRedirectURL(path, query, host, proto);
      expect(mappedUrl)
        .to.eql('https://discovery.nypl.org/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2FSeArCh%2Fx%3FsEarCh%3DT%3A(The%2520dark%2520is%2520rising)and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)')
    });

    it('should handle spacing variations', () => {
      let path = '/search/X';
      let host = 'qa-catalog.nypl.org';
      let proto = 'https';
      let query1 = {
        SEARCH: [
          't:(The%20dark%20is%20rising) and%20a:(Cooper,%20Susan,%201935-)'
        ]
      };

      let query2 = {
        SEARCH: [
          't:(The%20dark%20is%20rising)and a:(Cooper,%20Susan,%201935-)'
        ]
      }

      let query3 = {
        SEARCH: [
          't:(The%20dark%20is%20rising)anda:(Cooper,%20Susan,%201935-)'
        ]
      }

      let query4 = {
        SEARCH: [
          't:(The%20dark%20is%20rising)%20and%20a:(Cooper,%20Susan,%201935-)'
        ]
      }

      expect(mapToRedirectURL(path, query1, host, proto))
        .to.eql('https://discovery.nypl.org/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)%20and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)')

      expect(mapToRedirectURL(path, query2, host, proto))
        .to.eql('https://discovery.nypl.org/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)and%20a%3A(Cooper%2C%2520Susan%2C%25201935-)')

      expect(mapToRedirectURL(path, query3, host, proto))
        .to.eql('https://discovery.nypl.org/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)anda%3A(Cooper%2C%2520Susan%2C%25201935-)')

      expect(mapToRedirectURL(path, query4, host, proto))
        .to.eql('https://discovery.nypl.org/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)%2520and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)')
    })
  })
  describe('encore links', () => {
    let encoreHost = 'browse.nypl.org'
    it('should map the base URL correctly', function () {
      const path = '/';
      const query = {};
      const mapped = mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.eql(VEGA_URL + '?originalUrl=https%3A%2F%2Fbrowse.nypl.org%2F')
    });

    it('should map bib pages correctly', function () {
      const path = '/record/C__Rb18225028SkindredOrightresultU_X7?lang=eng&suite=def'
      axios.post = () => ({ data: { access_token: '' } });
      axios.get = () => ({ data: { uri: 'b12172157' } });
      const mapped = mapToRedirectURL(path, {}, encoreHost, method);
      expect(mapped)
        .to.eql(`${VEGA_URL}/search/card?recordId=18225028` + '&originalUrl=https%3A%2F%2Fbrowse.nypl.org%2Frecord%2FC__Rb18225028SkindredOrightresultU_X7%3Flang%3Deng%26suite%3Ddef')
    })
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
