import { Router } from 'express'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { clearApiCache } from '../index.js'
const __dirname = dirname(fileURLToPath(import.meta.url))
import db from '../db/connection.js'
import { collectAll, fetchMonthlyAll } from './collector.js'

const router = Router()

// 멤버 이름 앞 특수기호 제거 마이그레이션 (비활성 중복 정리 포함)
;(function migrateNames() {
  try {
    const members = db.prepare('SELECT id, name, is_active FROM members').all()
    const update = db.prepare('UPDATE members SET name=? WHERE id=?')
    const del = db.prepare('DELETE FROM members WHERE id=?')
    let count = 0, removed = 0
    for (const m of members) {
      const cleaned = m.name
        .replace(/^[\u{1F947}\u{1F948}\u{1F949}]\s*/u, '')
        .replace(/^[\u25C6\u25C7\u2666\u2662\u25C8\u25A0\u25A1\u25B2\u25B3\u25B6\u25B7\u25CF\u25CB\u2605\u2606\u2726\u2727\u203B]+\s*/, '')
        .trim()
      if (cleaned !== m.name) {
        const dupe = db.prepare('SELECT id, is_active FROM members WHERE name=? AND id<>?').get(cleaned, m.id)
        if (dupe && m.is_active === 0) {
          del.run(m.id)
          removed++
          console.log('[migration] DELETE dup ' + JSON.stringify(m.name))
        } else {
          update.run(cleaned, m.id)
          console.log('[migration] ' + JSON.stringify(m.name) + ' -> ' + JSON.stringify(cleaned))
          count++
        }
      }
    }
    console.log('[migration] 완료: 변경 ' + count + '명, 중복삭제 ' + removed + '명')
  } catch(e) {
    console.log('[migration] 오류: ' + e.message)
  }
})()

const POONG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://poong.today/'
}

function soopCdnUrl(soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

async function fetchSoopInfo(soopId) {
  try {
    const res = await fetch(`https://chapi.sooplive.co.kr/api/${soopId}/station`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.sooplive.co.kr/', 'Origin': 'https://www.sooplive.co.kr' }
    })
    if (!res.ok) { console.log(`[soopInfo] ${soopId} HTTP ${res.status}`); return null }
    const data = await res.json()
    const station = data?.station
    if (!station) { console.log(`[soopInfo] ${soopId} station 없음`); return null }
    const profile_img =
      station.profile_img ||
      station.user_img ||
      station.profile_image ||
      station.station_logo ||
      station.user_id_logo ||
      soopCdnUrl(soopId)
    return { nickname: station.user_nick || null, profile_img }
  } catch(e) { console.log(`[soopInfo] ${soopId} 오류:`, e.message); return null }
}

async function fetchNickname(soopId) {
  const info = await fetchSoopInfo(soopId)
  return info?.nickname || null
}

// ── 관리자 인증 ───────────────────────────────────────
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'poong2026'

function adminOnly(req, res, next) {
  const token = req.headers['x-admin-token']
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '관리자 권한이 필요합니다' })
  }
  next()
}

// ── yxlinfo 데이터 ────────────────────────────────────
function cleanMemberName(raw) {
  return raw
    .replace(/^[🥇🥈🥉]\s*/, '')
    .replace(/^[◆◇♦♢■□▲△▶▷●○★☆✦✧※◈]\s*/, '')
    .replace(/^\s+/, '')
    .trim()
}

