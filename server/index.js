import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import apiRouter from './routes/api.js'
import { collectAll } from './routes/collector.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/api', apiRouter)
app.use(express.static(join(__dirname, '../dist')))
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`✅ 서버 실행중: http://localhost:${PORT}`)
})

// 8시간마다 자동 수집
cron.schedule('0 */8 * * *', () => {
  console.log('[cron] 8시간 자동 수집 시작')
  collectAll().catch(console.error)
})

// 서버 시작 시 즉시 1회 수집
console.log('[init] 초기 데이터 수집 시작...')
collectAll().catch(console.error)