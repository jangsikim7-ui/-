// cleanup.js - 딱 한번만 실행하고 삭제하세요
import { DatabaseSync } from 'node:sqlite'
import { join } from 'path'

const db = new DatabaseSync(join('C:/Users/pc/Downloads/poong-synergy_15_1/poong-synergy/server', 'data.db'))
db.exec('PRAGMA journal_mode = WAL')

console.log('=== DB 정리 시작 ===')

// balloon_snapshots 중복 제거 (같은 soop_id, year, month, day 중 최신것만 남기기)
const beforeBalloon = db.prepare('SELECT COUNT(*) as cnt FROM balloon_snapshots').get()
console.log(`balloon_snapshots 정리 전: ${beforeBalloon.cnt}행`)

db.exec(`
  DELETE FROM balloon_snapshots
  WHERE id NOT IN (
    SELECT MAX(id) FROM balloon_snapshots
    GROUP BY soop_id, year, month, day
  )
`)

const afterBalloon = db.prepare('SELECT COUNT(*) as cnt FROM balloon_snapshots').get()
console.log(`balloon_snapshots 정리 후: ${afterBalloon.cnt}행`)

// viewer_snapshots 중복 제거
const beforeViewer = db.prepare('SELECT COUNT(*) as cnt FROM viewer_snapshots').get()
console.log(`viewer_snapshots 정리 전: ${beforeViewer.cnt}행`)

db.exec(`
  DELETE FROM viewer_snapshots
  WHERE id NOT IN (
    SELECT MAX(id) FROM viewer_snapshots
    GROUP BY soop_id, year, month
  )
`)

const afterViewer = db.prepare('SELECT COUNT(*) as cnt FROM viewer_snapshots').get()
console.log(`viewer_snapshots 정리 후: ${afterViewer.cnt}행`)

// UNIQUE 제약 추가 (이미 있으면 무시됨)
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_balloon ON balloon_snapshots(soop_id, year, month, day)')
  console.log('balloon UNIQUE 인덱스 추가 완료')
} catch(e) { console.log('balloon UNIQUE 이미 있음') }

try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_viewer ON viewer_snapshots(soop_id, year, month)')
  console.log('viewer UNIQUE 인덱스 추가 완료')
} catch(e) { console.log('viewer UNIQUE 이미 있음') }

// DB 크기 최적화
db.exec('VACUUM')
console.log('VACUUM 완료 (DB 크기 최적화)')

console.log('=== DB 정리 완료 ===')
db.close()
