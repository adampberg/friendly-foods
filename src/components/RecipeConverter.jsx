import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../AuthContext.jsx'
import './RecipeForm.css'
import './RecipeConverter.css'
import ProfilePanel from './ProfilePanel.jsx'
import RecipeDisplay from './RecipeDisplay.jsx'
import SaveRecipeModal from './SaveRecipeModal.jsx'

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

export default function RecipeConverter({ onOpenAuth, saveRecipe, isRecipeSaved }) {
  const { user } = useAuth()

  const [recipeText, setRecipeText] = useState('')
  const [avoidList, setAvoidList] = useState([])
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef(null)

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [activeProfileName, setActiveProfileName] = useState(null)

  // Saved refs for force-refresh
  const [lastRecipeText, setLastRecipeText] = useState('')
  const [lastAvoidList, setLastAvoidList] = useState([])

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

  const isAllergenActive = (label) =>
    avoidList.some(t => t.toLowerCase() === label.toLowerCase())

  const extractErrorMessage = async (res) => {
    try {
      const data = await res.json()
      return data.error || `Server error (${res.status})`
    } catch {
      try {
        const text = await res.text()
        console.error('Non-JSON error response:', text.slice(0, 300))
      } catch {}
      return `Server error (${res.status}). Please try again.`
    }
  }

  const readRecipeStream = async (res) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) throw new Error(data.error)
          if (data.done) return { recipe: data.recipe, _fromCache: data._fromCache ?? false }
        } catch (e) {
          if (e.message && !e.message.startsWith('JSON')) throw e
        }
      }
    }

    throw new Error('Connection closed before a recipe was returned. Please try again.')
  }

  const doConvert = async (text, allergens, force) => {
    const res = await fetch('/api/convert-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeText: text, avoidList: allergens, force }),
    })
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res))
    }
    return readRecipeStream(res)
  }

  const handleConvert = async (e) => {
    e.preventDefault()
    if (tagInput.trim()) addTag(tagInput)
    if (!recipeText.trim()) return

    const text = recipeText.trim()
    const allergens = avoidList

    setLoading(true)
    setError(null)
    setRecipe(null)
    setLastRecipeText(text)
    setLastAvoidList(allergens)

    try {
      const { recipe: recipeData, _fromCache } = await doConvert(text, allergens, false)
      setRecipe(recipeData)
      setFromCache(_fromCache)

      setTimeout(() => {
        document.getElementById('converter-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForceRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const { recipe: recipeData } = await doConvert(lastRecipeText, lastAvoidList, true)
      setRecipe(recipeData)
      setFromCache(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveClick = () => {
    if (!user) {
      onOpenAuth()
    } else {
      setShowSaveModal(true)
    }
  }

  const handleSaveRecipe = (title) => {
    saveRecipe(recipe, title)
  }

  const cleanRecipeTitle = recipe?.title?.replace(/^Allergy-Friendly\s+/i, '') ?? ''
  const defaultSaveTitle = recipe
    ? activeProfileName
      ? `${activeProfileName} Friendly ${cleanRecipeTitle}`
      : recipe.title
    : ''

  const canSubmit = recipeText.trim().length > 0 && !loading

  return (
    <div>
      {showSaveModal && recipe && (
        <SaveRecipeModal
          recipe={recipe}
          defaultTitle={defaultSaveTitle}
          onSave={handleSaveRecipe}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      <div className="form-card">
        <div className="form-header">
          <h2>Convert a Recipe</h2>
          <p>Paste or type in your full recipe and select allergens to avoid — we'll swap out any problem ingredients with safe, delicious alternatives.</p>
        </div>

        <form onSubmit={handleConvert} noValidate>
          {/* Recipe textarea */}
          <div className="field-group">
            <label className="field-label" htmlFor="recipe-text-input">
              <span className="label-icon">📋</span>
              Your recipe
            </label>
            <textarea
              id="recipe-text-input"
              className="converter-textarea"
              placeholder={`Paste or type your full recipe here — include the recipe name, ingredients with amounts, and step-by-step instructions…\n\nExample:\nClassic Chocolate Chip Cookies\n\nIngredients:\n2 cups all-purpose flour\n1 cup butter\n2 eggs\n...\n\nInstructions:\n1. Preheat oven to 375°F\n...`}
              value={recipeText}
              onChange={e => setRecipeText(e.target.value)}
              disabled={loading}
              rows={10}
            />
          </div>

          {/* Allergens — side by side */}
          <div className="avoid-row">
            <div className="field-group">
              <label className="field-label" htmlFor="converter-tag-input">
                <span className="label-icon">🚫</span>
                Allergens to avoid
                <span className="field-hint">Press Enter or comma to add</span>
              </label>
              <div
                className={`tags-input-wrapper ${loading ? 'disabled' : ''}`}
                onClick={() => tagInputRef.current?.focus()}
              >
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
                  id="converter-tag-input"
                  className="tag-text-input"
                  type="text"
                  placeholder={avoidList.length === 0 ? 'Type an allergen…' : 'Add another…'}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              {avoidList.length === 0 && (
                <p className="tags-empty-hint">Nothing to avoid yet — add allergens above or use the quick buttons.</p>
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

          {/* Allergen profile */}
          <ProfilePanel
            avoidList={avoidList}
            setAvoidList={setAvoidList}
            onOpenAuth={onOpenAuth}
            onProfileSelect={setActiveProfileName}
          />

          {/* Submit */}
          <button type="submit" className="submit-btn" disabled={!canSubmit}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Converting Recipe…
              </>
            ) : (
              <>
                <span>🔄</span>
                Convert Recipe
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="loading-card" aria-live="polite">
          <div className="loading-animation">
            <div className="spinner"></div>
            <div className="loading-icons">
              <span>🔄</span><span>🌿</span><span>✨</span><span>🍽️</span>
            </div>
          </div>
          <h3>Converting your recipe&hellip;</h3>
          <p>Finding safe substitutes and adapting the instructions</p>
        </div>
      )}

      {recipe && !loading && (
        <div id="converter-result">
          <RecipeDisplay
            recipe={recipe}
            onSave={handleSaveClick}
            alreadySaved={isRecipeSaved(recipe.title)}
            isLoggedIn={!!user}
            fromCache={fromCache}
            onForceRefresh={handleForceRefresh}
          />
        </div>
      )}
    </div>
  )
}
