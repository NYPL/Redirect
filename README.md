# Redirect service

## Purpose

Redirect request for old Classic Catalog pages to new Research Catalog, and old circulating catalog (Encore) to the new circulating catalog (Vega)

## Current Status

Implemented for Research Catalog:

- homepage
- permanent urls for bib show pages
- most common search pages, accounting for search index and argument
- login page

Not yet implemented for Research Catalog:

- search-type urls that point to bib pages (i.e. non-permanent links)
- patron account pages
- non-research pages
- more complicated search page parameters (e.g. sort type)
- subject searches
- standard number searches are implemented, but seem to have some issues.

Implemented for Circulating:

- homepage, bookcard, home
- permanent urls for bib show pages
- keyword searches, not accounting for pagination or facets
- account page

## Running locally

```
npm i
```

To test an event locally:
```
sam local invoke --region us-east-1 --template sam.local.yml --profile nypl-digital-dev --event events/event.json
```

The main function is `mapToRedirectUrl`. It may be more convenient to `require` the exported module in the node repl and test this function than to run `sam local invoke`

To run the app as a local server:

```
sam local start-api --region us-east-1 --template sam.local.yml --profile nypl-digital-dev -p 3010
```

Visit http://localhost:3010/record/C__Rb18225028 , for example, and verify it redirects to the right Vega bib page.

## Contributing

This repo follows a [PRS-Target-Main Git Workflow](https://github.com/NYPL/engineering-general/blob/a19c78b028148465139799f09732e7eb10115eef/standards/git-workflow.md#prs-target-master-merge-to-deployment-branches); PRs target `main`, merge `main` into `qa` and `production` to deploy.

## Testing

`npm test`

To test the app's performance against the [redirect targets sheet](https://docs.google.com/spreadsheets/d/1055Y98c_4l-NXWyzoiUhBSkay4SYZMeKEc9-LGhGoqw/edit#gid=234726655), run:

```
node test/test-deployment-redirects
```

## Deployment

CI/CD is configured in `.github/workflows/test-and-deploy.yml` for the following branches:

- `qa`
- `production`

### Accessing deployed code

This app is deployed as qa and production Lambda functions in `nypl-digital-dev`. A set of [load balancer "Target groups"](https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#TargetGroups:targetType=Lambda;search=catal) in that account route traffic to the lambda functions. DNS in the `nypl` account routes several nypl.org subdomains to those LB target groups. The subdomains include:
 - Prod:
   - redir-browse.nypl.org
   - catalog.nypl.org
 - QA:
   - qa-redir-browse.nypl.org
   - [Unclear why qa-catalog.nypl.org routes elsewhere]

Thus, to test route handling by the redirect service, build requests using those domains (note the hostname doesn't matter for most redirects). For example:

| Scenario | Expected result | Links |
|----------|-----------------|-------|
| Old catalog bib URL | Redirect to equivalent RC bib | [QA](https://qa-redir-browse.nypl.org/record=b12172157~S1) - [Prod](https://qa-redir-browse.nypl.org/record=b12172157~S1) |
| Old catalog search | Redirect to equivalent RC search | [QA](https://qa-redir-browse.nypl.org/search~S1/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-) - [Prod](https://catalog.nypl.org/search~S1/aRubina%2C+Dina/arubina+dina/1%2C2%2C84%2CB/exact&FF=arubina+dina+author&1%2C-1%2C/indexsort=-) |
| Encore bib page | Redirect to Vega bib page | [QA](https://qa-redir-browse.nypl.org/record/C__Rb18225028) - [Prod](https://redir-browse.nypl.org/record/C__Rb18225028) |
| Encore logout | Redirect to CAS Logout | [QA](https://qa-redir-browse.nypl.org/iii/encore/logoutFilterRedirect) - [Prod](https://redir-browse.nypl.org/iii/encore/logoutFilterRedirect) |
