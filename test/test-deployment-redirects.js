/***
 *  Script for testing RedirectService deployment against targets.
 *
 *  To test the QA RedirectService:
 *   - Download following sheet as a CSV and save to ./redirect-expectations.csv :
 *       https://docs.google.com/spreadsheets/d/1055Y98c_4l-NXWyzoiUhBSkay4SYZMeKEc9-LGhGoqw/edit#gid=1152476292
 *   - Run: `node test/test-deployment-redirects.js --qa`
 *   - Look for "Failed to match" entries
 *
 *  To test the Prod RedirectService:
 *   - Repeat above steps but remove the --qa from the command
 */

const fs = require('fs')
const { parse } = require('csv-parse/sync')
const axios = require('axios')
const chalk = require('chalk')

const argv = require('minimist')(process.argv.slice(2))

const input = argv.input || './redirect-expectations.csv'

const changeToQa = (url) => {
  return url
    // Prod Encore to Test Encore:
    // Note this has another valid hostname: https://nypl-encore-test.
    .replace(/^https:\/\/browse\./, 'https://qa-redir-browse.')
    // Prod Catalog alias to QA Catalog alias:
    .replace(/https(:\/\/|%3A%2F%2F)catalog\.nypl\.org/g, 'https$1qa-catalog.nypl.org') // legacyqa-catalog.nypl.org
    // Prod RedirectService to QA RedirectService:
    .replace(/^https:\/\/redir-browse\./, 'https://qa-redir-browse.')
    // Prod www to qa:
    .replace(/^https:\/\/www.nypl/, 'https://qa-www.nypl')
    // Prod legacycatalog to nypl-sierra-test:
    .replace(/^https:\/\/legacycatalog/, 'https://nypl-sierra-test')
}

const rows = parse(fs.readFileSync(input, 'utf8'), { columns: true })
  .map((row, ind) => {
    return {
      type: row.Type,
      url: row['URL'],
      target: row['Redirect To'],
      rowNumber: ind + 1
    }
  })
  .map((row) => {
    // If running in QA mode, modify input URLs to use QA domains
    if (argv.qa) {
      row = Object.assign(row, {
        url: changeToQa(row.url),
        target: changeToQa(row.target),
      })
    }
    return row
  })
  .filter((row) => {
    // Filter out any rows not requested via --row arg, if used
    return !argv.row || argv.row === row.rowNumber
  })

const testRow = (row) => {
  const opts = {
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
  }
  if (!row.url) return Promise.resolve()

  return axios.get(row.url, opts)
    .then((resp) => {
      const redirect = resp.headers.location

      const matched = redirect === row.target
      if (matched) {
        console.log(chalk.green(`  Matched: ${redirect}`))

      } else {
        // Specially color case where the actual redirect URL matches the start
        // of the target URL (e.g. matching except for a query param):
        let partialMatch = redirect.indexOf(row.target) === 0 ? 'starts-with' : false
        const color = partialMatch ? chalk.yellow : chalk.red

        console.error(color(`  ${partialMatch ? `Partial (${partialMatch})` : 'Failed to'} match:`))
        console.error(color(`    Expected redirect: ${row.target}`))
        console.error(color(`    Actual redirect:   ${redirect}`))
      }
    })
}

const testAll = async (index = 0) => {
  const row = rows[index]
  if (row.type) {
    console.log('------------------------------------------------------------')
    console.log(row.type)
    console.log('------------------------------------------------------------')
  }

  console.log(`[${row.rowNumber} of ${rows.length}]: Request ${row.url}`)
  await testRow(row)

  if (rows.length > index + 1) {
    testAll(index + 1)
  } else {
    console.log('Done')
  }
}

testAll()
