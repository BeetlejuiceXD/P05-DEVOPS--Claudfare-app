import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Validate the generated artifact, never the source configuration's defaults.
const configPath = resolve(process.argv[2] || 'dist/p05_devops_cloudflare_app/wrangler.json')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
assert.equal(config.name, 'p07-devops-cloudflare-app-production', 'Refusing an unexpected Worker target')
assert.equal(config.compatibility_date, '2026-09-16')
assert.equal(config.workers_dev, true)
assert.equal(config.assets?.not_found_handling, 'single-page-application')
assert.equal(config.observability?.enabled, true)
assert.equal(config.upload_source_maps, true)
assert.equal(config.d1_databases?.length, 1, 'Expected exactly one production D1 binding')
const db = config.d1_databases[0]
assert.equal(db.binding, 'practica-6')
assert.equal(db.database_name, 'p07-devops-production-db')
assert.equal(db.database_id, '062be339-4ce9-452d-b44d-b2a9b8149f3a')
assert.equal(config.env, undefined, 'Expected a flattened build configuration')
assert.ok(config.main, 'Missing bundled Worker entry point')
assert.ok(config.assets?.directory, 'Missing built assets directory')
assert.ok(statSync(resolve(dirname(configPath), config.main)).isFile())
assert.ok(statSync(resolve(dirname(configPath), config.assets.directory)).isDirectory())
console.log(`Validated production artifact: ${config.name}; D1: ${db.binding} -> ${db.database_name} (${db.database_id})`)
