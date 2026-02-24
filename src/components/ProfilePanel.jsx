import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext.jsx'
import './ProfilePanel.css'

export default function ProfilePanel({ avoidList, setAvoidList, onOpenAuth, onProfileSelect }) {
  const { user, token } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [activeProfileId, setActiveProfileId] = useState(null)
  const [activeProfileAllergens, setActiveProfileAllergens] = useState([])
  const [saving, setSaving] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [updating, setUpdating] = useState(false)

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const fetchProfiles = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setProfiles(data)
      }
    } catch {
      // silently ignore
    }
  }, [token])

  useEffect(() => {
    if (user) fetchProfiles()
    else {
      setProfiles([])
      setActiveProfileId(null)
      setActiveProfileAllergens([])
      onProfileSelect?.(null)
    }
  }, [user, fetchProfiles])

  const loadProfile = (profile) => {
    setAvoidList([...profile.allergens])
    setActiveProfileId(profile.id)
    setActiveProfileAllergens([...profile.allergens])
    onProfileSelect?.(profile.name)
  }

  const handleSaveNew = async () => {
    const name = newProfileName.trim()
    if (!name) return
    setSaving(true)
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, allergens: avoidList }),
      })
      if (res.ok) {
        const profile = await res.json()
        setProfiles(prev => [...prev, profile])
        setActiveProfileId(profile.id)
        setActiveProfileAllergens([...avoidList])
        setNewProfileName('')
        setShowNameInput(false)
      }
    } catch {
      // silently ignore
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!activeProfileId) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/profiles/${activeProfileId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ allergens: avoidList }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p))
        setActiveProfileAllergens([...avoidList])
      }
    } catch {
      // silently ignore
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (profileId, e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setProfiles(prev => prev.filter(p => p.id !== profileId))
        if (activeProfileId === profileId) {
          setActiveProfileId(null)
          setActiveProfileAllergens([])
          onProfileSelect?.(null)
        }
      }
    } catch {
      // silently ignore
    }
  }

  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const allergensDirty = activeProfileId && JSON.stringify([...avoidList].sort()) !== JSON.stringify([...activeProfileAllergens].sort())

  if (!user) {
    return (
      <div className="profile-panel profile-panel--logged-out">
        <span className="profile-panel-icon">👤</span>
        <button type="button" className="profile-signin-link" onClick={onOpenAuth}>
          Sign in to save your allergen profiles
        </button>
      </div>
    )
  }

  return (
    <div className="profile-panel">
      <div className="profile-panel-header">
        <span className="profile-panel-title">
          <span className="profile-panel-icon">📋</span>
          Your Allergen Profiles
        </span>
      </div>

      {profiles.length === 0 ? (
        <p className="profile-empty">No profiles yet. Add allergens above and save a profile.</p>
      ) : (
        <div className="profile-cards">
          {profiles.map(profile => (
            <button
              key={profile.id}
              type="button"
              className={`profile-card ${activeProfileId === profile.id ? 'active' : ''}`}
              onClick={() => loadProfile(profile)}
              title={`Load "${profile.name}" — ${profile.allergens.length} allergen${profile.allergens.length !== 1 ? 's' : ''}`}
            >
              <span className="profile-card-name">{profile.name}</span>
              <span className="profile-card-count">
                {profile.allergens.length} allergen{profile.allergens.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="profile-card-delete"
                onClick={(e) => handleDelete(profile.id, e)}
                aria-label={`Delete profile "${profile.name}"`}
              >
                ×
              </button>
            </button>
          ))}
        </div>
      )}

      <div className="profile-actions">
        {allergensDirty && activeProfile && (
          <button
            type="button"
            className="profile-btn profile-btn--update"
            onClick={handleUpdate}
            disabled={updating}
          >
            {updating ? 'Updating…' : `Update "${activeProfile.name}"`}
          </button>
        )}

        {showNameInput ? (
          <div className="profile-save-row">
            <input
              type="text"
              className="profile-name-input"
              placeholder="Profile name (e.g. My Profile)"
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleSaveNew() }
                if (e.key === 'Escape') { setShowNameInput(false); setNewProfileName('') }
              }}
              autoFocus
              maxLength={50}
            />
            <button
              type="button"
              className="profile-btn profile-btn--save"
              onClick={handleSaveNew}
              disabled={saving || !newProfileName.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="profile-btn profile-btn--cancel"
              onClick={() => { setShowNameInput(false); setNewProfileName('') }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="profile-btn profile-btn--new"
            onClick={() => setShowNameInput(true)}
          >
            + Save as New Profile
          </button>
        )}
      </div>
    </div>
  )
}
