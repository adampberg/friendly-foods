import { MongoClient } from 'mongodb'

const DEFAULT_DB = {
  users: [],
  profiles: [],
  savedRecipes: [],
  recipeCache: [],
  stats: { apiCalls: 0, cacheHits: 0 },
}

let cachedClient = null

async function getCollection() {
  if (!cachedClient) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set')
    }
    cachedClient = new MongoClient(process.env.MONGODB_URI)
    await cachedClient.connect()
  }
  return cachedClient.db('friendly-foods').collection('appdata')
}

export async function readDb() {
  const col = await getCollection()
  const doc = await col.findOne({ _id: 'main' })
  if (!doc) return { ...DEFAULT_DB }
  const { _id, ...data } = doc
  return {
    users: data.users ?? [],
    profiles: data.profiles ?? [],
    savedRecipes: data.savedRecipes ?? [],
    recipeCache: data.recipeCache ?? [],
    stats: data.stats ?? { apiCalls: 0, cacheHits: 0 },
  }
}

export async function writeDb(data) {
  const col = await getCollection()
  await col.replaceOne({ _id: 'main' }, { _id: 'main', ...data }, { upsert: true })
}
