import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index.js'

const request = (path, method = 'GET') => new Request(`https://unit-test.invalid${path}`, { method })
function database() {
  const statement = {
    first: vi.fn().mockResolvedValue({ connected: 1 }),
    all: vi.fn().mockResolvedValue({ results: [] }),
  }
  const db = { prepare: vi.fn().mockReturnValue(statement) }
  return { env: { 'practica-6': db }, db, statement }
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network forbidden in unit tests')))
})

it('verifies the connection with D1 and disables response caching', async () => {
  const { env, db, statement } = database()
  const result = await worker.fetch(request('/api/database'), env)
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ connected: true })
  expect(result.headers.get('Cache-Control')).toBe('no-store')
  expect(db.prepare).toHaveBeenCalledExactlyOnceWith('SELECT 1 AS connected')
  expect(statement.first).toHaveBeenCalledOnce()
  expect(statement.all).not.toHaveBeenCalled()
})

it.each([{ rows: [] }, { rows: [{ id: 1, name: 'Ana' }] }])('returns the mocked user rows: $rows', async ({ rows }) => {
  const { env, db, statement } = database()
  statement.all.mockResolvedValue({ results: rows })
  const result = await worker.fetch(request('/api/users'), env)
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ users: rows })
  expect(result.headers.get('Cache-Control')).toBe('no-store')
  expect(db.prepare).toHaveBeenCalledExactlyOnceWith('SELECT * FROM users LIMIT 50')
  expect(statement.all).toHaveBeenCalledOnce()
  expect(statement.first).not.toHaveBeenCalled()
})

describe.each(['/api/database', '/api/users'])('%s', path => {
  it('returns 503 for a missing binding', async () => {
    const result = await worker.fetch(request(path), {})
    expect(result.status).toBe(503)
    expect(await result.json()).toEqual({ error: 'D1 binding is not configured' })
    expect(result.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'])('rejects %s before querying D1', async method => {
    const { env, db } = database()
    const result = await worker.fetch(request(path, method), env)
    expect(result.status).toBe(405)
    expect(result.headers.get('Allow')).toBe('GET')
    expect(result.headers.get('Cache-Control')).toBe('no-store')
    expect(await result.json()).toEqual({ error: 'Method not allowed' })
    expect(db.prepare).not.toHaveBeenCalled()
  })

  it('handles a rejected D1 query without exposing error details', async () => {
    const { env, statement } = database()
    const error = new Error('Private database details')
    statement.first.mockRejectedValue(error)
    statement.all.mockRejectedValue(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await worker.fetch(request(path), env)
    expect(result.status).toBe(503)
    expect(await result.json()).toEqual({ error: 'Unable to query D1' })
    expect(result.headers.get('Cache-Control')).toBe('no-store')
    expect(log).toHaveBeenCalledWith('D1 query failed:', error)
  })
})

it.each([null, {}, { connected: 0 }])('rejects unexpected connection result %j', async value => {
  const { env, statement } = database()
  statement.first.mockResolvedValue(value)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const result = await worker.fetch(request('/api/database'), env)
  expect(result.status).toBe(503)
  expect(await result.json()).toEqual({ error: 'Unable to query D1' })
})

it('preserves the existing starter API response without accessing D1', async () => {
  const { env, db } = database()
  const result = await worker.fetch(request('/api/'), env)
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ name: 'Cloudflare' })
  expect(db.prepare).not.toHaveBeenCalled()
})

it.each(['/api/unknown', '/unknown'])('returns 404 for %s without accessing D1', async path => {
  const { env, db } = database()
  const result = await worker.fetch(request(path), env)
  expect(result.status).toBe(404)
  expect(await result.text()).toBe('')
  expect(db.prepare).not.toHaveBeenCalled()
})
