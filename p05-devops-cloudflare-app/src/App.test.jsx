// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const response = (data, ok = true) => ({ ok, json: async () => data })
const connectionError = /No se pudo verificar la conexión/
const usersError = /No se pudieron consultar los usuarios/

beforeEach(() => {
  // An unexpected request fails locally; no test can fall through to real fetch.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected request')))
})
afterEach(cleanup)

function setup() {
  const user = userEvent.setup()
  render(<App />)
  return user
}

it('renders the existing practice content without fetching on mount', () => {
  setup()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Practice 5 - Cloudflare App')
  expect(screen.getByText('Heriberto Vlaminck')).toBeInTheDocument()
  expect(screen.getByText('React application deployed with Cloudflare Workers')).toBeInTheDocument()
  const technologies = screen.getByRole('region', { name: 'Technologies used' })
  expect(within(technologies).getAllByRole('listitem').map(item => item.textContent))
    .toEqual(['React', 'Vite', 'Cloudflare Workers', 'GitHub'])
  expect(screen.getByText('Successfully deployed with Cloudflare')).toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

describe('connection check', () => {
  it('disables the button while pending and reports a successful connection', async () => {
    let resolve
    fetch.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))
    expect(screen.getByRole('button', { name: 'Verificando…' })).toBeDisabled()
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/database', { cache: 'no-store' })
    resolve(response({ connected: true }))
    expect(await screen.findByText('Conexión con D1 verificada correctamente.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeEnabled()
  })

  it.each([
    ['HTTP error', () => Promise.resolve(response({ connected: true }, false))],
    ['invalid payload', () => Promise.resolve(response({ connected: false }))],
    ['missing field', () => Promise.resolve(response({}))],
    ['network error', () => Promise.reject(new Error('offline'))],
    ['invalid JSON', () => Promise.resolve({ ok: true, json: async () => { throw new SyntaxError('JSON') } })],
  ])('shows an error for %s and allows a successful retry', async (_, result) => {
    fetch.mockImplementationOnce(result).mockResolvedValueOnce(response({ connected: true }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))
    expect(await screen.findByText(connectionError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))
    expect(await screen.findByText('Conexión con D1 verificada correctamente.')).toBeInTheDocument()
    expect(screen.queryByText(connectionError)).not.toBeInTheDocument()
  })
})

describe('users query', () => {
  it('renders returned columns and values, including nulls and escaped text', async () => {
    fetch.mockResolvedValueOnce(response({ users: [
      { id: 1, name: 'Ana', note: null },
      { id: 2, name: '<b>Leo</b>', note: 'Student' },
    ] }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Consultar usuarios' }))
    const table = await screen.findByRole('table', { name: 'Usuarios de la base de datos' })
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['id', 'name', 'note'])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('cell', { name: '—' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: '<b>Leo</b>' }).querySelector('b')).toBeNull()
    expect(screen.getByText('2 registro(s) encontrado(s) (máximo 50).')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/users', { cache: 'no-store' })
  })

  it('clears old results while refreshing and handles an empty result', async () => {
    let resolve
    fetch.mockResolvedValueOnce(response({ users: [{ id: 1, name: 'Ana' }] }))
      .mockReturnValueOnce(new Promise(done => { resolve = done }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Consultar usuarios' }))
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Consultar usuarios' }))
    expect(screen.getByRole('button', { name: 'Cargando…' })).toBeDisabled()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    resolve(response({ users: [] }))
    expect(await screen.findByText('0 registro(s) encontrado(s) (máximo 50).')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Consultar usuarios' })).toBeEnabled()
  })

  it.each([
    ['HTTP error', () => Promise.resolve(response({ users: [] }, false))],
    ['invalid users', () => Promise.resolve(response({ users: {} }))],
    ['missing users', () => Promise.resolve(response({}))],
    ['network error', () => Promise.reject(new Error('offline'))],
    ['invalid JSON', () => Promise.resolve({ ok: true, json: async () => { throw new SyntaxError('JSON') } })],
  ])('shows an error for %s and allows a successful retry', async (_, result) => {
    fetch.mockImplementationOnce(result).mockResolvedValueOnce(response({ users: [{ id: 1, name: 'Ana' }] }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Consultar usuarios' }))
    expect(await screen.findByText(usersError)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Consultar usuarios' }))
    expect(await screen.findByRole('cell', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.queryByText(usersError)).not.toBeInTheDocument()
  })
})
