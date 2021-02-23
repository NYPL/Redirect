const { expect } = require('chai');
const { expressions, BASE_SCC_URL } = require('../../expressions.js');


const findMatching = (url) => {
  const parsedURL = new URL(url);
  const pathname = parsedURL.pathname;
  for (let pathType of expressions) {
      const match = pathname.match(pathType.expr);
      if (match) { return pathType.name; }
  }
}

describe('expressions', () => {
  it('should match catalog to homepage', () => {
    expect(findMatching('http://catalog.nypl.org')).to.eql('homepage');
    expect(findMatching('https://catalog.nypl.org')).to.eql('homepage');
  });

  it('should match auth pages to auth', () => {
    expect(findMatching('http://catalog.nypl.org/iii/cas/login')).to.eql('auth');
  });

  it('should match bib pages with record', () => {
    expect(findMatching('http://catalog.nypl.org/record=b12345')).to.eql('record');
  });

  it('should match search pages with path params to searchWith', () => {
    expect(findMatching('http://catalog.nypl.org/search/aExample')).to.eql('searchWith');
    expect(findMatching('http://catalog.nypl.org/search~S11/aExample')).to.eql('searchWith');
  });

  it('should match search pages with query params but no path params to searchWithout', () => {
    expect(findMatching('http://catalog.nypl.org/search/a?Example')).to.eql('searchWithout');
    expect(findMatching('http://catalog.nypl.org/search?/aExample')).to.eql('searchWithout');
    expect(findMatching('http://catalog.nypl.org/search/a')).to.eql('searchWithout');
    expect(findMatching('http://catalog.nypl.org/search~S12/a?Example')).to.eql('searchWithout');
  });
});