// ⭐ 이름 정규화
function normalizeName(name) {
  if (!name) return ''
  return name
    .normalize('NFC')
    // 전각→반각
    .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    // 순위 이모지 제거
    .replace(/[🥇🥈🥉]/g, '')
    // 도형 기호 제거
    .replace(/[◈◉◆◇♦♢■□▲△▶▷●○★☆✦✧※◊]/g, '')
    // 하트류 전부 제거 (♥ ♡ 통일)
    .replace(/[♥♡❤]/g, '')
    // 끝에 붙는 호칭 제거 (나래님 → 나래)
    .replace(/님$/, '')
    // 특수문자/공백 제거
    .replace(/[\s_\-\.˚°"'`~!@#$%^&*()\[\]{}|\\:;<>?,/＠]/g, '')
    // 소문자 l → i 통일 (Im미나 / lm미나 혼동 방지)
    .replace(/l/g, 'i')
    .toLowerCase()
    .trim()
}

const CREW_NAME_MAP = {
  "GW":       "광우상사",
  "C9":       "씨나인",
  "YXL":      "YXL",
  "INOLABLE": "이노레이블",
  "The K":    "더케이",
  "JS":       "정선컴퍼니",
  "771":      "771",
  "GD":       "GD컴퍼니",
  "Show K":   "쇼케이",
  "Moon A":   "문에이",
  "Fantasy U": "판타지유",
  "FantasyU":  "판타지유",
}

function normalizeCrewName(name) {
  return name
    .replace(/[\s_\-\.]/g, '')
    .toLowerCase()
}

const CREW_NORMALIZED_MAP = {
  '광우상사': '광우상사', 'gw': '광우상사', 'gwanwoo': '광우상사', 'gwanwoosangsa': '광우상사',
  '씨나인': '씨나인', 'c9': '씨나인', 'cnine': '씨나인',
  'yxl': 'YXL',
  '이노레이블': '이노레이블', 'inolable': '이노레이블', 'inolabel': '이노레이블',
  '더케이': '더케이', 'thek': '더케이',
  '정선컴퍼니': '정선컴퍼니', 'js': '정선컴퍼니', 'jungsun': '정선컴퍼니', 'jungsuncompany': '정선컴퍼니', 'jeongseon': '정선컴퍼니',
  '771': '771',
  'gd컴퍼니': 'GD컴퍼니', 'gd': 'GD컴퍼니', 'gdcompany': 'GD컴퍼니', 'gd컴': 'GD컴퍼니',
  '쇼케이': '쇼케이', 'showk': '쇼케이',
  '문에이': '문에이', 'moona': '문에이',
  '판타지유': '판타지유', 'fantasyu': '판타지유', 'fantasy': '판타지유',
}

function mapCrewName(yxlName) {
  return CREW_NAME_MAP[yxlName] || yxlName
}

function isSameCrew(dbCrewName, yxlCrewName) {
  if (dbCrewName === yxlCrewName) return true
  const dbNorm = normalizeCrewName(dbCrewName)
  const yxlNorm = normalizeCrewName(yxlCrewName)
  if (dbNorm === yxlNorm) return true
  const dbCanon = CREW_NORMALIZED_MAP[dbNorm] || CREW_NORMALIZED_MAP[dbCrewName.toLowerCase()] || dbCrewName
  const yxlCanon = CREW_NORMALIZED_MAP[yxlNorm] || CREW_NORMALIZED_MAP[yxlCrewName.toLowerCase()] || yxlCrewName
  return dbCanon === yxlCanon
}

const YXLINFO_BACKUP = {
  "광우상사":   ["미디♡.","함지아♥","안둥♥","아이빈","임주연♥","원영님♥","이온♥","가을이♡","서윤슬@","숨댕♥"],
  "씨나인":    ["이다니♥","혜루찡","송채연","쁠리vvely","체온_♡","BJ채리","하이희야♡","인지연JYEON","설윤이♥","초초","애순이","아윤♡","히나_♥","ε연두з","리하♥","#초린"],
  "YXL":      ["후잉♥","냥냥수주","류서하♥","너의˚멜로디","미로。","소다♥","김유정S2","백나현","서니_♥","ZO아름♡","하랑짱♥"],
  "이노레이블": ["애지니♡","히냥이♥","설탱♥","이월♥","꽃부기♥","#누리-","리에♡","설인_♥","이리원♥","밤비♥","♥밍초♥","연보민","♥우연"],
  "판타지유":   ["미숑.♥","가비[♥]","윤아현","쑤지","파닥♥","한세은♥","이소원♥","만다♥","김뽀뇨","파나나_","#한시온","유별♡","김그루♡"],
  "정선컴퍼니": ["서이안","♥백설♥","윤수♥","아유님♥","유서림♥","율비♡","김규리♥","햇동이♥","윤세빈♥","당신의채안♥","♡김베리♡","♥유메이♥","채보미=3="],
  "더케이":    ["! 채채","단하나♡","[BJ]에디양","강한빛♡","지아콩","포카린","엘♥","한슬댕","퀸다미♧","차시월","푸린♡","쑤♥","소냥이에요"],
  "771":      ["예란","푸글리♡","나래♡","지숙♥_.","예수","나래님♥","김봄비","도예솔","한채아♥","츠밍","이밍+♥"],
  "GD컴퍼니":  ["아링","쥬브리","♥유현♥","은아린!!","E윤아♡","채아님♥","유나라♥"],
  "문에이":    ["미지수♥","하임*","강형민이","햄벅","현강림2","♥채화","슈나♥","예니__","설현미","서언수","뮤엘♥","박재열","E-;이은♥",".장지민","천시아S2","lm미나","#다인"],
  "쇼케이":    ["＠서단","송화양","재온ly","유이나.♡","쏘피♥","도예빈♥","송유이♥","새봄_♡","정인♥","코코_♥","♥제니♥","이로♥","도하정♥"]
}

async function fetchYxlinfoData() {
  try {
    const res = await fetch('https://yxlinfo.github.io/crew-rank/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const result = {}
    const sections = html.split('<div class="crew-card"')
    for (const section of sections.slice(1)) {
      const titleMatch = section.match(/<div class="crew-title">([^<]+)<\/div>/)
      if (!titleMatch) continue
      const crewName = mapCrewName(titleMatch[1].trim())
      const members = []
      const nickRegex = /<div class="nick">([^<]+)<\/div>/g
      let m
      while ((m = nickRegex.exec(section)) !== null) {
        const name = cleanMemberName(m[1])
        if (name) members.push(name)
      }
      result[crewName] = members
    }
    const crewCount = Object.keys(result).length
    const memberCount = Object.values(result).reduce((s, v) => s + v.length, 0)
    if (crewCount > 0 && memberCount > 10) {
      console.log(`[yxlinfo] 성공: 크루 ${crewCount}개, 멤버 ${memberCount}명`)
      return result
    }
    throw new Error(`파싱 결과 부족: 크루 ${crewCount}, 멤버 ${memberCount}`)
  } catch(e) {
    console.log('[yxlinfo] 실패, 백업 사용:', e.message)
    return YXLINFO_BACKUP
  }
}

const CREW_COLORS = ["#ff6b9d","#ffd93d","#6bcb77","#4d96ff","#ff6b6b","#c77dff","#ff9a3c"]

// ── 크루 ──────────────────────────────────────────────
router.get('/crews', (req, res) => {
  const group = req.query.group || 'excel'
  const crews = db.prepare('SELECT * FROM crews WHERE group_key = ? ORDER BY sort_order, id').all(group)
  res.json(crews)
})

router.post('/crews', adminOnly, (req, res) => {
 const { name, color = '#6366f1', sort_order = 0, logo_url = '', master_soop_id = null, group_key = 'excel' } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const result = db.prepare(
      'INSERT INTO crews (name, color, logo_url, sort_order, master_soop_id, group_key) VALUES (?, ?, ?, ?, ?, ?)'
   ).run(name, color, logo_url, sort_order, master_soop_id || null, group_key)
    res.json({ id: result.lastInsertRowid, name, color, logo_url, sort_order, master_soop_id, group_key })
  } catch (e) {
    res.status(400).json({ error: '이미 존재하는 크루명입니다' })
  }
})

router.put('/crews/:id', adminOnly, (req, res) => {
  try {
    const { name, color, sort_order, logo_url = '', master_soop_id = null, group_key } = req.body
    if (group_key) {
      db.prepare('UPDATE crews SET name=?, color=?, sort_order=?, logo_url=?, master_soop_id=?, group_key=? WHERE id=?')
        .run(name, color, sort_order, logo_url, master_soop_id || null, group_key, req.params.id)
    } else {
      db.prepare('UPDATE crews SET name=?, color=?, sort_order=?, logo_url=?, master_soop_id=? WHERE id=?')
        .run(name, color, sort_order, logo_url, master_soop_id || null, req.params.id)
    }
    res.json({ ok: true })
  } catch(e) {
    res.status(400).json({ error: '이미 존재하는 크루명입니다' })
  }
})

router.delete('/crews/:id', adminOnly, (req, res) => {
  try {
    db.exec('PRAGMA foreign_keys = OFF')
    db.prepare('UPDATE members SET is_active=0 WHERE crew_id=?').run(req.params.id)
    db.prepare('DELETE FROM crews WHERE id=?').run(req.params.id)
    db.exec('PRAGMA foreign_keys = ON')
    res.json({ ok: true })
  } catch(e) {
    db.exec('PRAGMA foreign_keys = ON')
    console.error('크루 삭제 실패:', e.message)
    res.status(500).json({ error: '삭제 실패: ' + e.message })
  }
})

// ── 멤버 ──────────────────────────────────────────────
router.get('/members', (req, res) => {
  const group = req.query.group
  const sql = group
    ? `SELECT m.*, c.name as crew_name, c.color as crew_color
       FROM members m JOIN crews c ON m.crew_id = c.id
       WHERE m.is_active = 1 AND c.group_key = ?
       ORDER BY c.sort_order, m.sort_order, m.id`
    : `SELECT m.*, c.name as crew_name, c.color as crew_color
       FROM members m JOIN crews c ON m.crew_id = c.id
       WHERE m.is_active = 1
       ORDER BY c.sort_order, m.sort_order, m.id`
  const members = group ? db.prepare(sql).all(group) : db.prepare(sql).all()
  res.json(members)
})

router.get('/nickname/:soopId', async (req, res) => {
  const info = await fetchSoopInfo(req.params.soopId)
  if (info?.nickname) res.json(info)
  else res.status(404).json({ error: '닉네임을 찾을 수 없어요' })
})

router.post('/members', adminOnly, async (req, res) => {
  const { crew_id, soop_id, sort_order = 0, is_new = 0 } = req.body
  let { name } = req.body
  if (!crew_id || !soop_id)
    return res.status(400).json({ error: 'crew_id, soop_id 필수' })
  const info = await fetchSoopInfo(soop_id)
  if (!name || name === soop_id) {
    name = info?.nickname || soop_id
  }
name = cleanMemberName(name)
  const profile_img = info?.profile_img || soopCdnUrl(soop_id)
  try {
    const existing = db.prepare('SELECT id FROM members WHERE soop_id = ?').get(soop_id)
    if (existing) {
      db.prepare('UPDATE members SET crew_id=?, name=?, sort_order=?, is_new=?, is_active=1, profile_img=? WHERE soop_id=?')
        .run(crew_id, name, sort_order, is_new ? 1 : 0, profile_img, soop_id)
    } else {
      const nowIso = new Date().toISOString()
      db.prepare('INSERT INTO members (crew_id, soop_id, name, sort_order, is_new, profile_img, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(crew_id, soop_id, name, sort_order, is_new ? 1 : 0, profile_img, is_new ? nowIso : null)
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const list = await fetchMonthlyAll(year, month)
    if (list) {
      const item = list.find(x => x.i === soop_id)
      const balloons = item?.b ?? 0
      db.prepare('INSERT INTO balloon_snapshots (soop_id, year, month, total_balloons) VALUES (?, ?, ?, ?)')
        .run(soop_id, year, month, balloons)
    }
    res.json({ ok: true, soop_id, name, profile_img })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/members/:id', adminOnly, (req, res) => {
  const { name, crew_id, sort_order, is_new, profile_img } = req.body
  if (profile_img !== undefined) {
    db.prepare('UPDATE members SET name=?, crew_id=?, sort_order=?, is_new=?, profile_img=? WHERE id=?')
      .run(name, crew_id, sort_order ?? 0, is_new ? 1 : 0, profile_img, req.params.id)
  } else {
    db.prepare('UPDATE members SET name=?, crew_id=?, sort_order=?, is_new=? WHERE id=?')
      .run(name, crew_id, sort_order ?? 0, is_new ? 1 : 0, req.params.id)
  }
  res.json({ ok: true })
})

router.delete('/members/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM members WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ── 통계 ──────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const now = new Date()
  const year = parseInt(req.query.year) || now.getFullYear()
  const month = parseInt(req.query.month) || (now.getMonth() + 1)
  const group = req.query.group || 'excel'
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const allCrews = db.prepare('SELECT * FROM crews WHERE group_key = ? ORDER BY sort_order, id').all(group)
  const rows = db.prepare(`
    SELECT
      m.id, m.soop_id, m.name, m.crew_id, m.sort_order, m.is_new, m.joined_at,
      COALESCE(m.profile_img, '') as profile_img,
      c.name as crew_name, c.color as crew_color, c.logo_url as crew_logo, c.sort_order as crew_order,
      COALESCE((
        SELECT total_balloons FROM balloon_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1
      ), 0) as balloons,
      COALESCE((
        SELECT daily_balloons FROM balloon_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1
      ), 0) as daily_balloons,
      COALESCE((
        SELECT total_balloons FROM balloon_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1
      ), 0) as prev_balloons,
      COALESCE((
        SELECT total_balloons FROM balloon_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY day DESC, fetched_at DESC LIMIT 1 OFFSET 1
      ), 0) as yesterday_balloons
    FROM members m
    JOIN crews c ON m.crew_id = c.id
    WHERE m.is_active = 1 AND c.group_key = ?
    ORDER BY c.sort_order, balloons DESC
  `).all(year, month, year, month, prevYear, prevMonth, year, month, group)
  const crewMap = {}
  for (const crew of allCrews) {
    let master_balloons = 0
    let master_name = null
    if (crew.master_soop_id) {
      const masterSnap = db.prepare(`
        SELECT total_balloons FROM balloon_snapshots
        WHERE soop_id = ? AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1
      `).get(crew.master_soop_id, year, month)
      master_balloons = masterSnap?.total_balloons ?? 0
      const masterMember = db.prepare('SELECT name FROM members WHERE soop_id = ?').get(crew.master_soop_id)
      master_name = masterMember?.name || crew.master_soop_id
    }
    crewMap[crew.id] = {
      id: crew.id, name: crew.name, color: crew.color,
      logo_url: crew.logo_url || '', sort_order: crew.sort_order,
      master_soop_id: crew.master_soop_id || null, master_name, master_balloons,
      members: [], total: 0, prev_total: 0, avg: 0
    }
  }
  for (const row of rows) {
    if (!crewMap[row.crew_id]) continue
    crewMap[row.crew_id].members.push({
      id: row.id, soop_id: row.soop_id, name: row.name, profile_img: row.profile_img,
      joined_at: row.joined_at || null,
      balloons: row.balloons, daily_balloons: row.daily_balloons,
      yesterday_diff: row.balloons - row.yesterday_balloons,
      prev_balloons: row.prev_balloons, is_new: row.is_new, sort_order: row.sort_order
    })
    crewMap[row.crew_id].total += row.balloons
    crewMap[row.crew_id].prev_total += row.prev_balloons
  }

  const crews = Object.values(crewMap).map(c => {
    const activeMembers = c.members.filter(m => m.balloons > 0)
    return {
      ...c,
      avg_member_count: activeMembers.length,
      avg: activeMembers.length > 0 ? Math.round(c.total / activeMembers.length) : 0
    }
  }).sort((a, b) => b.avg - a.avg)

res.json({ year, month, prevYear, prevMonth, group, crews })
})

// ── 뷰어십 통계 ───────────────────────────────────────
router.get('/viewer-stats', (req, res) => {
  const now = new Date()
  const year = parseInt(req.query.year) || now.getFullYear()
  const month = parseInt(req.query.month) || (now.getMonth() + 1)
  const group = req.query.group || 'excel'
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const allCrews = db.prepare('SELECT * FROM crews WHERE group_key = ? ORDER BY sort_order, id').all(group)
  const rows = db.prepare(`
    SELECT
      m.id, m.soop_id, m.name, m.crew_id, m.sort_order, m.is_new, m.joined_at,
      COALESCE(m.profile_img, '') as profile_img,
      c.name as crew_name, c.color as crew_color, c.logo_url as crew_logo, c.sort_order as crew_order,
      COALESCE((
        SELECT total_viewers FROM viewer_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1
      ), 0) as viewers,
      COALESCE((
        SELECT total_viewers FROM viewer_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1
      ), 0) as prev_viewers,
      COALESCE((
        SELECT total_viewers FROM viewer_snapshots
        WHERE soop_id = m.soop_id AND year = ? AND month = ?
        ORDER BY fetched_at DESC LIMIT 1 OFFSET 1
      ), 0) as yesterday_viewers
    FROM members m
    JOIN crews c ON m.crew_id = c.id
    WHERE m.is_active = 1 AND c.group_key = ?
    ORDER BY c.sort_order, viewers DESC
  `).all(year, month, prevYear, prevMonth, year, month, group)
  const crewMap = {}
  for (const crew of allCrews) {
    crewMap[crew.id] = {
      id: crew.id, name: crew.name, color: crew.color,
      logo_url: crew.logo_url || '', sort_order: crew.sort_order,
      master_soop_id: null, master_name: null, master_balloons: 0,
      members: [], total: 0, prev_total: 0, avg: 0
    }
  }
  for (const row of rows) {
    if (!crewMap[row.crew_id]) continue
    crewMap[row.crew_id].members.push({
      id: row.id, soop_id: row.soop_id, name: row.name, profile_img: row.profile_img,
      balloons: row.viewers, daily_balloons: 0,
      yesterday_diff: row.viewers - row.yesterday_viewers,
      prev_balloons: row.prev_viewers, is_new: row.is_new, sort_order: row.sort_order
    })
    crewMap[row.crew_id].total += row.viewers
    crewMap[row.crew_id].prev_total += row.prev_viewers
  }
  const crews = Object.values(crewMap).map(c => {
    const activeMembers = c.members.filter(m => m.balloons > 0)
    return {
      ...c,
      avg_member_count: activeMembers.length,
      avg: activeMembers.length > 0 ? Math.round(c.total / activeMembers.length) : 0
    }
  }).sort((a, b) => b.avg - a.avg)
  res.json({ year, month, prevYear, prevMonth, group, crews })
})

// ── 수동 수집 트리거 ─────────────────────────────────
router.post('/collect', adminOnly, async (req, res) => {
  res.json({ ok: true, message: '수집 시작' })
  collectAll().then(() => clearApiCache()).catch(console.error)
})

router.post('/collect-prev', adminOnly, async (req, res) => {
  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1
  const prevYear = curMonth === 1 ? curYear - 1 : curYear
  res.json({ ok: true, message: `${prevYear}년 ${prevMonth}월 수집 시작` })
  try {
    const members = db.prepare('SELECT soop_id, name FROM members WHERE is_active = 1').all()
    const list = await fetchMonthlyAll(prevYear, prevMonth)
    if (!list) { console.error('[collect-prev] 데이터 실패'); return }
    const map = {}
    for (const item of list) { if (item.i) map[item.i] = item.b || 0 }
    for (const member of members) {
      const total = map[member.soop_id] ?? 0
      db.prepare(`
        INSERT INTO balloon_snapshots (soop_id, year, month, day, total_balloons)
        VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(soop_id, year, month, day) DO UPDATE SET
          total_balloons = excluded.total_balloons,
          fetched_at = datetime('now')
      `).run(member.soop_id, prevYear, prevMonth, total)
    }
    console.log('[collect-prev] 완료')
  } catch(e) { console.error('[collect-prev] 오류:', e.message) }
})

router.get('/last-collected', (req, res) => {
  const row = db.prepare(
    'SELECT fetched_at FROM balloon_snapshots ORDER BY fetched_at DESC LIMIT 1'
  ).get()
  res.json({ last_collected: row?.fetched_at ?? null })
})

router.get('/search-by-name', adminOnly, async (req, res) => {
  const { name } = req.query
  if (!name) return res.json({ results: [] })
  try {
    const cleanName = cleanMemberName(name).replace(/^\[[^\]]+\]\s*/, '').trim() || name
    const keyword = normalizeName(cleanName)
    if (keyword.length < 1) return res.json({ results: [] })

    const now = new Date()
    const list = await fetchMonthlyAll(now.getFullYear(), now.getMonth() + 1)
    let results = []
    if (list) {
      const exact = []
      const partial = []
      for (const item of list) {
        if (!item.n) continue
        const n = normalizeName(item.n)
        if (n === keyword) exact.push(item)
        else if (keyword.length >= 2 && n.includes(keyword)) partial.push(item)
      }
      const merged = [...exact, ...partial].slice(0, 6)
      results = merged.map(item => ({
        soop_id: item.i,
        name: cleanMemberName(item.n),
        balloons: item.b,
        profile_img: soopCdnUrl(item.i)
      }))
    }

    console.log(`[search] "${name}" (keyword: ${keyword}) → ${results.length}건`)
    res.json({ results })
  } catch(e) {
    console.log('[search-by-name] 오류:', e.message)
    res.json({ results: [] })
  }
})

router.post('/import-naksoo', adminOnly, async (req, res) => {
  const results = { crews_added: 0, crews_skipped: 0, members_matched: 0, members_skipped: 0, members_needs_soop_id: [] }
  const yxlinfoData = await fetchYxlinfoData()
  let colorIdx = db.prepare('SELECT COUNT(*) as c FROM crews').get().c

  for (const [crewName, names] of Object.entries(yxlinfoData)) {
    let crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(crewName)
    if (!crew) {
      const color = CREW_COLORS[colorIdx % CREW_COLORS.length]
      const r = db.prepare('INSERT INTO crews (name, color, sort_order) VALUES (?, ?, ?)').run(crewName, color, colorIdx + 1)
      crew = { id: r.lastInsertRowid }
      results.crews_added++
    } else { results.crews_skipped++ }
    colorIdx++

    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      const existing = db.prepare('SELECT id, soop_id FROM members WHERE LOWER(name) = LOWER(?) AND is_active = 1').get(name)
      if (existing) {
        db.prepare('UPDATE members SET crew_id = ?, sort_order = ? WHERE id = ?').run(crew.id, i + 1, existing.id)
        results.members_matched++
      } else {
        results.members_needs_soop_id.push({ name, crew_name: crewName })
        results.members_skipped++
      }
    }
  }

  res.json({ ok: true, ...results })
})

// ⭐ yxlinfo 동기화 diff (비활성 멤버 함께 검토 + 디버그 로그) ─────
router.get('/sync-naksoo/diff', adminOnly, async (req, res) => {
  const yxlinfoData = await fetchYxlinfoData()
  const added = [], removed = [], moved = []

  // yxlinfo 이름 → 크루 매핑 (정규화된 이름 키)
  const nameToCrewMap = {}
  for (const [crewName, names] of Object.entries(yxlinfoData)) {
    for (const name of names) {
      nameToCrewMap[normalizeName(name)] = { crewName, originalName: name }
    }
  }

  const yxlinfoCrewNames = Object.keys(yxlinfoData)

  // 활성 멤버: 삭제/이동 판단용
  const activeMembers = db.prepare(`
    SELECT m.soop_id, m.name, c.name as crew_name
    FROM members m JOIN crews c ON m.crew_id = c.id
    WHERE m.is_active = 1
  `).all()

  // 전체 멤버(비활성 포함): 신규 판단 시 이미 DB에 있는지 체크
  const allMembersByNorm = {}
  const allMembersRows = db.prepare(`
    SELECT m.id, m.soop_id, m.name, m.is_active, c.name as crew_name
    FROM members m JOIN crews c ON m.crew_id = c.id
  `).all()
  for (const r of allMembersRows) {
    allMembersByNorm[normalizeName(r.name)] = r
  }

  // ── 삭제 / 이동 감지 (활성 멤버 기준) ──
  for (const member of activeMembers) {
    if (!yxlinfoCrewNames.some(n => isSameCrew(member.crew_name, n))) continue
    const memberNorm = normalizeName(member.name)
    const matched = nameToCrewMap[memberNorm]
    if (!matched) {
      console.log(`[diff] REMOVED: "${member.name}" (norm: "${memberNorm}") crew=${member.crew_name}`)
      removed.push({ soop_id: member.soop_id, name: member.name, crew_name: member.crew_name })
    } else if (!isSameCrew(matched.crewName, member.crew_name)) {
      console.log(`[diff] MOVED: "${member.name}" ${member.crew_name} → ${matched.crewName}`)
      moved.push({ soop_id: member.soop_id, name: member.name, from_crew: member.crew_name, to_crew: matched.crewName })
    }
  }

  // ── 신규 감지 (활성/비활성 모두 비교) ──
  const activeNamesNorm = new Set(activeMembers.map(m => normalizeName(m.name)))
  for (const [crewName, names] of Object.entries(yxlinfoData)) {
    for (const name of names) {
      const norm = normalizeName(name)
      if (activeNamesNorm.has(norm)) continue

      const existing = allMembersByNorm[norm]
      if (existing && existing.is_active === 0) {
        console.log(`[diff] SKIP (inactive exists): "${name}" (norm: "${norm}")`)
        continue
      }
      console.log(`[diff] ADDED: "${name}" (norm: "${norm}") crew=${crewName}`)
      added.push({ soop_id: null, name, crew_name: crewName })
    }
  }

  console.log(`[diff] 결과: 추가 ${added.length}, 삭제 ${removed.length}, 이동 ${moved.length}`)
  res.json({ added, removed, moved, total: added.length + removed.length + moved.length })
})

// ⭐ yxlinfo 동기화 apply (비활성/동명이인 재활용) ───
router.post('/sync-naksoo/apply', adminOnly, async (req, res) => {
  const { added = [], removed = [], moved = [] } = req.body
  const results = { added: 0, removed: 0, moved: 0, reactivated: 0, skipped_added: 0 }

  try {
    const dbPath = join(__dirname, '../data.db')
    const backupDir = join(__dirname, '../backups')
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    copyFileSync(dbPath, join(backupDir, `data-${ts}.db`))
    const files = readdirSync(backupDir).filter(f => f.endsWith('.db')).sort()
    if (files.length > 5) files.slice(0, files.length - 5).forEach(f => unlinkSync(join(backupDir, f)))
  } catch(e) { console.warn('[backup] 백업 실패:', e.message) }

  for (const m of removed) {
    if (!m.soop_id) continue
    db.prepare('UPDATE members SET is_active = 0 WHERE soop_id = ?').run(m.soop_id)
    results.removed++
  }

  for (const m of moved) {
    if (!m.soop_id) continue
    const crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(m.to_crew)
    if (crew) {
      db.prepare('UPDATE members SET crew_id = ? WHERE soop_id = ?').run(crew.id, m.soop_id)
      results.moved++
    }
  }

  for (const m of added) {
    if (!m.soop_id) { results.skipped_added++; continue }

    let crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(m.crew_name)
    if (!crew) {
      const color = CREW_COLORS[db.prepare('SELECT COUNT(*) as c FROM crews').get().c % CREW_COLORS.length]
      const r = db.prepare('INSERT INTO crews (name, color, sort_order) VALUES (?,?,?)').run(m.crew_name, color, 99)
      crew = { id: r.lastInsertRowid }
    }

    // 1) soop_id가 이미 있으면 → 재활성화 + 크루/이름 업데이트
    const bySoop = db.prepare('SELECT id FROM members WHERE soop_id = ?').get(m.soop_id)
    if (bySoop) {
      const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM members WHERE crew_id = ?').get(crew.id)?.m || 0
      db.prepare(`
        UPDATE members
        SET name=?, crew_id=?, is_active=1, sort_order=?, profile_img=COALESCE(profile_img, ?)
        WHERE id=?
      `).run(m.name, crew.id, maxOrder + 1, m.profile_img || soopCdnUrl(m.soop_id), bySoop.id)
      results.added++
      continue
    }

    // 2) 정규화된 이름이 같은 비활성 멤버 → 재활성화
    const targetNorm = normalizeName(m.name)
    const inactiveMembers = db.prepare('SELECT id, name FROM members WHERE is_active = 0').all()
    const sameNameInactive = inactiveMembers.find(c => normalizeName(c.name) === targetNorm)
    if (sameNameInactive) {
      const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM members WHERE crew_id = ?').get(crew.id)?.m || 0
      db.prepare(`
        UPDATE members
        SET soop_id=?, name=?, crew_id=?, is_active=1, sort_order=?, profile_img=COALESCE(profile_img, ?)
        WHERE id=?
      `).run(m.soop_id, m.name, crew.id, maxOrder + 1, m.profile_img || soopCdnUrl(m.soop_id), sameNameInactive.id)
      results.reactivated++
      continue
    }

// 3) 진짜 신규
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM members WHERE crew_id = ?').get(crew.id)?.m || 0
    const cleanName = cleanMemberName(m.name)
    db.prepare('INSERT INTO members (soop_id, name, crew_id, sort_order, profile_img, is_active, is_new, joined_at) VALUES (?,?,?,?,?,1,1,?)')
      .run(m.soop_id, cleanName, crew.id, maxOrder + 1, m.profile_img || soopCdnUrl(m.soop_id), new Date().toISOString())
    results.added++
  }

  res.json({ ok: true, ...results })
})

router.get('/fan-ranking/:soopId', async (req, res) => {
  const { soopId } = req.params
  const year = req.query.year || new Date().getFullYear()
  const month = req.query.month || (new Date().getMonth() + 1)
  try {
    const url = `https://static.poong.today/bj/detail/get?id=${soopId}&year=${year}&month=${month}`
    const r = await fetch(url, { headers: POONG_HEADERS })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const fans = (data.f || []).slice(0, 10).map((f, i) => ({
      rank: i + 1, soop_id: f.i, name: f.n, balloons: f.b, count: f.c,
      profile_img: `https://profile.img.sooplive.co.kr/LOGO/${f.i.slice(0,2).toLowerCase()}/${f.i}/${f.i}.jpg`
    }))
    res.json({ ok: true, soop_id: soopId, year, month, fans })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

router.post('/admin/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) res.json({ ok: true, token: ADMIN_PASSWORD })
  else res.status(401).json({ ok: false, error: '비밀번호가 틀렸어요' })
})

router.post('/admin/change-password', adminOnly, (req, res) => {
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 해요' })
  try {
    const envPath = join(__dirname, '../.env')
    writeFileSync(envPath, `ADMIN_PASSWORD=${newPassword}\n`)
    ADMIN_PASSWORD = newPassword
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ error: '저장 실패: ' + e.message }) }
})

router.get('/backups', adminOnly, (req, res) => {
  try {
    const backupDir = join(__dirname, '../backups')
    if (!existsSync(backupDir)) return res.json({ backups: [] })
    const files = readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse()
      .map(f => ({ name: f, time: f.replace('data-', '').replace('.db', '').replace('T', ' ') }))
    res.json({ backups: files })
  } catch(e) { res.json({ backups: [] }) }
})

router.post('/backups/restore', adminOnly, (req, res) => {
  const { name } = req.body
  try {
    const backupDir = join(__dirname, '../backups')
    const dbPath = join(__dirname, '../data.db')
    const backupPath = join(backupDir, name)
    if (!existsSync(backupPath)) return res.status(404).json({ error: '백업 파일 없음' })
    copyFileSync(backupPath, dbPath)
    res.json({ ok: true, message: `${name} 복원 완료. 서버를 재시작해주세요.` })
  } catch(e) { res.status(500).json({ error: e.message }) }
})

router.get('/unknown-crews', adminOnly, async (req, res) => {
  try {
    const yxlinfoData = await fetchYxlinfoData()
    const yxlinfoCrewNames = Object.keys(yxlinfoData)
    const allCrews = db.prepare('SELECT * FROM crews').all()
    const unknown = allCrews.filter(c => !yxlinfoCrewNames.some(n => isSameCrew(c.name, n)))
    res.json({ crews: unknown })
  } catch(e) { res.json({ crews: [] }) }
})

router.delete('/unknown-crews/:id', adminOnly, (req, res) => {
  db.prepare('UPDATE members SET is_active=0 WHERE crew_id=?').run(req.params.id)
  db.prepare('DELETE FROM crews WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

router.post('/update-profiles', adminOnly, async (req, res) => {
  const members = db.prepare('SELECT id, soop_id FROM members WHERE is_active = 1').all()
  res.json({ ok: true, message: `${members.length}명 프사 업데이트 시작` })
  for (const m of members) {
    const info = await fetchSoopInfo(m.soop_id)
    const profile_img = info?.profile_img || soopCdnUrl(m.soop_id)
    db.prepare('UPDATE members SET profile_img=? WHERE id=?').run(profile_img, m.id)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('[profile] 일괄 업데이트 완료')
})

export async function autoImportNaksoo() {
  try {
    const yxlinfoData = await fetchYxlinfoData()
    const yxlinfoCrewNames = Object.keys(yxlinfoData)

    const allCrews = db.prepare('SELECT * FROM crews').all()
    for (const crew of allCrews) {
      if (!yxlinfoCrewNames.some(n => isSameCrew(crew.name, n))) {
        db.prepare('UPDATE members SET is_active=0 WHERE crew_id=?').run(crew.id)
        db.prepare('DELETE FROM crews WHERE id=?').run(crew.id)
      }
    }

    let colorIdx = db.prepare('SELECT COUNT(*) as c FROM crews').get().c

    for (const [crewName, names] of Object.entries(yxlinfoData)) {
      let crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(crewName)
      if (!crew) {
        const color = CREW_COLORS[colorIdx % CREW_COLORS.length]
        const r = db.prepare('INSERT INTO crews (name, color, sort_order) VALUES (?,?,?)').run(crewName, color, colorIdx + 1)
        crew = { id: r.lastInsertRowid }
      }
      colorIdx++

      const yxlinfoNamesNorm = new Set(names.map(n => normalizeName(n)))
      const crewMembers = db.prepare('SELECT id, name FROM members WHERE crew_id = ? AND is_active = 1').all(crew.id)
      for (const m of crewMembers) {
        if (!yxlinfoNamesNorm.has(normalizeName(m.name))) {
          db.prepare('UPDATE members SET is_active=0 WHERE id=?').run(m.id)
          console.log(`[autoImport] 비활성화: ${m.name}`)
        }
      }

      for (let i = 0; i < names.length; i++) {
        const name = names[i]
        const existing = db.prepare('SELECT id, crew_id FROM members WHERE is_active = 1').all()
          .find(m => normalizeName(m.name) === normalizeName(name))
        if (existing && existing.crew_id !== crew.id) {
          db.prepare('UPDATE members SET crew_id=?, sort_order=? WHERE id=?').run(crew.id, i + 1, existing.id)
          console.log(`[autoImport] 크루이동: ${name} → ${crewName}`)
        }
      }
    }

    console.log('[autoImport] yxlinfo 동기화 완료')
  } catch(e) { console.warn('[autoImport] 실패:', e.message) }
}
// 🧹 base64 청소 (확인 후 삭제)
router.post('/clean-base64', adminOnly, (req, res) => {
  function soopCdnUrlLocal(soopId) {
    const prefix = soopId.slice(0, 2).toLowerCase()
    return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
  }
  
  const members = db.prepare(`
    SELECT id, soop_id, name FROM members 
    WHERE profile_img LIKE 'data:%'
  `).all()
  
  let cleaned = 0
  for (const m of members) {
    const newUrl = soopCdnUrlLocal(m.soop_id)
    db.prepare('UPDATE members SET profile_img = ? WHERE id = ?').run(newUrl, m.id)
    cleaned++
  }
  
  res.json({ 청소완료: cleaned, 메시지: `${cleaned}명의 base64 → URL로 변경됨` })
})
// 🔍 base64 확인용 (확인 후 삭제)
router.get('/check-base64', (req, res) => {
  const totalSize = db.prepare(`
    SELECT 
      COUNT(*) as total_members,
      SUM(length(profile_img)) as total_bytes,
      SUM(CASE WHEN profile_img LIKE 'data:%' THEN 1 ELSE 0 END) as base64_count,
      SUM(CASE WHEN profile_img LIKE 'data:%' THEN length(profile_img) ELSE 0 END) as base64_bytes
    FROM members
  `).get()
  
  res.json({
    전체_멤버: totalSize.total_members,
    전체_프사_용량_KB: Math.round((totalSize.total_bytes || 0) / 1024),
    base64로_저장된_멤버: totalSize.base64_count,
    base64_총_용량_KB: Math.round((totalSize.base64_bytes || 0) / 1024),
  })
})
export default router