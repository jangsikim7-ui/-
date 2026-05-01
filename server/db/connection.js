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

export default db
