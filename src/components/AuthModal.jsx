import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext.jsx'
import './AuthModal.css'

export default function AuthModal({ onClose }) {
  const { login } = useAuth()
  const [tab, setTab] = useState('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Sign in fields
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Create account fields
  const [caUsername, setCaUsername] = useState('')
  const [caEmail, setCaEmail] = useState('')
  const [caPassword, setCaPassword] = useState('')

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: siEmail, password: siPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sign in failed.')
      login(data.user, data.token)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: caUsername, email: caEmail, password: caPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed.')
      login(data.user, data.token)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t) => {
    setTab(t)
    setError('')
  }

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in or create account">
        <button className="auth-close" onClick={onClose} aria-label="Close">×</button>

        <div className="auth-header">
          <span className="auth-logo">🥗</span>
          <h2>Welcome to Friendly Foods</h2>
          <p>Save your allergen profiles and load them instantly on every visit.</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => switchTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="si-email">Email</label>
              <input
                id="si-email"
                type="email"
                value={siEmail}
                onChange={e => setSiEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label htmlFor="si-password">Password</label>
              <input
                id="si-password"
                type="password"
                value={siPassword}
                onChange={e => setSiPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="auth-switch">
              No account?{' '}
              <button type="button" className="auth-link" onClick={() => switchTab('register')}>
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="ca-username">Username</label>
              <input
                id="ca-username"
                type="text"
                value={caUsername}
                onChange={e => setCaUsername(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label htmlFor="ca-email">Email</label>
              <input
                id="ca-email"
                type="email"
                value={caEmail}
                onChange={e => setCaEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="ca-password">Password</label>
              <input
                id="ca-password"
                type="password"
                value={caPassword}
                onChange={e => setCaPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => switchTab('signin')}>
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
