const axios = require('axios');
const { expect } = require('chai');
const sinon = require('sinon')
const NyplApiClient = require('@nypl/nypl-data-api-client');
const { KMSClient } = require('@aws-sdk/client-kms')

require('./test-helper').loadTestEnvironment()

const {
  mapToRedirectURL,
  handler,
  reconstructOriginalURL,
  ENCORE_URL,
  BASE_SCC_URL,
  VEGA_URL,
  LEGACY_CATALOG_URL
} = require('../../index.js');

const method = 'https';

describe('mapToRedirectURL', function () {
  describe('legacy catalog links', () => {
    let host = 'catalog.nypl.org'

    it('should map the base URL correctly', async function () {
      const path = '/';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(BASE_SCC_URL + '?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2F')
    });

    it('should map bib pages correctly', async function () {
      const path = '/record=b12172157~S1'
      axios.post = () => ({ data: { access_token: '' } });
      axios.get = () => ({ data: { uri: 'b12172157' } });
      const mapped = await mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/bib/b12172157?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Db12172157~S1`)
    })

    it('should map search pages using the format /Xsearchterm', async function () {
      const path = '/search~S1/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2FaRubina%252C%2BDina%2Farubina%2Bdina%2F1%252C2%252C84%252CB%2Fexact%26FF%3Darubina%2Bdina%2Bauthor%261%252C-1%252C%2Findexsort%3D-)`)
    });

    it('should allow LANG in/Xsearchterm', async function () {
      const path = '/search~S1ENG/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=Rubina%2C%20Dina&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1ENG%2FaRubina%252C%2BDina%2Farubina%2Bdina%2F1%252C2%252C84%252CB%2Fexact%26FF%3Darubina%2Bdina%2Bauthor%261%252C-1%252C%2Findexsort%3D-)`)
    });

    it('should map search pages with index but no search term to the base url', async function () {
      const path = '/search/t';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft`);
    });

    it('should map search pages with no index and no search term to the base url', async function () {
      const path = '/search';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch`);
    });

    it('should map search pages with no index and no search term, plus screen type to the base url', async function () {
      const path = '/search~S98';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S98`);
    });

    it('should map search pages with searcharg and searchtype given as parameters', async function () {
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

      const mapped = await mapToRedirectURL(path, query, host, method);

      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2F%3Fsearchtype%3Da%26searcharg%3Dwinspeare%2C%20j%26searchscope%3D1%26sortdropdown%3D-%26SORT%3DD%26extended%3D0%26SUBMIT%3DSearch%26searchlimits%26searchorigarg%3Ddmystery`)
    });

    it('should allow LANG as param in searches with searcharg and searchtype given as parameters', async function () {
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

      const mapped = await mapToRedirectURL(path, query, host, method);

      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=winspeare,%20j&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1ENG%2F%3Fsearchtype%3Da%26searcharg%3Dwinspeare%2C%20j%26searchscope%3D1%26sortdropdown%3D-%26SORT%3DD%26extended%3D0%26SUBMIT%3DSearch%26searchlimits%26searchorigarg%3Ddmystery`)
    });

    it('should map search pages with SEARCH given as parameter', async function () {
      const path = '/search/t'
      const query = {
        SEARCH: ['The+Mothers+'],
        sortdropdown: ['-'],
        searchscope: ['1'],
      };
      const mapped = await mapToRedirectURL(path, query, host, method);

      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=The%20Mothers%20&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch%2Ft%3FSEARCH%3DThe%2BMothers%2B%26sortdropdown%3D-%26searchscope%3D1`)
    });

    it('should map search pages with search query given as query param', async function () {
      const path = '/search~S1/a';
      const query = {
        'jac+winspeare%2C': [''],
      };
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=jac%20winspeare%2C&search_scope=contributor&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S1%2Fa%3Fjac%2Bwinspeare%252C`)
    });

    it('should map search pages with search query and search type as query param', async function () {
      const path = '/search~S97';
      const query = {
        '/tbrainwash/tbrainwash/1,3,10,B/exact': [''],
        'FF': ['tbrainwash'],
        '1,4,': [''],
      };
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/search?q=brainwash&search_scope=title&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fsearch~S97%3F%2Ftbrainwash%2Ftbrainwash%2F1%2C3%2C10%2CB%2Fexact%26FF%3Dtbrainwash%261%2C4%2C`)
    });

    describe('mapping oclc records in the research catalog', async () => {
      before(() => {
        sinon.stub(NyplApiClient.prototype, 'get').callsFake(() => {
          return {
            data: [
              {
                id: 'abcdefg',
                varFields: [
                  {
                    marcTag: '910',
                    subfields: [
                      {
                        tag: 'a',
                        content: 'RL'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        })

        sinon.stub(KMSClient.prototype, 'send').callsFake(() => {
          return {
            Plaintext: new ArrayBuffer(8)
          }
        })
      })

      after(() => {
        NyplApiClient.prototype.get.restore()
        KMSClient.prototype.send.restore()
      })

      it('should map search pages for oclc records', async () => {
        const path = '/search/o1081334684';
        const mapped = await mapToRedirectURL(path, {}, host, method);
        expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?oclc=1081334684&redirectOnMatch=true`);
      });
    })

    describe('mapping oclc records in the circulating catalog', async () => {
      before(() => {
        sinon.stub(NyplApiClient.prototype, 'get').callsFake(() => {
          return {
            data: [
              {
                id: 'abcdefg',
                varFields: [
                  {
                    marcTag: '910',
                    subfields: [
                      {
                        tag: 'a',
                        content: 'BL'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        })

        sinon.stub(KMSClient.prototype, 'send').callsFake(() => {
          return {
            Plaintext: new ArrayBuffer(8)
          }
        })
      })

      after(() => {
        NyplApiClient.prototype.get.restore()
        KMSClient.prototype.send.restore()
      })

      it('should map search pages for oclc records', async () => {
        const path = '/search/o1081334684';
        const mapped = await mapToRedirectURL(path, {}, host, method);
        expect(mapped)
        .to.include(`${VEGA_URL}/search/card?recordId=abcdefg`);
      });
    })

    describe('oclc including = ', async () => {
      before(() => {
        sinon.stub(NyplApiClient.prototype, 'get').callsFake(() => {
          return {
            data: [
              {
                id: 'abcdefg',
                varFields: [
                  {
                    marcTag: '910',
                    subfields: [
                      {
                        tag: 'a',
                        content: 'RL'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        })
      })

      after(() => {
        NyplApiClient.prototype.get.restore()
      })

      it('should map search pages for oclc records including =', async () => {
        const path = '/search/o=75307280';
        const mapped = await mapToRedirectURL(path, {}, host, method);
        expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?oclc=75307280&redirectOnMatch=true`);
      });
    })


    it('should map search pages for issn numbers', async () => {
      const path = '/search/i0012-9976';
      const mapped = await mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?issn=0012-9976&redirectOnMatch=true`);
    });

    it('should map search pages for short isbn numbers', async () => {
      const path = '/search/i1465351078';
      const mapped = await mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?isbn=1465351078&redirectOnMatch=true`);
    })

    it('should map search pages for long isbn numbers', async () => {
      const path = '/search/i9781568987873';
      const mapped = await mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?isbn=9781568987873&redirectOnMatch=true`);
    });

    it('should map search pages for isbn numbers including X', async () => {
      const path = '/search/i178694135X';
      const mapped = await mapToRedirectURL(path, {}, host, method);
      expect(mapped)
        .to.include(`${BASE_SCC_URL}/search?isbn=178694135X&redirectOnMatch=true`)
    });

    it('should return 404 page if no match is found', async function () {
      const path = '/record=fishsticks';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped)
        .to.eql(`${BASE_SCC_URL}/404/redirect?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Dfishsticks`);
    });

    it('should return account page for research my account', async () => {
      const path = '/patroninfo/1234567';
      const query = {};
      const mapped = await mapToRedirectURL(path, query, host, method);
      expect(mapped).to.eql(`${BASE_SCC_URL}/account?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Fpatroninfo%2F1234567`);
    });

    it('should redirect to legacy for pinreset pages', async () => {
      host = 'qa-catalog.nypl.org';
      const path = '/pinreset~S1'
      const query = {};
      const mappedUrl = await mapToRedirectURL(path, query, host, method);
      expect(mappedUrl)
        .to.eql('legacycatalog.nypl.org/pinreset~S1');
    });

    it('should redirect to legacy for selfreg pages', async () => {
      host = 'qa-catalog.nypl.org';
      const path = '/screens/selfregpick.html'
      const query = {};
      const mappedUrl = await mapToRedirectURL(path, query, host, method);
      expect(mappedUrl)
        .to.eql('legacycatalog.nypl.org/screens/selfregpick.html');
    })
  })

  describe('vega links', () => {
    it('should handle vega link', async () => {
      let path = '/search/X';
      let query = {
        SEARCH: [
          't:(The%20dark%20is%20rising)and%20a:(Cooper,%20Susan,%201935-)'
        ]
      };
      let host = 'qa-catalog.nypl.org';
      let proto = 'https';
      const mappedUrl = await mapToRedirectURL(path, query, host, proto);
      expect(mappedUrl)
        .to.eql(`${BASE_SCC_URL}/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)`)

    });

    it('should handle case variations', async () => {
      let path = '/SeArCh/x';
      let query = {
        sEarCh: [
          'T:(The%20dark%20is%20rising)and%20a:(Cooper,%20Susan,%201935-)'
        ]
      };
      let host = 'qa-catalog.nypl.org';
      let proto = 'https';
      const mappedUrl = await mapToRedirectURL(path, query, host, proto);
      expect(mappedUrl)
        .to.eql(`${BASE_SCC_URL}/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2FSeArCh%2Fx%3FsEarCh%3DT%3A(The%2520dark%2520is%2520rising)and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)`)
    });

    it('should handle spacing variations', async () => {
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

      expect(await mapToRedirectURL(path, query1, host, proto))
        .to.eql(`${BASE_SCC_URL}/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)%20and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)`)

      expect(await mapToRedirectURL(path, query2, host, proto))
        .to.eql(`${BASE_SCC_URL}/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)and%20a%3A(Cooper%2C%2520Susan%2C%25201935-)`)

      expect(await mapToRedirectURL(path, query3, host, proto))
        .to.eql(`${BASE_SCC_URL}/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)anda%3A(Cooper%2C%2520Susan%2C%25201935-)`)

      expect(await mapToRedirectURL(path, query4, host, proto))
        .to.eql('www.nypl.org/research/research-catalog/search?contributor=Cooper,%20Susan,%201935-&title=The%20dark%20is%20rising&originalUrl=https%3A%2F%2Fqa-catalog.nypl.org%2Fsearch%2FX%3FSEARCH%3Dt%3A(The%2520dark%2520is%2520rising)%2520and%2520a%3A(Cooper%2C%2520Susan%2C%25201935-)')
    })
  })
  describe('encore links', () => {
    const query = {}
    let homepage = VEGA_URL + '/'
    let encoreHost = process.env.ENCORE_URL
    it('should map the base URL correctly', async function () {
      const path = '/iii/encore';
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.eql(homepage)
    });

    it('should map bib pages correctly', async function () {
      const paths = ['/record/C__Rb18225028__Skindred__Orightresult__U__X7?lang=eng&suite=def',
        '/record/C__Rb18225028',
        '/record/C__Rb18225028~$1']
      paths.forEach(async (path) => {
        const mapped = await mapToRedirectURL(path, query, encoreHost, method);
        expect(mapped)
          .to.eql(`${VEGA_URL}/search/card?recordId=18225028`)
      })
    })
    it('should skip something close to a bib page', async () => {
      const path = '/record/C__Rb18225028kindred__Orightresult__U__X7?lang=eng&suite=def'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.eql(homepage)
    })
    it('should redirect keyword search properly', async () => {
      const path = '/search/C__SAncient%20Greece__Orightresult__U?lang=eng&suite=def'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.equal(`${VEGA_URL}/search?query=Ancient%20Greece&searchType=everything&pageSize=10`)
    })
    it('should redirect keyword search properly without a double undercore', async () => {
      const path = '/search/C__SAncient%20Greece?lang=eng&suite=def'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.equal(`${VEGA_URL}/search?query=Ancient%20Greece&searchType=everything&pageSize=10`)
    })
    it('should redirect keyword search properly without a double undercore nor query string', async () => {
      const path = '/search/C__SAncient%20Greece'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.equal(`${VEGA_URL}/search?query=Ancient%20Greece&searchType=everything&pageSize=10`)
    })
    it('should not include anything but the keyword search', async () => {
      const path = '/search/C__Schopped%20cheese__Ff%3Afacetmediatype%3Az%3Az%3AE-BOOK%3A%3A__Oauthor__U__X0?lang=eng&suite=def'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.include(`${VEGA_URL}/search?query=chopped%20cheese&searchType=everything&pageSize=10`)
    })
    it('/bookcart redirects to /', async () => {
      const path = '/bookcart'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.eql(homepage)
    })
    it('/home redirects to /', async () => {
      const path = '/home'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.eql(homepage)
    })
    it('should redirect account page', async () => {
      const path = '/myaccount'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method);
      expect(mapped)
        .to.eql(VEGA_URL + '/?openAccount=checkouts')
    })
    it('languages other than english links', async () => {
      const pathsAndResultsMap = {
        // a/u, no parens around language code
        '/search/C__Sf:(a%20|%20u)%20c:(96)%20l:hat__O-date__U__X0?lang=eng&suite=def': '/search?query=*&searchType=everything&pageSize=10&languageIds=hat&pageNum=0&materialTypeIds=a,u&sorting=publicationDate&sortOrder=desc',
        // v/y, parens around language code
        '/search/C__Sf:(v%20|%20y)%20c:(96)%20l:(spa)s__Orightresult__U?lang=eng&suite=def': '/search?query=*&searchType=everything&pageSize=10&languageIds=spa&pageNum=0&materialTypeIds=v,y&sorting=publicationDate&sortOrder=desc',

      }
      const paths = Object.keys(pathsAndResultsMap)
      paths.forEach(async (path, i) => {
        const mapped = await mapToRedirectURL(path, query, encoreHost, method);
        expect(mapped).to.eql(VEGA_URL + pathsAndResultsMap[path])
      })
    })

    it('handles pipe queries whether URI encoded or not', async () => {
      [
        // First, a language scoped Encore query with a '|'
        '/iii/encore/search/C__Sf:(a%20|%20u)%20c:(96)%20l:ita__O-date__U__X0?lang=eng&suite=def',
        // Next, a language scoped Encore query where the '|' is URI encoded
        // (such as Chrome likes to do):
        '/iii/encore/search/C__Sf:(a%20%7C%20u)%20c:(96)%20l:ita__O-date__U__X0?lang=eng&suite=def'
      ].forEach(async (path) => {
        const mapped = await mapToRedirectURL(path, query, encoreHost, 'GET')
        // Both forms should resolve to this language scoped Vega search:
        expect(mapped).to.eql(VEGA_URL + '/search?query=*&searchType=everything&pageSize=10&languageIds=ita&pageNum=0&materialTypeIds=a,u&sorting=publicationDate&sortOrder=desc')
      })
    })

    it('ampersand in url', async () => {
      const path = '/search/C__St:(Yotsuba&!)%20a:(Kiyohiko%20Azuma)__Orightresult__U?lang=eng&suite=def&ivts=zutuA%2FQzFQ7zF9VYDrWRJQ%3D%3D&casts=R56ZSWFQjofaBF62y8o1mQ%3D%3D'
      const mapped = await mapToRedirectURL(path, query, encoreHost, method)
      expect(mapped).to.eql(VEGA_URL + '/search?query=Yotsuba%26!%20Kiyohiko%20Azuma&searchType=everything&pageSize=10')
    })
    it('author and title searches', async () => {
      const pathsAndResultsMap = {
        '/search/C__S%28Didion%2C%20Joan.%29%20t%3A%28%28play%20it%20as%20it%20lays%29%20-1960s%29__Orightresult__U?lang=eng&suite=def': '/search?query=Didion%2C%20Joan.%20play%20it%20as%20it%20lays&searchType=everything&pageSize=10',
        '/search/C__S%28Didion%2C%20Joan.%29%20t%3A%28democracy%20-1980s%20-%28golden%20age%29%29__Orightresult__U?lang=eng&suite=def': '/search?query=Didion%2C%20Joan.%20democracy%20&searchType=everything&pageSize=10',
        '/search/C__St%3A%28love%20is%20loud%3A%20how%20diane%20nash%29%20a%3A%28wallace%29__Orightresult__U?lang=eng&suite=def': '/search?query=love%20is%20loud%3A%20how%20diane%20nash%20wallace&searchType=everything&pageSize=10',
        '/search/C__St%3A%28%28slouching%20towards%20bethlehem%29%20-collected%20-river%29%20a%3A%28didion%29__Orightresult__U?lang=eng&suite=def': '/search?query=slouching%20towards%20bethlehem%20didion&searchType=everything&pageSize=10',
        '/search/C__Sa%3A%28Didion%2C%20Joan%29%20t%3A%28%28where%20i%20was%20from%29%20-collected%29__Orightresult__U?lang=eng&suite=def': '/search?query=Didion%2C%20Joan%20where%20i%20was%20from&searchType=everything&pageSize=10',
        '/search/C__St%3A%28killers%20of%20a%20certain%20age%29__Orightresult__U?lang=eng&suite=def':
          '/search?query=killers%20of%20a%20certain%20age&searchType=everything&pageSize=10'
      }
      Object.keys(pathsAndResultsMap).forEach(async (path) => {
        const mapped = await mapToRedirectURL(path, query, encoreHost, method)
        expect(mapped).to.equal(VEGA_URL + pathsAndResultsMap[path])
      })
    })
  })
});

describe('handler', () => {
  const context = {};
  const callback = (_, resp) => resp.statusCode;

  it('should respond 200 to /check', async function () {
    const event = {
      path: '/check',
    }

    const version = require('../../package.json').version;

    const resp = await handler(event, context, (_, resp) => resp);
    expect(resp.statusCode).to.eql(200);
    expect(JSON.parse(resp.body).version).to.eql(version);
  });

  it('should call the callback with 302 response for matching url', async function () {
    const event = {
      path: '/',
      headers: {
        'x-forwarded-proto': 'https',
        host: 'catalog.nypl.org'
      }
    }

    const resp = await handler(event, context, callback);
    expect(resp).to.eql(302);
  });

  it('should call the callback with 302 response for non-matching url', async function () {
    // The following path will not match any known pattern, so we expect it to
    // fall through to a 404 page:
    const event = {
      path: '/record=bsomeid/',
      multiValueHeaders: {
        'x-forwarded-proto': ['https'],
        host: ['catalog.nypl.org']
      }
    }

    const resp = await handler(event, context, (_, resp) => resp);
    expect(resp).to.deep.include({
      statusCode: 302,
      multiValueHeaders: { Location: [ 'https://www.nypl.org/research/research-catalog/404/redirect?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Dbsomeid%2F' ] }
    })
  });

  describe('collection query param redirect', () => {
    it('should redirect to vega with converted bib id when "circ" set as collection query param', async function () {
      const event = {
        path: '/record=b22297361',
        multiValueHeaders: {
          'x-forwarded-proto': ['https'],
          host: ['catalog.nypl.org']
        },
        multiValueQueryStringParameters: {
          "collection": ["circ"]
        }
      }
      const resp = await handler(event, context, (_, resp) => resp);
      expect(resp).to.deep.include({
        statusCode: 302,
        multiValueHeaders: { Location: [ `https://${VEGA_URL}/search/card?recordId=22297361&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Db22297361%3Fcollection%3Dcirc` ] }
      })
    })

    it('should redirect to vega when "circ" is included in multiple collection query params', async function () {
      const event = {
        path: '/record=b22297361',
        multiValueHeaders: {
          'x-forwarded-proto': ['https'],
          host: ['catalog.nypl.org']
        },
        multiValueQueryStringParameters: {
          "collection": ["circ", "research"]
        }
      }
      const resp = await handler(event, context, (_, resp) => resp);
      expect(resp).to.deep.include({
        statusCode: 302,
        multiValueHeaders: { Location: [ `https://${VEGA_URL}/search/card?recordId=22297361&originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Db22297361%3Fcollection%3Dcirc%26collection%3Dresearch` ] }
      })
    })

    it('should redirect to research catalog when anything other than "circ" is in collection query params', async function () {
      const event = {
        path: '/record=b22297361',
        multiValueHeaders: {
          'x-forwarded-proto': ['https'],
          host: ['catalog.nypl.org']
        },
        multiValueQueryStringParameters: {
          "collection": ["research"]
        }
      }
      const resp = await handler(event, context, (_, resp) => resp);
      expect(resp).to.deep.include({
        statusCode: 302,
        multiValueHeaders: { Location: [ "https://www.nypl.org/research/research-catalog/bib/b22297361?originalUrl=https%3A%2F%2Fcatalog.nypl.org%2Frecord%3Db22297361%3Fcollection%3Dresearch" ] }
      })
    })
  })

  describe('encore logout redirect', () => {
    const jsConditionalRedirect = 'https://redir-browse.nypl.org/js-conditional-redirect'

    const baseEvent = {
      path: '/iii/encore/logoutFilterRedirect',
      multiValueHeaders: {
        'x-forwarded-proto': ['https'],
        host: ['browse.nypl.org']
      }
    }

    it('should redirect Encore logout URL to Vega Auth logout endpoint', async function () {
      const resp = await handler(baseEvent, context, (_, resp) => resp);
      const url = jsConditionalRedirect
        + '?redirect_uri=' + encodeURIComponent(
          `https://${VEGA_URL}/logout`
            + '?redirect_uri='
            + encodeURIComponent(
              'https://redir-browse.nypl.org/vega-logout-handler?redirect_uri='
              + encodeURIComponent(`https://${VEGA_URL}/`)
            )
        )
        + '&noscript_redirect_uri=' + encodeURIComponent(
          'https://ilsstaff.nypl.org/iii/cas/logout?service='
          + encodeURIComponent(`https://${VEGA_URL}/`)
        )
      expect(resp).to.deep.eql({
        isBase64Encoded: false,
        statusCode: 302,
        multiValueHeaders: { Location: [ url ] }
      })
    })

    // Test several allowed redirect_uris:
    ; [
      'https://www.nypl.org/',
      `https://${ENCORE_URL}/`,
      `https://${LEGACY_CATALOG_URL}/`,
      `https://${VEGA_URL}/`,
      `https://${BASE_SCC_URL}`,
      `https://${VEGA_URL}/logout?redirect_uri=https://www.nypl.org/research/research-catalog/bib/b11373666`
    ].forEach((validUrl) => {
      it(`should respect redirect_uri=${validUrl}`, async function () {
        const eventWithRedirect = Object.assign( {}, baseEvent,
          { multiValueQueryStringParameters: { redirect_uri: [ validUrl ] } }
        )
        const resp = await handler(eventWithRedirect, context, (_, resp) => resp);
        const url = jsConditionalRedirect
          + '?redirect_uri=' + encodeURIComponent(
            `https://${VEGA_URL}/logout?redirect_uri=` + encodeURIComponent(
               'https://redir-browse.nypl.org/vega-logout-handler?redirect_uri=' + encodeURIComponent(validUrl)
            )
          )
          + '&noscript_redirect_uri=' + encodeURIComponent(
            'https://ilsstaff.nypl.org/iii/cas/logout?service=' + encodeURIComponent(validUrl)
          )

        expect(resp).to.deep.include({
          statusCode: 302,
          multiValueHeaders: { Location: [ url ] }
        })
      })
    })

    // Test replacing discovery.nypl.org with nypl.org in redirect

    ; [
      'https://www.discovery.nypl.org/',
      'https://discovery.nypl.org/'
    ].forEach((validUrl) => {
      it(`should respect redirect_uri=${validUrl}`, async function () {
        const eventWithRedirect = Object.assign( {}, baseEvent,
          { multiValueQueryStringParameters: { redirect_uri: [ validUrl ] } }
        )
        const resp = await handler(eventWithRedirect, context, (_, resp) => resp);

        const url = jsConditionalRedirect
         + '?redirect_uri=' + encodeURIComponent(`https://${VEGA_URL}/logout?redirect_uri=https%3A%2F%2Fredir-browse.nypl.org%2Fvega-logout-handler%3Fredirect_uri%3D` + encodeURIComponent(encodeURIComponent('https://www.nypl.org/')))
         + '&noscript_redirect_uri=https%3A%2F%2Filsstaff.nypl.org%2Fiii%2Fcas%2Flogout%3Fservice%3Dhttps%253A%252F%252Fwww.nypl.org%252F'
        expect(resp).to.deep.include({
          statusCode: 302,
          multiValueHeaders: { Location: [ url ] }
        })
      })
    })

    it('should reject invalid redirect_uri param', async function () {
      const eventWithRedirect = Object.assign( {}, baseEvent,
        { multiValueQueryStringParameters: { redirect_uri: [ 'https://duckduckgo.com' ] } }
      )
      const resp = await handler(eventWithRedirect, context, (_, resp) => resp);
      const url = jsConditionalRedirect
        + '?redirect_uri=' + encodeURIComponent(`https://${VEGA_URL}/logout?redirect_uri=https%3A%2F%2Fredir-browse.nypl.org%2Fvega-logout-handler%3Fredirect_uri%3D` + encodeURIComponent(encodeURIComponent(`https://${VEGA_URL}/`)))
        + `&noscript_redirect_uri=https%3A%2F%2Filsstaff.nypl.org%2Fiii%2Fcas%2Flogout%3Fservice%3Dhttps%253A%252F%252F${VEGA_URL}%252F`
      expect(resp).to.deep.include({
        statusCode: 302,
        multiValueHeaders: { Location: [ url ] }
      })
    })
  })

  describe('vega logout handler', function () {
    const baseEvent = {
      path: '/vega-logout-handler',
      multiValueHeaders: {
        'x-forwarded-proto': ['https'],
        host: ['redir-browse.nypl.org']
      }
    }
    it('should send user through CAS, passing valid redirect', async function () {
      const eventWithRedirect = Object.assign( {}, baseEvent,
        { multiValueQueryStringParameters: { redirect_uri: [ 'https://www.nypl.org/research/research-catalog/bib/b1234' ] } }
      )
      const resp = await handler(eventWithRedirect, context, (_, resp) => resp);
      expect(resp).to.deep.eql({
        isBase64Encoded: false,
        statusCode: 302,
        multiValueHeaders: { Location: [
          `https://ilsstaff.nypl.org/iii/cas/logout?service=${encodeURIComponent('https://www.nypl.org/research/research-catalog/bib/b1234')}`
        ] }
      })
    })

    it('should send user through CAS, passing default redirect', async function () {
      const resp = await handler(baseEvent, context, (_, resp) => resp);
      expect(resp).to.deep.eql({
        isBase64Encoded: false,
        statusCode: 302,
        multiValueHeaders: { Location: [
          `https://ilsstaff.nypl.org/iii/cas/logout?service=${encodeURIComponent(`https://${VEGA_URL}/`)}`
        ] }
      })
    })
  })

  it('should respond with client-side redirect for /js-conditional-redirect', async function () {
    const event = {
      path: '/js-conditional-redirect',
      multiValueQueryStringParameters: {
        redirect_uri: [ 'https://www.nypl.org/js-enabled' ],
        noscript_redirect_uri: [ 'https://www.nypl.org/js-disabled' ]
      }
    }

    const resp = await handler(event, context, (_, resp) => resp);
    expect(resp.statusCode).to.eql(200);

    expect(resp.body).includes('window.location.replace("https://www.nypl.org/js-enabled");')
    expect(resp.body).includes('<meta http-equiv="refresh" content="1;url=https://www.nypl.org/js-disabled" />')
  });
})
