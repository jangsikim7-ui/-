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
    console.log(`[soopInfo] ${soopId} keys:`, Object.keys(station).join(', '))
    const profile_img =
      station.profile_img ||
      station.user_img ||
      station.profile_image ||
      station.station_logo ||
      station.user_id_logo ||
      soopCdnUrl(soopId)
    console.log(`[soopInfo] ${soopId} nick=${station.user_nick} img=${profile_img}`)
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
  return raw.replace(/^[🥇🥈🥉]\s*/, '').replace(/^\s+/, '').trim()
}

// 이름 특수문자 제거 후 비교용 정규화
function normalizeName(name) {
  return name
    .replace(/[🥇🥈🥉]/g, '')
    // 전각문자 → 반각 변환 (！→!, ＠→@, ［SO］등)
    .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\s_\-\.˚°"'`~!@#$%^&*()\[\]{}|\\:;<>?,/♥♡＠]/g, '')
    .toLowerCase()
    .trim()
}

// ── yxlinfo 크루명 → 내 크루명 매핑 ──────────────────
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
}

// 크루명 정규화: 공백·특수문자 제거 + 소문자 (비교용)
function normalizeCrewName(name) {
  return name
    .replace(/[\s_\-\.]/g, '')
    .toLowerCase()
}

// 정규화된 크루명 → 정식 크루명 매핑 (모두 소문자 키)
const CREW_NORMALIZED_MAP = {
  // 광우상사
  '광우상사': '광우상사', 'gw': '광우상사', 'gwanwoo': '광우상사', 'gwanwoosangsa': '광우상사',
  // 씨나인
  '씨나인': '씨나인', 'c9': '씨나인', 'cnine': '씨나인',
  // YXL
  'yxl': 'YXL',
  // 이노레이블
  '이노레이블': '이노레이블', 'inolable': '이노레이블', 'inolable': '이노레이블', 'inolabel': '이노레이블',
  // 더케이
  '더케이': '더케이', 'thek': '더케이', 'theK': '더케이',
  // 정선컴퍼니
  '정선컴퍼니': '정선컴퍼니', 'js': '정선컴퍼니', 'jungsun': '정선컴퍼니', 'jungsuncompany': '정선컴퍼니', 'jeongseon': '정선컴퍼니',
  // 771
  '771': '771',
  // GD컴퍼니
  'gd컴퍼니': 'GD컴퍼니', 'gd': 'GD컴퍼니', 'gdcompany': 'GD컴퍼니', 'gd컴': 'GD컴퍼니',
  // 쇼케이
  '쇼케이': '쇼케이', 'showk': '쇼케이', 'show k': '쇼케이',
  // 문에이
  '문에이': '문에이', 'moona': '문에이', 'moon a': '문에이', 'moonA': '문에이',
}

function mapCrewName(yxlName) {
  return CREW_NAME_MAP[yxlName] || yxlName
}

// DB 크루명과 yxlinfo 크루명이 같은 크루인지 확인
function isSameCrew(dbCrewName, yxlCrewName) {
  if (dbCrewName === yxlCrewName) return true
  const dbNorm = normalizeCrewName(dbCrewName)   // 공백·특수문자 제거 + 소문자
  const yxlNorm = normalizeCrewName(yxlCrewName)
  if (dbNorm === yxlNorm) return true
  // 정규화 맵에서 둘 다 같은 정식명으로 매핑되는지 확인 (키는 모두 소문자)
  const dbCanon = CREW_NORMALIZED_MAP[dbNorm] || CREW_NORMALIZED_MAP[dbCrewName.toLowerCase()] || dbCrewName
  const yxlCanon = CREW_NORMALIZED_MAP[yxlNorm] || CREW_NORMALIZED_MAP[yxlCrewName.toLowerCase()] || yxlCrewName
  return dbCanon === yxlCanon
}

