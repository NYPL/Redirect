# Redirect service

## Purpose

Redirect request for old Classic Catalog pages to new Research Catalog

## Current Status

Implemented:

- homepage
- permanent urls for bib show pages
- most common search pages, accounting for search index and argument
- login page

Not yet implemented:

- search-type urls that point to bib pages (i.e. non-permanent links)
- patron account pages
- non-research pages
- more complicated search page parameters (e.g. sort type)
- subject searches
- standard number searches are implemented, but seem to have some issues.

## Running locally

```
npm i
```

To test an event locally:
```
sam local invoke --region us-east-1 --template sam.local.yml --profile nypl-digital-dev --event events/event.json
```

The main function is `mapToRedirectUrl`. It may be more convenient to `require` the exported module in the node repl and test this function than to run `sam local invoke`

## Contributing


This repo follows a [PRS-Target-Master Git Workflow](https://github.com/NYPL/engineering-general/blob/a19c78b028148465139799f09732e7eb10115eef/standards/git-workflow.md#prs-target-master-merge-to-deployment-branches)

## Testing

`npm test`

## Deployment

CI/CD is configured in `.travis.yml` for the following branches:

- `qa`
