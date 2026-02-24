import { useState } from 'react'
import './AdminPage.css'

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchStats = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Invalid admin token.')
        setStats(null)
      } else {
        setStats(await res.json())
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ Admin Dashboard</h1>
        <p>Friendly Foods — API cost tracking</p>
      </div>

      <form className="admin-token-form" onSubmit={fetchStats}>
        <input
          type="password"
          className="admin-token-input"
          placeholder="Admin token"
          value={token}
          onChange={e => setToken(e.target.value)}
          autoFocus
        />
        <button className="admin-token-btn" type="submit" disabled={!token || loading}>
          {loading ? 'Loading…' : 'View Stats'}
        </button>
      </form>

      {error && <p className="admin-error">{error}</p>}

      {stats && (
        <div className="admin-stats">
          <div className="stat-grid">
            <div className="stat-card stat-card--api">
              <span className="stat-value">{stats.apiCalls.toLocaleString()}</span>
              <span className="stat-label">API Calls</span>
            </div>
            <div className="stat-card stat-card--cache">
              <span className="stat-value">{stats.cacheHits.toLocaleString()}</span>
              <span className="stat-label">Cache Hits</span>
            </div>
            <div className="stat-card stat-card--total">
              <span className="stat-value">{stats.totalRequests.toLocaleString()}</span>
              <span className="stat-label">Total Requests</span>
            </div>
            <div className="stat-card stat-card--rate">
              <span className="stat-value">{stats.cacheHitRate}%</span>
              <span className="stat-label">Cache Hit Rate</span>
            </div>
            <div className="stat-card stat-card--entries">
              <span className="stat-value">{stats.cacheEntries.toLocaleString()}</span>
              <span className="stat-label">Cached Recipes</span>
            </div>
          </div>

          <div className="admin-section">
            <h2>All Cached Recipes</h2>
            {stats.allCached.length === 0 ? (
              <p className="admin-empty">No cached recipes yet.</p>
            ) : (
              <table className="cache-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Meal</th>
                    <th>Allergens avoided</th>
                    <th>Times served from cache</th>
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.allCached.map((entry, i) => (
                    <tr key={i}>
                      <td className="cache-rank">{i + 1}</td>
                      <td className="cache-meal">{entry.meal}</td>
                      <td className="cache-allergens">
                        {entry.allergens.length > 0 ? entry.allergens.join(', ') : <em>none</em>}
                      </td>
                      <td className="cache-hits">{entry.hitCount}</td>
                      <td className="cache-date">
                        {new Date(entry.updatedAt || entry.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button className="admin-refresh-btn" onClick={fetchStats.bind(null, { preventDefault: () => {} })}>
            ↻ Refresh
          </button>
        </div>
      )}
    </div>
  )
}
