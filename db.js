import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data.json')
const DEFAULT_DB = { users: [], profiles: [], savedRecipes: [], recipeCache: [], stats: { apiCalls: 0, cacheHits: 0 } }

export function readDb() {
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2))
    return { ...DEFAULT_DB, users: [], profiles: [] }
  }
  try {
    const data = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
    return {
      users: data.users ?? [],
      profiles: data.profiles ?? [],
      savedRecipes: data.savedRecipes ?? [],
      recipeCache: data.recipeCache ?? [],
      stats: data.stats ?? { apiCalls: 0, cacheHits: 0 },
    }
  } catch {
    return { users: [], profiles: [], savedRecipes: [], recipeCache: [], stats: { apiCalls: 0, cacheHits: 0 } }
  }
}

export function writeDb(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}
