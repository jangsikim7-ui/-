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
app.use('/api/stats', apiCache)
app.use('/api/viewer-stats', apiCache)
app.use('/api/last-collected', apiCache)
app.use('/api', apiRouter)
try {
  const members = db.prepare('SELECT id, name FROM members').all()
  const update = db.prepare('UPDATE members SET name=? WHERE id=?')
  let count = 0
  for (const m of members) {
    const cleaned = m.name
      .replace(/^[🥇🥈🥉]\s*/, '')
      .replace(/^[\u25C6\u25C7\u2666\u2662\u25C8\u25A0\u25A1\u25B2\u25B3\u25B6\u25B7\u25CF\u25CB\u2605\u2606\u2726\u2727\u203B]+\s*/, '')
      .trim()
    if (cleaned !== m.name) {
      update.run(cleaned, m.id)
      console.log('[migration] ' + m.name + ' -> ' + cleaned)
      count++
    }
  }
  if (count > 0) console.log('[migration] 총 ' + count + '명 이름 정리 완료')
} catch(e) {
  console.log('[migration] 오류:', e.message)
}
app.listen(PORT, () => {
  console.log('서버 실행중: http://localhost:' + PORT)
  fixBase64Profiles()
})
cron.schedule('0 */8 * * *', async () => {
  console.log('[cron] 8시간 자동 수집 시작')
  await collectAll().catch(console.error)
  clearApiCache()
})
console.log('[init] 초기 데이터 수집 시작...')
collectAll().catch(console.error)