const YXLINFO_BACKUP = {
  "광우상사":   ["임주연♥","미디♡.","함지아♥","미숑.♥","이온♥","아이빈","원영님♥","가을이♡","서윤슬@","안둥♥","맹이.zip","파미"],
  "씨나인":    ["이다니♥","혜루찡","송채연","체온_♡","설윤이♥","BJ채리","초초","쁠리vvely","인지연JYEON","하이희야♡","아윤♡","♡혜밍","ε연두з","#초린","리하♥","히나_♥","애순이"],
  "YXL":      ["리윤_♥","후잉♥","냥냥수주","너의˚멜로디","류서하♥","미로。","서니_♥","백나현","하랑짱♥","김유정S2","유나연º-º","#율무","소다♥","ZO아름♡"],
  "이노레이블": ["애지니♡","설탱♥","꽃부기♥","히냥이♥","#누리-","이월♥","밤비♥","리에♡","설인_♥","이리원♥","♥밍초♥","연보민","[SO]박소연"],
  "정선컴퍼니": ["♥백설♥","서이안","유서림♥","윤수♥","아유님♥","김규리♥","햇동이♥","율비♡","윤세빈♥","♡김베리♡","당신의채안♥","나의유주♥","채보미=3="],
  "더케이":    ["[BJ]에디양","강한빛♡","지아콩","포카린","엘♥","퀸다미♧","푸린♡","차시월","! 채채","한슬댕","채리나","쑤♥","소냥이에요"],
  "771":      ["예란","푸글리♡","이나율♥","나래♡","지숙♥_.","나래님♥","예수","김봄비","박예솜:)","한채아♥","이밍+♥"],
  "GD컴퍼니":  ["♥유현♥","설인아님♥","쥬브리","아링","은아린!!","해리님♥","E윤아♡"],
  "쇼케이":    ["＠서단","송유이♥","유이나.♡","도예빈♥","쏘피♥","재온ly","새봄_♡","정인♥","♥제니♥","송화양","이로♥","도하정♥","@유톨"],
  "문에이":    ["미지수♥","햄벅","슈나♥","♥채화","하임*","강형민이","예니__","뮤엘♥","서언수","박재열","E-;이은♥","설현미","천시아S2",".장지민","현강림2","#다인"]
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
  const crews = db.prepare('SELECT * FROM crews ORDER BY sort_order, id').all()
  res.json(crews)
})

router.post('/crews', adminOnly, (req, res) => {
  const { name, color = '#6366f1', sort_order = 0, logo_url = '', master_soop_id = null } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const result = db.prepare(
      'INSERT INTO crews (name, color, logo_url, sort_order, master_soop_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, color, logo_url, sort_order, master_soop_id || null)
    res.json({ id: result.lastInsertRowid, name, color, logo_url, sort_order, master_soop_id })
  } catch (e) {
    res.status(400).json({ error: '이미 존재하는 크루명입니다' })
  }
})

