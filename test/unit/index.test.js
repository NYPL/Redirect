const { expect } = require('chai');
const { mapWebPacUrlToSCCURL, BASE_SCC_URL } = require('../../index.js');

describe('mapWebPacUrlToSCCURL', () => {
  it('should map the base URL correctly', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/'))
      .to.eql(BASE_SCC_URL)
  });

  it('should map bib pages correctly', () => {
    expect(mapWebPacUrlToSCCURL('http://catalog.nypl.org/record=b12172157~S1'))
      .to.eql(`${BASE_SCC_URL}bib/b12172157`)
  })

  it('should map search pages using the format /Xsearchterm', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/search~S1?/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-)'))
      .to.eql(`${BASE_SCC_URL}search?q=Rubina,%20Dina&search_scope=contributor`)
  });

  it('should map search pages with index but no search term', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/search/t'))
      .to.eql(`${BASE_SCC_URL}search?q=&search_scope=title`)
  });

  it('should map search pages with searcharg and searchtype given as parameters', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/search~S1/?searchtype=a&searcharg=winspeare%2C+j&searchscope=1&sortdropdown=-&SORT=D&extended=0&SUBMIT=Search&searchlimits=&searchorigarg=dmystery'))
      .to.eql(`${BASE_SCC_URL}search?q=winspeare,%20j&search_scope=contributor`)
  });

  it('should map search pages with SEARCH given as parameter', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/search/t?SEARCH=The+Mothers+&sortdropdown=-&searchscope=1'))
      .to.eql(`${BASE_SCC_URL}search?q=The%20Mothers%20&search_scope=title`)
  });

  it('should map search pages with search query given as query param', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/search~S1/a?jac+winspeare%2C'))
      .to.eql(`${BASE_SCC_URL}search?q=jac%20winspeare,&search_scope=contributor`)
  });

  it('should map search pages with search query and search type as query param', () => {
    expect(mapWebPacUrlToSCCURL('https://catalog.nypl.org/search~S97?/tbrainwash/tbrainwash/1%2C3%2C10%2CB/exact&FF=tbrainwash&1%2C4%2C'))
      .to.eql(`${BASE_SCC_URL}search?q=brainwash&search_scope=title`)
  });
})
