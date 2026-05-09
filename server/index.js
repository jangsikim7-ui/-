import express from 'express'
import cors from 'cors'
import compression from 'compression'
import cron from 'node-cron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import apiRouter from './routes/api.js'
import { collectAll } from './routes/collector.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3002

app.use(compression())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// API 캐시 미들웨어 (8시간)
const CACHE_TTL = 8 * 60 * 60 * 1000 // 8시간
const cache = new Map()

function apiCache(req, res, next) {
  // 관리자 요청은 캐시 안 함
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

// 캐시 초기화 함수 (수집 후 호출)
export function clearApiCache() {
  cache.clear()
  console.log('[cache] 캐시 초기화')
}

app.use('/api/stats', apiCache)
app.use('/api/viewer-stats', apiCache)
app.use('/api/last-collected', apiCache)

app.use('/api', apiRouter)

// ❌ dist 서빙 제거 - Cloudflare Pages에서 서빙
// app.use(express.static(join(__dirname, '../dist')))
// app.get('*', (req, res) => { res.sendFile(join(__dirname, '../dist/index.html')) })

app.listen(PORT, () => {
  console.log(`✅ 서버 실행중: http://localhost:${PORT}`)
})

// 8시간마다 자동 수집 + 캐시 초기화
cron.schedule('0 */8 * * *', async () => {
  console.log('[cron] 8시간 자동 수집 시작')
  await collectAll().catch(console.error)
  clearApiCache()
})

// 서버 시작 시 즉시 1회 수집
console.log('[init] 초기 데이터 수집 시작...')
collectAll().catch(console.error)