router.put('/crews/:id', adminOnly, (req, res) => {
  try {
    const { name, color, sort_order, logo_url = '', master_soop_id = null } = req.body
    db.prepare('UPDATE crews SET name=?, color=?, sort_order=?, logo_url=?, master_soop_id=? WHERE id=?')
      .run(name, color, sort_order, logo_url, master_soop_id || null, req.params.id)
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
  const members = db.prepare(`
    SELECT m.*, c.name as crew_name, c.color as crew_color
    FROM members m
    JOIN crews c ON m.crew_id = c.id
    WHERE m.is_active = 1
    ORDER BY c.sort_order, m.sort_order, m.id
  `).all()
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
  const profile_img = info?.profile_img || soopCdnUrl(soop_id)
  try {
    const existing = db.prepare('SELECT id FROM members WHERE soop_id = ?').get(soop_id)
    if (existing) {
      db.prepare('UPDATE members SET crew_id=?, name=?, sort_order=?, is_new=?, is_active=1, profile_img=? WHERE soop_id=?')
        .run(crew_id, name, sort_order, is_new ? 1 : 0, profile_img, soop_id)
    } else {
      db.prepare('INSERT INTO members (crew_id, soop_id, name, sort_order, is_new, profile_img) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crew_id, soop_id, name, sort_order, is_new ? 1 : 0, profile_img)
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
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1

  const allCrews = db.prepare('SELECT * FROM crews ORDER BY sort_order, id').all()

  const rows = db.prepare(`
    SELECT
      m.id, m.soop_id, m.name, m.crew_id, m.sort_order, m.is_new,
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
    WHERE m.is_active = 1
    ORDER BY c.sort_order, balloons DESC
  `).all(year, month, year, month, prevYear, prevMonth, year, month)

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
      balloons: row.balloons, daily_balloons: row.daily_balloons,
      yesterday_diff: row.balloons - row.yesterday_balloons,
      prev_balloons: row.prev_balloons, is_new: row.is_new, sort_order: row.sort_order
    })
    crewMap[row.crew_id].total += row.balloons
    crewMap[row.crew_id].prev_total += row.prev_balloons
  }

  const crews = Object.values(crewMap).map(c => ({
    ...c, avg: c.members.length > 0 ? Math.round(c.total / c.members.length) : 0
  })).sort((a, b) => b.avg - a.avg)

  res.json({ year, month, prevYear, prevMonth, crews })
})

// ── 뷰어십 통계 ───────────────────────────────────────
router.get('/viewer-stats', (req, res) => {
  const now = new Date()
  const year = parseInt(req.query.year) || now.getFullYear()
  const month = parseInt(req.query.month) || (now.getMonth() + 1)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1

  const allCrews = db.prepare('SELECT * FROM crews ORDER BY sort_order, id').all()

  const rows = db.prepare(`
    SELECT
      m.id, m.soop_id, m.name, m.crew_id, m.sort_order, m.is_new,
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
    WHERE m.is_active = 1
    ORDER BY c.sort_order, viewers DESC
  `).all(year, month, prevYear, prevMonth, year, month)

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

  const crews = Object.values(crewMap).map(c => ({
    ...c, avg: c.members.length > 0 ? Math.round(c.total / c.members.length) : 0
  })).sort((a, b) => b.avg - a.avg)

  res.json({ year, month, prevYear, prevMonth, crews })
})

// ── 수동 수집 트리거 ─────────────────────────────────
router.post('/collect', adminOnly, async (req, res) => {
  res.json({ ok: true, message: '수집 시작' })
  collectAll().then(() => clearApiCache()).catch(console.error)
})

// ── 지난달 수집 트리거 ───────────────────────────────
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

// ── 마지막 수집 시간 ─────────────────────────────────
router.get('/last-collected', (req, res) => {
  const row = db.prepare(
    'SELECT fetched_at FROM balloon_snapshots ORDER BY fetched_at DESC LIMIT 1'
  ).get()
  res.json({ last_collected: row?.fetched_at ?? null })
})

// ── 이름으로 멤버 검색 (신규 멤버 soop ID 찾기용) ────
router.get('/search-by-name', adminOnly, async (req, res) => {
  const { name } = req.query
  if (!name) return res.json({ results: [] })
  try {
    // 대괄호 prefix 제거 ([SO], [BJ] 등) 후 특수문자 제거
    const cleanName = name.replace(/^\[[^\]]+\]\s*/, '').trim() || name
    const keyword = cleanName.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').toLowerCase()
    if (keyword.length < 1) return res.json({ results: [] })

    const now = new Date()
    const list = await fetchMonthlyAll(now.getFullYear(), now.getMonth() + 1)
    let results = []
    if (list) {
      // 완전일치 우선, 그 다음 포함 검색
      const exact = []
      const partial = []
      for (const item of list) {
        if (!item.n) continue
        const n = item.n.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').toLowerCase()
        if (n === keyword) {
          exact.push(item)
        } else if (keyword.length >= 2 && n.includes(keyword)) {
          partial.push(item)
        }
      }
      // 완전일치 먼저, 부분일치 최대 5개
      const merged = [...exact, ...partial].slice(0, 6)
      results = merged.map(item => ({
        soop_id: item.i,
        name: cleanMemberName(item.n),
        balloons: item.b,
        profile_img: soopCdnUrl(item.i)
      }))
    }

    console.log(`[search] "${name}" (keyword: ${keyword}) → ${results.length}건 (exact: ${results.filter(r=>r.name.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g,'').toLowerCase()===keyword).length})`)
    res.json({ results })
  } catch(e) {
    console.log('[search-by-name] 오류:', e.message)
    res.json({ results: [] })
  }
})

// ── yxlinfo 임포트 ───────────────────────────────────
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

