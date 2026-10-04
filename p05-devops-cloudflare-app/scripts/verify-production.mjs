import assert from 'node:assert/strict'
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function getProductionUrl(log) {
  const urls = log.match(/https:\/\/p07-devops-cloudflare-app-production\.[a-z0-9-]+\.workers\.dev(?=[\s/]|$)/gi) || []
  const origins = [...new Set(urls.map(value => new URL(value).origin))]
  assert.ok(origins.length <= 1, 'Wrangler reported multiple production origins')
  return origins[0]
}

export async function verifyProduction(origin, fetcher = fetch) {
  // Only read the deployed app; never send credentials or mutate D1.
  const get = async path => {
    const result = await fetcher(new URL(path, origin), {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
    })
    assert.ok(result.ok, `Production check failed for ${path}: HTTP ${result.status}`)
    return result
  }
  const page = await get('/')
  assert.match(page.headers.get('content-type') || '', /text\/html/i)
  assert.match(await page.text(), /Practice 5 - Cloudflare App/)
  const connection = await (await get('/api/database')).json()
  assert.equal(connection.connected, true, 'Production D1 connection check failed')
  const users = await (await get('/api/users')).json()
  assert.ok(Array.isArray(users.users), 'Production users response is invalid')
}

async function main() {
  const origin = getProductionUrl(readFileSync(process.argv[2], 'utf8'))
  const summary = text => {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n')
  }
  if (!origin) {
    console.log('::warning::No exact production workers.dev URL found in Wrangler output; smoke check skipped. Confirm the URL manually.')
    summary('Production deployment completed, but its URL could not be extracted. Automated verification was skipped; manual verification is required.')
    return
  }
  summary(`Production URL: [${origin}](${origin})`)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await verifyProduction(origin)
      console.log(`Production smoke checks passed: ${origin}`)
      summary('Read-only checks passed: application HTML, D1 connection, and users response.')
      return
    } catch {
      if (attempt === 5) throw new Error('Production smoke checks failed after 5 attempts; inspect the production application.')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
