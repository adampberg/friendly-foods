import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext.jsx'

export function useSavedRecipes() {
  const { user, token } = useAuth()
  const [saved, setSaved] = useState([])

  const fetchSaved = useCallback(async () => {
    if (!token) { setSaved([]); return }
    try {
      const res = await fetch('/api/saved-recipes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSaved(await res.json())
    } catch {}
  }, [token])

  // Reload whenever the logged-in user changes
  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  const saveRecipe = async (recipe, title) => {
    if (!token) return null
    try {
      const res = await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, recipe }),
      })
      if (res.ok) {
        const entry = await res.json()
        setSaved(prev => [entry, ...prev])
        return entry.id
      }
    } catch {}
    return null
  }

  const isRecipeSaved = (recipeTitle) =>
    saved.some(s => s.recipe.title === recipeTitle)

  const deleteRecipe = async (id) => {
    setSaved(prev => prev.filter(s => s.id !== id)) // optimistic
    try {
      await fetch(`/api/saved-recipes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }

  const renameRecipe = async (id, newTitle) => {
    setSaved(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s)) // optimistic
    try {
      await fetch(`/api/saved-recipes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      })
    } catch {}
  }

  return { saved, saveRecipe, isRecipeSaved, deleteRecipe, renameRecipe }
}