// ── yxlinfo 동기화 diff ──────────────────────────────
router.get('/sync-naksoo/diff', adminOnly, async (req, res) => {
  const yxlinfoData = await fetchYxlinfoData()
  const added = [], removed = [], moved = []

  const nameToCrewMap = {}
  for (const [crewName, names] of Object.entries(yxlinfoData)) {
    for (const name of names) {
      nameToCrewMap[normalizeName(name)] = { crewName, originalName: name }
    }
  }

  const yxlinfoCrewNames = Object.keys(yxlinfoData)
  const myMembers = db.prepare(`
    SELECT m.soop_id, m.name, c.name as crew_name
    FROM members m JOIN crews c ON m.crew_id = c.id
    WHERE m.is_active = 1
  `).all()

  // 삭제 / 이동 감지
  for (const member of myMembers) {
    if (!yxlinfoCrewNames.some(n => isSameCrew(member.crew_name, n))) continue
    const matched = nameToCrewMap[normalizeName(member.name)]
    if (!matched) {
      removed.push({ soop_id: member.soop_id, name: member.name, crew_name: member.crew_name })
    } else if (!isSameCrew(matched.crewName, member.crew_name)) {
      moved.push({ soop_id: member.soop_id, name: member.name, from_crew: member.crew_name, to_crew: matched.crewName })
    }
  }

  // 신규 감지
  const myMemberNamesNorm = new Set(myMembers.map(m => normalizeName(m.name)))
  for (const [crewName, names] of Object.entries(yxlinfoData)) {
    for (const name of names) {
      if (!myMemberNamesNorm.has(normalizeName(name))) {
        added.push({ soop_id: null, name, crew_name: crewName })
      }
    }
  }

  res.json({ added, removed, moved, total: added.length + removed.length + moved.length })
})

// ── yxlinfo 동기화 apply ─────────────────────────────
router.post('/sync-naksoo/apply', adminOnly, async (req, res) => {
  const { added = [], removed = [], moved = [] } = req.body
  const results = { added: 0, removed: 0, moved: 0, skipped_added: 0 }

  // 백업
  try {
    const dbPath = join(__dirname, '../data.db')
    const backupDir = join(__dirname, '../backups')
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    copyFileSync(dbPath, join(backupDir, `data-${ts}.db`))
    const files = readdirSync(backupDir).filter(f => f.endsWith('.db')).sort()
    if (files.length > 5) files.slice(0, files.length - 5).forEach(f => unlinkSync(join(backupDir, f)))
  } catch(e) { console.warn('[backup] 백업 실패:', e.message) }

  // 삭제
  for (const m of removed) {
    if (!m.soop_id) continue
    db.prepare('UPDATE members SET is_active = 0 WHERE soop_id = ?').run(m.soop_id)
    results.removed++
  }

  // 이동
  for (const m of moved) {
    if (!m.soop_id) continue
    const crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(m.to_crew)
    if (crew) {
      db.prepare('UPDATE members SET crew_id = ? WHERE soop_id = ?').run(crew.id, m.soop_id)
      results.moved++
    }
  }

  // 추가 (soop_id 있는 것만)
  for (const m of added) {
    if (!m.soop_id) { results.skipped_added++; continue }
    let crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(m.crew_name)
    if (!crew) {
      const color = CREW_COLORS[db.prepare('SELECT COUNT(*) as c FROM crews').get().c % CREW_COLORS.length]
      const r = db.prepare('INSERT INTO crews (name, color, sort_order) VALUES (?,?,?)').run(m.crew_name, color, 99)
      crew = { id: r.lastInsertRowid }
    }
    const exists = db.prepare('SELECT id FROM members WHERE soop_id = ?').get(m.soop_id)
    if (!exists) {
      const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM members WHERE crew_id = ?').get(crew.id)?.m || 0
      db.prepare('INSERT INTO members (soop_id, name, crew_id, sort_order, profile_img, is_active) VALUES (?,?,?,?,?,1)')
        .run(m.soop_id, m.name, crew.id, maxOrder + 1, m.profile_img || soopCdnUrl(m.soop_id))
      results.added++
    }
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

    // yxlinfo에 없는 크루 비활성화
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

      // yxlinfo에 없는 멤버 비활성화
      const yxlinfoNamesNorm = new Set(names.map(n => normalizeName(n)))
      const crewMembers = db.prepare('SELECT id, name FROM members WHERE crew_id = ? AND is_active = 1').all(crew.id)
      for (const m of crewMembers) {
        if (!yxlinfoNamesNorm.has(normalizeName(m.name))) {
          db.prepare('UPDATE members SET is_active=0 WHERE id=?').run(m.id)
          console.log(`[autoImport] 비활성화: ${m.name}`)
        }
      }

      // 크루 이동 감지
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

export default router