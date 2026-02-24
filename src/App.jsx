import { useState } from 'react'
import Header from './components/Header.jsx'
import RecipeForm from './components/RecipeForm.jsx'
import RecipeDisplay from './components/RecipeDisplay.jsx'
import AuthModal from './components/AuthModal.jsx'
import SaveRecipeModal from './components/SaveRecipeModal.jsx'
import MyRecipes from './components/MyRecipes.jsx'
import AdminPage from './components/AdminPage.jsx'
import { useSavedRecipes } from './hooks/useSavedRecipes.js'
import { useAuth } from './AuthContext.jsx'
import './App.css'

const IS_ADMIN = window.location.search.includes('admin')

export default function App() {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastMeal, setLastMeal] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [activeTab, setActiveTab] = useState('generator')
  const [recipeFromCache, setRecipeFromCache] = useState(false)
  const [lastAvoidList, setLastAvoidList] = useState([])

  const { user } = useAuth()
  const { saved, saveRecipe, isRecipeSaved, deleteRecipe, renameRecipe } = useSavedRecipes()
  const [activeProfileName, setActiveProfileName] = useState(null)

  const handleGenerate = async (meal, avoidList) => {
    setLoading(true)
    setError(null)
    setRecipe(null)
    setLastMeal(meal)
    setLastAvoidList(avoidList)

    try {
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, avoidList }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      const { _fromCache, ...recipeData } = data
      setRecipe(recipeData)
      setRecipeFromCache(_fromCache ?? false)

      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('recipe-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal: lastMeal, avoidList: lastAvoidList, force: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      const { _fromCache, ...recipeData } = data
      setRecipe(recipeData)
      setRecipeFromCache(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  // If not logged in, open auth modal instead of save modal
  const handleSaveClick = () => {
    if (!user) {
      setShowAuthModal(true)
    } else {
      setShowSaveModal(true)
    }
  }

  if (IS_ADMIN) return <AdminPage />

  return (
    <div className="app">
      <Header onOpenAuth={() => setShowAuthModal(true)} />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showSaveModal && recipe && (
        <SaveRecipeModal
          recipe={recipe}
          defaultTitle={defaultSaveTitle}
          onSave={handleSaveRecipe}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      <nav className="app-nav">
        <div className="app-nav-inner">
          <button
            className={`nav-tab ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            Recipe Generator
          </button>
          <button
            className={`nav-tab ${activeTab === 'my-recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-recipes')}
          >
            My Recipes
            {saved.length > 0 && <span className="nav-badge">{saved.length}</span>}
          </button>
        </div>
      </nav>

      <main className="main">
        {activeTab === 'generator' ? (
          <>
            <RecipeForm onGenerate={handleGenerate} loading={loading} onOpenAuth={() => setShowAuthModal(true)} onProfileSelect={setActiveProfileName} />

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
                    <span>🥕</span><span>🫐</span><span>🌿</span><span>🍋</span>
                  </div>
                </div>
                <h3>Crafting your friendly recipe&hellip;</h3>
                <p>Finding safe ingredients and perfect substitutions for <strong>{lastMeal}</strong></p>
              </div>
            )}

            {recipe && !loading && (
              <div id="recipe-result">
                <RecipeDisplay
                  recipe={recipe}
                  onSave={handleSaveClick}
                  alreadySaved={isRecipeSaved(recipe.title)}
                  isLoggedIn={!!user}
                  fromCache={recipeFromCache}
                  onForceRefresh={handleForceRefresh}
                />
              </div>
            )}
          </>
        ) : (
          <MyRecipes
            saved={saved}
            onDelete={deleteRecipe}
            onRename={renameRecipe}
          />
        )}
      </main>

      <footer className="footer">
        <p>ALWAYS check labels for allergens and double check for possible cross contamination.</p>
      </footer>
    </div>
  )
}
