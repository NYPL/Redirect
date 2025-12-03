# Redirect Service

A service for handling traffic to deprecated catalog hosts, which routes the traffic to the best alternate URL.

## Purpose

As we turn off catalog services, we direct their DNS to this service, which determines the best place to send the patron based on the app they were attempting to reach (given by host) and the request path. This service currently handles DNS for:
 - Encore (browse.nypl.org)
 - Webpac (catalog.nypl.org, legacycatalog.nypl.org, ilsstaff.nypl.org)

(As well as QA equivalents.)

This app also serves a few routes on its own dedicated redir-browse.nypl domain to support complicated login flows and debugging.

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

To enable verbose logging for debugging:

`LOG_LEVEL=debug npm test`

To test the app's performance against the [redirect targets sheet](https://docs.google.com/spreadsheets/d/1055Y98c_4l-NXWyzoiUhBSkay4SYZMeKEc9-LGhGoqw/edit#gid=234726655), run:

```
node test/test-deployment-redirects [--qa]
```

## Deployment

CI/CD is configured in `.github/workflows/test-and-deploy.yml` for the following branches:

- `qa`
- `production`

### Accessing deployed code

This app is deployed as qa and production Lambda functions in `nypl-digital-dev`. A set of [load balancer "Target groups"](https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#TargetGroups:targetType=Lambda;search=catal) in that account route traffic to the lambda functions. DNS in the `nypl` account routes several nypl.org subdomains to those LB target groups.
