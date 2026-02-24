import { useState, useEffect } from 'react'
import './SaveRecipeModal.css'

export default function SaveRecipeModal({ recipe, defaultTitle, onSave, onClose }) {
  const [title, setTitle] = useState(defaultTitle ?? recipe.title)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!title.trim()) return
    onSave(title.trim())
    setSaved(true)
    setTimeout(onClose, 1400)
  }

  return (
    <div className="save-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="save-modal" role="dialog" aria-modal="true" aria-label="Save recipe">
        {saved ? (
          <div className="save-success">
            <div className="save-success-icon">✓</div>
            <p>Recipe saved!</p>
          </div>
        ) : (
          <>
            <button className="save-close" onClick={onClose} aria-label="Close">×</button>
            <div className="save-header">
              <span className="save-modal-icon">💾</span>
              <h2>Save Recipe</h2>
              <p>Give this recipe a name — you can rename it any time from My Recipes.</p>
            </div>
            <div className="save-field">
              <label htmlFor="recipe-title-input">Recipe name</label>
              <input
                id="recipe-title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                maxLength={80}
                autoFocus
                autoComplete="off"
              />
            </div>
            <div className="save-actions">
              <button className="save-cancel-btn" type="button" onClick={onClose}>Cancel</button>
              <button className="save-confirm-btn" type="button" onClick={handleSave} disabled={!title.trim()}>
                Save Recipe
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
