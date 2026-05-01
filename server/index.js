import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import apiRouter, { autoImportNaksoo } from './routes/api.js'
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
// 1시간마다 자동 수집 (매시 정각)
cron.schedule('0 * * * *', () => {
  console.log('[cron] 1시간 자동 수집 시작')
  collectAll().catch(console.error)
})
// 서버 시작 시 즉시 1회 수집
console.log('[init] 초기 데이터 수집 시작...')
collectAll().catch(console.error)
// 서버 시작 시 낙수표 자동 임포트 (없는 크루/멤버만 추가)
autoImportNaksoo().catch(console.error)
// 6시간마다 naksoo 자동 동기화 (멤버 변동 체크용 - 자주 안 해도 됨)
cron.schedule('0 */6 * * *', () => {
  console.log('[cron] naksoo 자동 동기화 시작')
  autoImportNaksoo().catch(console.error)
})
