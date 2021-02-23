// Classic catalog uses certain letters to denote the type of search.
// indexMappings maps these letters to the corresponding SCC params.
// For keyword searches and unknown search types, we just do a general search.

const indexMappings = {
  a: '&search_scope=contributor',
  t: '&search_scope=title',
  s: '&search_scope=journal_title',
  // h: '', // there is no genre search
  // d: '', // this is the subject search, might want to do something different
  i: '&search_scope=standard_number', // what to do with these?
  c: '&search_scope=standard_number',
}

const getIndexMapping = index => indexMappings[index] || '';

// change Catalog's + for the more standard %20
const recodeSearchQuery = query => query.split(/\+|\s/).join("%20");

// here we are looking for urls of the form search?/XYZ..., where /XYZ is given
// as a key with no value, and denotes the search index + term
const getQueryParamsGivenAsKeys = (searchParams) => {
  for (let [searchParamKey, searchParamValue] of searchParams.entries()) {
    if (!searchParamValue) {
      const splitted = searchParamKey.split('/');
      if (splitted[1]) {
        // the searchIndex can be found in the first letter after the /
        searchIndex = splitted[1][0];
        // the rest of the path after / is the query
        searchArgFromQueryParam = splitted[1].slice(1);
        return { searchIndex, searchArgFromQueryParam };
      }
      // the search param can also be given as search/X?YZ with the searchIndex before the ?.
      else if (splitted[0]) {
        searchArgFromQueryParam = splitted[0];
        return { searchArgFromQueryParam };
      }
    }
  }
  return {};
}

// search query strings can be found in multiple places, so we need a method to
// extract them
const getQueryFromParams = (url, parsedURL) => {
  // search query strings can be given in the searcharg or SEARCH params
  const searchArg = parsedURL.searchParams.get('searcharg');
  const searchArgAlt = parsedURL.searchParams.get('SEARCH');
  // searchIndex will track the type of search, e.g. author, title, etc.
  const { searchIndex, searchArgFromQueryParam } = getQueryParamsGivenAsKeys(parsedURL.searchParams);

  const q = searchArg || searchArgAlt || searchArgFromQueryParam || '';
  const searchType = parsedURL.searchParams.get('searchtype') || searchIndex;

  return recodeSearchQuery(q + (searchType ? getIndexMapping(searchType) : ''));
}

module.exports = {
  getQueryFromParams,
  recodeSearchQuery,
  getIndexMapping,
}
