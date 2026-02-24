import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readDb, writeDb } from './db.js'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me'

app.use(cors())
app.use(express.json())

// Serve built frontend in production
app.use(express.static(join(__dirname, 'dist')))

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ─── Auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  const db = readDb()
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id: randomUUID(),
    username: username.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  writeDb(db)

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const db = readDb()
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  })
})

// ─── Profile routes ────────────────────────────────────────────────────────────

app.get('/api/profiles', requireAuth, (req, res) => {
  const db = readDb()
  const profiles = db.profiles.filter(p => p.userId === req.userId)
  res.json(profiles)
})

app.post('/api/profiles', requireAuth, (req, res) => {
  const { name, allergens } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Profile name is required.' })
  }

  const db = readDb()
  const profile = {
    id: randomUUID(),
    userId: req.userId,
    name: name.trim(),
    allergens: Array.isArray(allergens) ? allergens : [],
    createdAt: new Date().toISOString(),
  }
  db.profiles.push(profile)
  writeDb(db)
  res.status(201).json(profile)
})

app.put('/api/profiles/:id', requireAuth, (req, res) => {
  const { name, allergens } = req.body
  const db = readDb()
  const idx = db.profiles.findIndex(p => p.id === req.params.id && p.userId === req.userId)
  if (idx === -1) {
    return res.status(404).json({ error: 'Profile not found.' })
  }
  if (name !== undefined) db.profiles[idx].name = name.trim()
  if (allergens !== undefined) db.profiles[idx].allergens = Array.isArray(allergens) ? allergens : []
  db.profiles[idx].updatedAt = new Date().toISOString()
  writeDb(db)
  res.json(db.profiles[idx])
})

app.delete('/api/profiles/:id', requireAuth, (req, res) => {
  const db = readDb()
  const idx = db.profiles.findIndex(p => p.id === req.params.id && p.userId === req.userId)
  if (idx === -1) {
    return res.status(404).json({ error: 'Profile not found.' })
  }
  db.profiles.splice(idx, 1)
  writeDb(db)
  res.json({ ok: true })
})

// ─── Saved recipes routes ──────────────────────────────────────────────────────

app.get('/api/saved-recipes', requireAuth, (req, res) => {
  const db = readDb()
  const recipes = db.savedRecipes
    .filter(r => r.userId === req.userId)
    .map(({ userId, ...rest }) => rest)   // strip userId before sending
  res.json(recipes)
})

app.post('/api/saved-recipes', requireAuth, (req, res) => {
  const { title, recipe } = req.body
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' })
  }
  if (!recipe || typeof recipe !== 'object') {
    return res.status(400).json({ error: 'Recipe data is required.' })
  }

  const db = readDb()
  const entry = {
    id: randomUUID(),
    userId: req.userId,
    title: title.trim(),
    savedAt: new Date().toISOString(),
    recipe,
  }
  db.savedRecipes.push(entry)
  writeDb(db)

  const { userId, ...response } = entry
  res.status(201).json(response)
})

app.put('/api/saved-recipes/:id', requireAuth, (req, res) => {
  const { title } = req.body
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' })
  }

  const db = readDb()
  const idx = db.savedRecipes.findIndex(r => r.id === req.params.id && r.userId === req.userId)
  if (idx === -1) {
    return res.status(404).json({ error: 'Saved recipe not found.' })
  }

  db.savedRecipes[idx].title = title.trim()
  db.savedRecipes[idx].updatedAt = new Date().toISOString()
  writeDb(db)

  const { userId, ...response } = db.savedRecipes[idx]
  res.json(response)
})

app.delete('/api/saved-recipes/:id', requireAuth, (req, res) => {
  const db = readDb()
  const idx = db.savedRecipes.findIndex(r => r.id === req.params.id && r.userId === req.userId)
  if (idx === -1) {
    return res.status(404).json({ error: 'Saved recipe not found.' })
  }
  db.savedRecipes.splice(idx, 1)
  writeDb(db)
  res.json({ ok: true })
})

// ─── Recipe cache helpers ──────────────────────────────────────────────────────

function makeCacheKey(meal, allergens) {
  const normalizedMeal = meal.trim().toLowerCase()
  const sortedAllergens = (allergens || []).map(a => a.trim().toLowerCase()).sort().join(',')
  return `${normalizedMeal}|${sortedAllergens}`
}

// ─── Recipe route ──────────────────────────────────────────────────────────────

