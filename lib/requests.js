const { nyplApiClient } = require('../lib/nypl-api-client.js')

const queryIsResearch = async (num, queryParam) => {
  const client = await nyplApiClient({ apiName: 'discovery' })
  const resp = await client.get(`/bibs?nyplSource=sierra-nypl&${queryParam}=${num}`)
  const bibId = resp?.data?.[0].id
  const varFields = resp?.data?.[0]?.varFields
  const field910a = varFields && varFields.find(field =>
    field.marcTag === '910' &&
    field.subfields.some(subfield => subfield.tag === 'a')
  )
  const isResearch = field910a && field910a.subfields.some(subfield => subfield.tag === 'a' && subfield.content === 'RL')
  return { isResearch, bibId }
}

module.exports = { queryIsResearch }