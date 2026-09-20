import './App.css'

const technologies = ['React', 'Vite', 'Cloudflare Workers', 'GitHub']

function App() {
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

      <p className="deployment-message">
        <span className="status-dot" aria-hidden="true" />
        Successfully deployed with Cloudflare
      </p>
    </main>
  )
}

export default App
