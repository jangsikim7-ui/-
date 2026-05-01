import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join('/app/data', 'data.db')
const schemaPath = join(__dirname, 'schema.sql')

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

const schema = readFileSync(schemaPath, 'utf-8')
db.exec(schema)

// 마이그레이션: day 컬럼 없으면 추가
try {
  db.exec('ALTER TABLE balloon_snapshots ADD COLUMN day INTEGER NOT NULL DEFAULT 0')
  console.log('[db] balloon_snapshots.day 컬럼 추가됨')
} catch(e) { /* 이미 있으면 무시 */ }

// 마이그레이션 (컬럼 없으면 추가, 있으면 무시)
try { db.exec('ALTER TABLE balloon_snapshots ADD COLUMN daily_balloons INTEGER DEFAULT 0'); console.log('[db] daily_balloons 추가') } catch(e) {}
try { db.exec('ALTER TABLE members ADD COLUMN is_new INTEGER DEFAULT 0'); console.log('[db] is_new 추가') } catch(e) {}
try { db.exec('ALTER TABLE members ADD COLUMN profile_img TEXT DEFAULT ""'); console.log('[db] profile_img 추가') } catch(e) {}

// 마이그레이션: 중복 데이터 제거 (UNIQUE 인덱스 만들기 전에 필수)
try {
  db.exec(`
    DELETE FROM viewer_snapshots
    WHERE id NOT IN (
      SELECT MAX(id) FROM viewer_snapshots
      GROUP BY soop_id, year, month
    )
  `)
  console.log('[db] viewer_snapshots 중복 제거 완료')
} catch(e) { console.log('[db] viewer 중복 제거 실패:', e.message) }

try {
  db.exec(`
    DELETE FROM balloon_snapshots
    WHERE id NOT IN (
      SELECT MAX(id) FROM balloon_snapshots
      GROUP BY soop_id, year, month, day
    )
  `)
  console.log('[db] balloon_snapshots 중복 제거 완료')
} catch(e) { console.log('[db] balloon 중복 제거 실패:', e.message) }

// UNIQUE 인덱스 마이그레이션
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_balloon ON balloon_snapshots(soop_id, year, month, day)')
  console.log('[db] balloon UNIQUE 인덱스 추가')
} catch(e) { console.log('[db] balloon UNIQUE 실패:', e.message) }

try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_viewer ON viewer_snapshots(soop_id, year, month)')
  console.log('[db] viewer UNIQUE 인덱스 추가')
} catch(e) { console.log('[db] viewer UNIQUE 실패:', e.message) }

export default db