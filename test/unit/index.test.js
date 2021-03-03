const { expect } = require('chai');
const env = require('./test.js');
const { mapWebPacUrlToSCCURL, handler, BASE_SCC_URL } = require('../../index.js');
const axios = require('axios');

describe('mapWebPacUrlToSCCURL', async function() {
  it('should map the base URL correctly', async function() {
    const path = '/';
    const query = {};
    const mapped = await mapWebPacUrlToSCCURL(path, query);
    expect(mapped)
      .to.eql(BASE_SCC_URL)
  });

  it('should map bib pages correctly', async function() {
    const path = '/record=b12172157~S1'
    axios.post = () => ({ data: { access_token: '' } });
    axios.get = () => ({ data: { uri: 'b12172157' } });
    const mapped = await mapWebPacUrlToSCCURL(path, {});
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/bib/b12172157`)
  })

  it('should map search pages using the format /Xsearchterm', async function() {
    const path = '/search~S1/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
    const query = {};
    const mapped = await(mapWebPacUrlToSCCURL(path, query));
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor`)
  });

  it('should map search pages with index but no search term', async function() {
    const path = '/search/t';
    const query = {};
    const mapped = await(mapWebPacUrlToSCCURL(path, query));
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=&search_scope=title`)
  });

  it('should map search pages with searcharg and searchtype given as parameters', async function() {
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

    const mapped = await mapWebPacUrlToSCCURL(path, query);

    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor`)
  });

  it('should map search pages with SEARCH given as parameter', async function() {
    const path = '/search/t'
    const query = {
      SEARCH: ['The+Mothers+'],
      sortdropdown: ['-'],
      searchscope: ['1'],
    };
    const mapped = await mapWebPacUrlToSCCURL(path, query);

    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=The%20Mothers%20&search_scope=title`)
  });

  it('should map search pages with search query given as query param', async function() {
    const path = '/search~S1/a';
    const query = {
      'jac+winspeare%2C': [''],
    };
    const mapped = await mapWebPacUrlToSCCURL(path, query);
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=jac%20winspeare%2C&search_scope=contributor`)
  });

  it('should map search pages with search query and search type as query param', async function() {
    const path = '/search~S97';
    const query = {
      '/tbrainwash/tbrainwash/1,3,10,B/exact': [''],
      'FF': ['tbrainwash'],
      '1,4,': [''],
    };
    const mapped = await(mapWebPacUrlToSCCURL(path, query));
    expect(mapped)
      .to.eql(`${BASE_SCC_URL}/search?q=brainwash&search_scope=title`)
  });

  it('should return base url if no match is found', async function() {
    const path = 'record=&%!^/';
    const query = {};
    const mapped = await mapWebPacUrlToSCCURL(path, query);
    expect(mapped)
      .to.eql('https://discovery.nypl.org');
  });
});

// describe('handler', () => {
//   const context = {};
//   const callback = (_, resp) => resp.statusCode;
//
//   it('should call the callback with 301 response for matching url', async function () {
//     const event = {
//       queryStringParameters: {
//         origin: 'https://catalog.nypl.org'
//       }
//     }
//
//     const resp = await handler(event, context, callback);
//     expect(resp).to.eql(301);
//   });
//
//   it('should call the callback with 404 response for non-matching url', async function () {
//     const event = {
//         queryStringParameters: {
//           origin: 'https://catalog/record=&%!^/'
//         }
//     }
//
//     const resp = await handler(event, context, callback);
//     expect(resp).to.eql(404);
//   });
// })
