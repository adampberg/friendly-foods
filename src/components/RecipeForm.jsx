import { useState, useRef, useCallback } from 'react'
import './RecipeForm.css'
import ProfilePanel from './ProfilePanel.jsx'

const COMMON_ALLERGENS = [
  { label: 'Dairy' },
  { label: 'Gluten' },
  { label: 'Nuts' },
  { label: 'Eggs' },
  { label: 'Soy' },
  { label: 'Shellfish' },
  { label: 'Fish' },
  { label: 'Sesame' },
]

export default function RecipeForm({ onGenerate, loading, onOpenAuth, onProfileSelect }) {
  const [meal, setMeal] = useState('')
  const [avoidList, setAvoidList] = useState([])
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef(null)

  const addTag = useCallback((value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const lower = trimmed.toLowerCase()
    if (!avoidList.some(t => t.toLowerCase() === lower)) {
      setAvoidList(prev => [...prev, trimmed])
    }
    setTagInput('')
    tagInputRef.current?.focus()
  }, [avoidList])

  const removeTag = useCallback((index) => {
    setAvoidList(prev => prev.filter((_, i) => i !== index))
  }, [])

  const toggleAllergen = useCallback((label) => {
    const lower = label.toLowerCase()
    const existing = avoidList.find(t => t.toLowerCase() === lower)
    if (existing) {
      setAvoidList(prev => prev.filter(t => t.toLowerCase() !== lower))
    } else {
      setAvoidList(prev => [...prev, label])
    }
  }, [avoidList])

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && avoidList.length > 0) {
      setAvoidList(prev => prev.slice(0, -1))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (tagInput.trim()) addTag(tagInput)
    if (!meal.trim()) return
    onGenerate(meal.trim(), avoidList)
  }

  const isAllergenActive = (label) =>
    avoidList.some(t => t.toLowerCase() === label.toLowerCase())

  const canSubmit = meal.trim().length > 0 && !loading

  return (
    <div className="form-card">
      <div className="form-header">
        <h2>What would you like to cook?</h2>
        <p>Tell us your meal idea and any ingredients or allergens to avoid — we'll create a safe, delicious recipe.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Meal input */}
        <div className="field-group">
          <label className="field-label" htmlFor="meal-input">
            <span className="label-icon">🍽️</span>
            Meal or dish name
          </label>
          <input
            id="meal-input"
            className="meal-input"
            type="text"
            placeholder="e.g. chocolate chip cookies, chicken stir fry, pasta carbonara…"
            value={meal}
            onChange={e => setMeal(e.target.value)}
            disabled={loading}
            autoComplete="off"
            autoFocus
            maxLength={120}
          />
        </div>

        {/* Custom avoid tags + Quick allergen buttons — side by side */}
        <div className="avoid-row">
          <div className="field-group">
            <label className="field-label" htmlFor="tag-input">
              <span className="label-icon">🚫</span>
              Ingredients or allergens to avoid
              <span className="field-hint">Press Enter or comma to add</span>
            </label>
            <div className={`tags-input-wrapper ${loading ? 'disabled' : ''}`} onClick={() => tagInputRef.current?.focus()}>
              {avoidList.map((tag, i) => (
                <span key={i} className="tag">
                  {tag}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={e => { e.stopPropagation(); removeTag(i) }}
                    disabled={loading}
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                id="tag-input"
                className="tag-text-input"
                type="text"
                placeholder={avoidList.length === 0 ? 'Type an ingredient or allergen…' : 'Add another…'}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            {avoidList.length === 0 && (
              <p className="tags-empty-hint">Nothing to avoid yet. Add items above or type custom ones here.</p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">⚠️</span>
              Common allergens — click to avoid
            </label>
            <div className="allergen-pills">
              {COMMON_ALLERGENS.map(({ label }) => (
                <button
                  key={label}
                  type="button"
                  className={`allergen-pill ${isAllergenActive(label) ? 'active' : ''}`}
                  onClick={() => toggleAllergen(label)}
                  disabled={loading}
                  aria-pressed={isAllergenActive(label)}
                >
                  {label}
                  {isAllergenActive(label) && <span className="pill-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Allergen profile section */}
        <ProfilePanel avoidList={avoidList} setAvoidList={setAvoidList} onOpenAuth={onOpenAuth} onProfileSelect={onProfileSelect} />

        {/* Submit */}
        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              Generating Recipe…
            </>
          ) : (
            <>
              <span>🌿</span>
              Find a Friendly Recipe
            </>
          )}
        </button>
      </form>
    </div>
  )
}
