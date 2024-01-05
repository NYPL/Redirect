/***
 *  Script for testing RedirectService deployment against targets.
 *
 *  To test the QA RedirectService:
 *   - Download following sheet as a CSV and save to ./encore-vega-redirects.csv :
 *       https://docs.google.com/spreadsheets/d/1055Y98c_4l-NXWyzoiUhBSkay4SYZMeKEc9-LGhGoqw/edit#gid=234726655
 *   - Run: `node test/test-deployment-redirects.js`
 *   - Look for "Failed to match" entries
 *
 *  To test the Prod RedirectService:
 *   - Repeat above steps but add --prod to the command
 */

const fs = require('fs')
const { parse } = require('csv-parse/sync')
const axios = require('axios')
const chalk = require('chalk')

const argv = require('minimist')(process.argv.slice(2))

const input = argv.input || './encore-vega-redirects.csv'
const rows = parse(fs.readFileSync(input, 'utf8'), { columns: true })
  .map((row) => {
    return {
      type: row.Type,
      url: row['"Encore" URL'],
      target: row['Should redirect to']
    }
  })
  .map((row) => {
    // If running in prod mode, modify input URLs to use prod domains
    if (argv.prod) {
      row = Object.assign(row, {
        url: row.url.replace('https://qa-redir', 'https://redir')
      })
    }
    return row
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
        console.log(chalk.green('  Matched'))
      } else {
        console.error(chalk.red('  Failed to match:'))
        console.error(chalk.red(`    Expected redirect: ${row.target}`))
        console.error(chalk.red(`    Actual redirect:   ${redirect}`))
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

  console.log(`[${index + 1} of ${rows.length}]: Request ${row.url}`)
  await testRow(row)

  if (rows.length > index + 1) {
    testAll(index + 1)
  } else {
    console.log('Done')
  }
}

testAll()
