import { useState } from 'react'
import RecipeDisplay from './RecipeDisplay.jsx'
import './MyRecipes.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MyRecipes({ saved, onDelete, onRename }) {
  const [selectedId, setSelectedId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const selected = saved.find(s => s.id === selectedId)

  const handleDelete = (id) => {
    setDeletingId(id)
    setTimeout(() => {
      onDelete(id)
      setDeletingId(null)
      if (selectedId === id) setSelectedId(null)
    }, 300)
  }

  const startRename = (entry, e) => {
    e.stopPropagation()
    setRenamingId(entry.id)
    setRenameValue(entry.title)
  }

  const commitRename = (id) => {
    if (renameValue.trim()) onRename(id, renameValue.trim())
    setRenamingId(null)
  }

  if (selected) {
    return (
      <div className="my-recipes-detail">
        <div className="my-recipes-detail-toolbar">
          <button className="back-btn" onClick={() => setSelectedId(null)}>
            ← Back to My Recipes
          </button>
          <div className="detail-toolbar-right">
            <span className="detail-saved-date">Saved {formatDate(selected.savedAt)}</span>
            <button
              className="detail-delete-btn"
              onClick={() => { handleDelete(selected.id); setSelectedId(null) }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
        <RecipeDisplay recipe={{ ...selected.recipe, title: selected.title }} />
      </div>
    )
  }

  return (
    <div className="my-recipes">
      <div className="my-recipes-header">
        <h2>My Saved Recipes</h2>
        <span className="my-recipes-count">
          {saved.length} {saved.length === 1 ? 'recipe' : 'recipes'}
        </span>
      </div>

      {saved.length === 0 ? (
        <div className="my-recipes-empty">
          <span className="my-recipes-empty-icon">📭</span>
          <h3>No saved recipes yet</h3>
          <p>Generate a recipe and click "Save Recipe" to keep it here for later.</p>
        </div>
      ) : (
        <div className="my-recipes-grid">
          {saved.map(entry => (
            <div
              key={entry.id}
              className={`recipe-saved-card ${deletingId === entry.id ? 'deleting' : ''}`}
            >
              <button
                className="recipe-saved-card-body"
                onClick={() => renamingId !== entry.id && setSelectedId(entry.id)}
              >
                {renamingId === entry.id ? (
                  <input
                    className="rename-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.stopPropagation(); commitRename(entry.id) }
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => commitRename(entry.id)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    maxLength={80}
                  />
                ) : (
                  <span className="recipe-saved-card-title">{entry.title}</span>
                )}
                <span className="recipe-saved-card-meta">
                  {entry.recipe.ingredients?.length ?? 0} ingredients · Saved {formatDate(entry.savedAt)}
                </span>
              </button>
              <div className="recipe-saved-card-actions">
                <button
                  className="card-action-btn card-rename-btn"
                  onClick={(e) => startRename(entry, e)}
                  title="Rename"
                  aria-label="Rename recipe"
                >
                  ✏️
                </button>
                <button
                  className="card-action-btn card-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                  title="Delete"
                  aria-label="Delete recipe"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
