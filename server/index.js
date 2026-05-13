import express from 'express'
import cors from 'cors'
import compression from 'compression'
import cron from 'node-cron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import apiRouter from './routes/api.js'
import { collectAll } from './routes/collector.js'
import { fixBase64Profiles } from './fix-profiles.js'
import db from './db/connection.js'
const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3002
app.use(compression())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
const CACHE_TTL = 8 * 60 * 60 * 1000
const cache = new Map()
function apiCache(req, res, next) {
  if (req.headers['x-admin-token']) return next()
  const key = req.originalUrl
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data)
  }
  const originalJson = res.json.bind(res)
  res.json = (data) => {
    cache.set(key, { data, time: Date.now() })
    return originalJson(data)
  }
  next()
}
export function clearApiCache() {
  cache.clear()
  console.log('[cache] 캐시 초기화')
}
app.use('/api/stats', api