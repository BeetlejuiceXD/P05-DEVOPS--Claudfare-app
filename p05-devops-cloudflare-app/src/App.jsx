import { useState } from 'react'
import './App.css'

const technologies = ['React', 'Vite', 'Cloudflare Workers', 'GitHub']

function App() {
  const [databaseStatus, setDatabaseStatus] = useState('idle')

  const [users, setUsers] = useState([])
  const [usersStatus, setUsersStatus] = useState('idle')

  async function loadUsers() {
    setUsersStatus('loading')
    setUsers([])
    try {
      const response = await fetch('/api/users', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.users)) {
        throw new Error('Users query failed')
      }
      setUsers(data.users)
      setUsersStatus('loaded')
    } catch {
      setUsersStatus('error')
    }
  }

  async function checkDatabase() {
    setDatabaseStatus('loading')
    try {
      const response = await fetch('/api/database', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || data.connected !== true) {
        throw new Error('Database check failed')
      }
      setDatabaseStatus('connected')
    } catch {
      setDatabaseStatus('error')
    }
  }

  return (
    <main className="practice-card">
      <header>
        <p className="eyebrow">DevOps · Practice 5</p>
        <h1>Practice 5 - Cloudflare App</h1>
        <p className="subtitle">
          React application deployed with Cloudflare Workers
        </p>
      </header>

      <dl className="student">
        <dt>Student</dt>
        <dd>Heriberto Vlaminck</dd>
      </dl>

      <section className="technologies" aria-labelledby="technologies-title">
        <h2 id="technologies-title">Technologies used</h2>
        <ul>
          {technologies.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </section>

      <section className="database" aria-labelledby="database-title">
        <h2 id="database-title">Cloudflare D1</h2>
        <p>Verifica la conexión de la aplicación con la base de datos.</p>
        <button onClick={checkDatabase} disabled={databaseStatus === 'loading'}>
          {databaseStatus === 'loading' ? 'Verificando…' : 'Probar conexión'}
        </button>
        <p role="status">
          {databaseStatus === 'connected' && 'Conexión con D1 verificada correctamente.'}
          {databaseStatus === 'error' && 'No se pudo verificar la conexión. Revisa el binding D1 y los registros del Worker.'}
        </p>
        <button onClick={loadUsers} disabled={usersStatus === 'loading'}>
          {usersStatus === 'loading' ? 'Cargando…' : 'Consultar usuarios'}
        </button>
        <p role="status">
          {usersStatus === 'loaded' && `${users.length} registro(s) encontrado(s) (máximo 50).`}
          {usersStatus === 'error' && 'No se pudieron consultar los usuarios. Comprueba que la tabla users existe en esta base.'}
        </p>
        {users.length > 0 && (
          <div className="users-table">
            <table>
              <caption>Usuarios de la base de datos</caption>
              <thead>
                <tr>{Object.keys(users[0]).map((column) => <th key={column} scope="col">{column}</th>)}</tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index}>
                    {Object.keys(users[0]).map((column) => (
                      <td key={column}>{user[column] == null ? '—' : String(user[column])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="deployment-message">
        <span className="status-dot" aria-hidden="true" />
        Successfully deployed with Cloudflare
      </p>
    </main>
  )
}

export default App