app.post('/api/recipe', async (req, res) => {
  const { meal, avoidList, force } = req.body

  if (!meal || !meal.trim()) {
    return res.status(400).json({ error: 'Meal name is required.' })
  }

  const cacheKey = makeCacheKey(meal, avoidList)

  // Check cache unless force-refresh was requested
  if (!force) {
    const db = readDb()
    const cached = db.recipeCache.find(c => c.cacheKey === cacheKey)
    if (cached) {
      cached.hitCount = (cached.hitCount || 0) + 1
      db.stats.cacheHits = (db.stats.cacheHits || 0) + 1
      writeDb(db)
      console.log(`Cache hit: "${meal}"`)
      return res.json({ ...cached.recipe, _fromCache: true })
    }
  }

  // Cache miss (or forced) — call the API
  const avoidText = avoidList && avoidList.length > 0 ? avoidList.join(', ') : 'none'

  const prompt = `You are a helpful recipe assistant specializing in allergy-friendly cooking.

The user wants to make: "${meal}"
Ingredients/allergens to AVOID: ${avoidText}

Please create a detailed, allergy-friendly recipe. Respond with valid JSON in exactly this format:
{
  "title": "Recipe title",
  "servings": "e.g. 4 servings",
  "prepTime": "e.g. 15 minutes",
  "cookTime": "e.g. 30 minutes",
  "ingredients": [
    { "amount": "1 cup", "item": "ingredient name" }
  ],
  "instructions": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "substitutions": [
    { "original": "butter", "substitute": "coconut oil", "reason": "dairy-free alternative that works well for baking" }
  ],
  "allergenNote": "A brief paragraph confirming this recipe is free from the listed allergens and any general safety tips."
}

Important rules:
- Do NOT include any of the avoided ingredients or anything derived from them
- Make thoughtful substitutions that preserve the dish's flavor and texture as much as possible
- Only include substitutions that were actually made (if none were needed, use an empty array)
- Keep instructions clear and beginner-friendly
- Return ONLY the JSON object, no markdown, no extra text`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].text.trim()

    // Strip markdown code fences if Claude included them despite instructions
    const content = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const recipe = JSON.parse(content)

    // Save/update cache entry and increment API call counter
    const db = readDb()
    const existingIdx = db.recipeCache.findIndex(c => c.cacheKey === cacheKey)
    const entry = {
      id: existingIdx >= 0 ? db.recipeCache[existingIdx].id : randomUUID(),
      cacheKey,
      meal: meal.trim(),
      allergens: avoidList || [],
      recipe,
      createdAt: existingIdx >= 0 ? db.recipeCache[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hitCount: existingIdx >= 0 ? (db.recipeCache[existingIdx].hitCount || 0) : 0,
    }
    if (existingIdx >= 0) {
      db.recipeCache[existingIdx] = entry
    } else {
      db.recipeCache.push(entry)
    }
    db.stats.apiCalls = (db.stats.apiCalls || 0) + 1
    writeDb(db)

    console.log(`API call: "${meal}" — cache now has ${db.recipeCache.length} entries`)
    res.json({ ...recipe, _fromCache: false })
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error('Failed to parse Claude response as JSON:', err.message)
      return res.status(500).json({ error: 'Received an unexpected response format. Please try again.' })
    }
    console.error('Anthropic API error:', err)
    const status = err.status || 500
    const message = err.message || 'Failed to generate recipe. Please try again.'
    res.status(status).json({ error: message })
  }
})

// ─── Admin routes ──────────────────────────────────────────────────────────────

app.get('/api/admin/stats', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN
  const auth = req.headers.authorization
  if (!adminToken || auth !== `Bearer ${adminToken}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = readDb()
  const apiCalls = db.stats?.apiCalls ?? 0
  const cacheHits = db.stats?.cacheHits ?? 0
  const total = apiCalls + cacheHits

  res.json({
    apiCalls,
    cacheHits,
    totalRequests: total,
    cacheHitRate: total > 0 ? Math.round(cacheHits / total * 100) : 0,
    cacheEntries: db.recipeCache?.length ?? 0,
    allCached: [...(db.recipeCache || [])]
      .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0))
      .map(({ meal, allergens, hitCount, createdAt, updatedAt }) => ({ meal, allergens, hitCount, createdAt, updatedAt })),
  })
})

// Fallback to index.html for SPA routing in production
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Friendly Foods server running on http://localhost:${PORT}`)
})
