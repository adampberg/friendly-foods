import { useState } from 'react'
import './PasswordGate.css'

const STORAGE_KEY = 'ff_access'
const CORRECT_PASSWORD = 'hayesfriendly'

export default function PasswordGate({ children }) {
  const [granted, setGranted] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (granted) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1')
      setGranted(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="pg-screen">
      <div className="pg-card">
        <span className="pg-logo">😋</span>
        <h1 className="pg-title">Friendly Foods</h1>
        <p className="pg-subtitle">Enter the password to continue</p>

        <form onSubmit={handleSubmit} className="pg-form" noValidate>
          <div className="pg-field">
            <label htmlFor="pg-password">Password</label>
            <input
              id="pg-password"
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false) }}
              placeholder="Enter password"
              autoFocus
              autoComplete="current-password"
              className={error ? 'pg-input-error' : ''}
            />
            {error && <p className="pg-error">Incorrect password. Please try again.</p>}
          </div>
          <button type="submit" className="pg-submit">
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
