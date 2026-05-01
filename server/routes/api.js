import { Router } from 'express'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
// 변경
import { existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
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

// sooplive 프사 CDN URL 생성 - 첫 두글자가 폴더명
// 예: jaeha010 → /LOGO/ja/jaeha010/jaeha010.jpg
function soopCdnUrl(soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

// SOOP 닉네임 + 프사 조회
async function fetchSoopInfo(soopId) {
  try {
    const res = await fetch(`https://chapi.sooplive.co.kr/api/${soopId}/station`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.sooplive.co.kr/', 'Origin': 'https://www.sooplive.co.kr' }
    })
    if (!res.ok) { console.log(`[soopInfo] ${soopId} HTTP ${res.status}`); return null }
    const data = await res.json()
    const station = data?.station
    if (!station) { console.log(`[soopInfo] ${soopId} station 없음`); return null }

    // API 응답 필드 전체 로그 (처음 한번만 확인용)
    console.log(`[soopInfo] ${soopId} keys:`, Object.keys(station).join(', '))

    // 가능한 모든 프사 필드 시도
    const profile_img =
      station.profile_img ||
      station.user_img ||
      station.profile_image ||
      station.station_logo ||
      station.user_id_logo ||
      soopCdnUrl(soopId)

    console.log(`[soopInfo] ${soopId} nick=${station.user_nick} img=${profile_img}`)

    return {
      nickname: station.user_nick || null,
      profile_img
    }
  } catch(e) { console.log(`[soopInfo] ${soopId} 오류:`, e.message); return null }
}

async function fetchNickname(soopId) {
  const info = await fetchSoopInfo(soopId)
  return info?.nickname || null
}

// ── 크루 ──────────────────────────────────────────────
router.get('/crews', (req, res) => {
  const crews = db.prepare('SELECT * FROM crews ORDER BY sort_order, id').all()
  res.json(crews)
})

router.post('/crews', adminOnly, (req, res) => {
  const { name, color = '#6366f1', sort_order = 0, logo_url = '' } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    const result = db.prepare(
      'INSERT INTO crews (name, color, logo_url, sort_order) VALUES (?, ?, ?, ?)'
    ).run(name, color, logo_url, sort_order)
    res.json({ id: result.lastInsertRowid, name, color, logo_url, sort_order })
  } catch (e) {
    res.status(400).json({ error: '이미 존재하는 크루명입니다' })
  }
})

router.put('/crews/:id', adminOnly, (req, res) => {
  try {
    const { name, color, sort_order, logo_url = '' } = req.body
    db.prepare('UPDATE crews SET name=?, color=?, sort_order=?, logo_url=? WHERE id=?')
      .run(name, color, sort_order, logo_url, req.params.id)
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

  // SOOP에서 닉네임 + 프사 자동 가져오기
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

    // 현재 달 데이터 즉시 수집
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

  // 지난달 계산
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
    crewMap[crew.id] = {
      id: crew.id,
      name: crew.name,
      color: crew.color,
      logo_url: crew.logo_url || '',
      sort_order: crew.sort_order,
      members: [],
      total: 0,
      prev_total: 0,
      avg: 0
    }
  }

  for (const row of rows) {
    if (!crewMap[row.crew_id]) continue
    crewMap[row.crew_id].members.push({
      id: row.id,
      soop_id: row.soop_id,
      name: row.name,
      profile_img: row.profile_img,
      balloons: row.balloons,
      daily_balloons: row.daily_balloons,
      yesterday_diff: row.balloons - row.yesterday_balloons,
      prev_balloons: row.prev_balloons,
      is_new: row.is_new,
      sort_order: row.sort_order
    })
    crewMap[row.crew_id].total += row.balloons
    crewMap[row.crew_id].prev_total += row.prev_balloons
  }

  const crews = Object.values(crewMap).map(c => ({
    ...c,
    avg: c.members.length > 0 ? Math.round(c.total / c.members.length) : 0
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
      members: [], total: 0, prev_total: 0, avg: 0
    }
  }

  for (const row of rows) {
    if (!crewMap[row.crew_id]) continue
    crewMap[row.crew_id].members.push({
      id: row.id, soop_id: row.soop_id, name: row.name,
      profile_img: row.profile_img,
      balloons: row.viewers,
      daily_balloons: 0,
      yesterday_diff: row.viewers - row.yesterday_viewers,
      prev_balloons: row.prev_viewers,
      is_new: row.is_new, sort_order: row.sort_order
    })
    crewMap[row.crew_id].total += row.viewers
    crewMap[row.crew_id].prev_total += row.prev_viewers
  }

  const crews = Object.values(crewMap).map(c => ({
    ...c,
    avg: c.members.length > 0 ? Math.round(c.total / c.members.length) : 0
  })).sort((a, b) => b.avg - a.avg)

  res.json({ year, month, prevYear, prevMonth, crews })
})

// ── 수동 수집 트리거 ─────────────────────────────────
router.post('/collect', adminOnly, async (req, res) => {
  res.json({ ok: true, message: '수집 시작' })
  collectAll().catch(console.error)
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
  console.log(`[collect-prev] ${member.name}(${member.soop_id}): ${prevYear}/${prevMonth} → ${total.toLocaleString()}`)
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


// ── naksoo 실시간 크롤링 ─────────────────────────────
// ── 관리자 인증 ───────────────────────────────────────
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'poong2026'

function adminOnly(req, res, next) {
  const token = req.headers['x-admin-token']
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '관리자 권한이 필요합니다' })
  }
  next()
}

const CREW_COLORS = ["#ff6b9d","#ffd93d","#6bcb77","#4d96ff","#ff6b6b","#c77dff","#ff9a3c"]

// naksoo는 React SPA라 HTML 크롤링 불가 → poong.today category API 사용
async function fetchNaksooData() {
  try {
    const res = await fetch('https://naksoo.vercel.app/', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
        'Accept': 'text/html,application/xhtml+xml' 
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const crewMatches = [...html.matchAll(/##\s+(.+)/g)]
    const seenCrews = new Set()
    const crews = []
    for (const m of crewMatches) {
      const name = m[1].trim()
      if (!seenCrews.has(name) && name !== '문의 / 요청') {
        seenCrews.add(name)
        crews.push({ name, index: m.index })
      }
    }

    const result = {}
    for (let i = 0; i < crews.length; i++) {
      const start = crews[i].index
      const end = i + 1 < crews.length ? crews[i + 1].index : html.length
      const section = html.slice(start, end)
      const members = []
      const seen = new Set()
      let match
      const re = /profile\.img\.sooplive\.com\/LOGO\/[a-z0-9]{2}\/([^\/]+)\/\1\.jpg/g
      while ((match = re.exec(section)) !== null) {
        if (!seen.has(match[1])) {
          seen.add(match[1])
          members.push(match[1])
        }
      }
      result[crews[i].name] = members
    }

    const crewCount = Object.keys(result).length
    const memberCount = Object.values(result).reduce((s, v) => s + v.length, 0)
    
    if (crewCount > 0 && memberCount > 10) {
      console.log(`[naksoo] 크롤링 성공: 크루 ${crewCount}개, 멤버 ${memberCount}명`)
      return result
    }
    throw new Error(`파싱 결과 부족: 크루 ${crewCount}, 멤버 ${memberCount}`)

  } catch(e) {
    console.log('[naksoo] 크롤링 실패, 백업 데이터 사용:', e.message)
    return NAKSOO_BACKUP
  }
}

// 백업 데이터 (poong.today API 실패 시)
const NAKSOO_BACKUP = {
  "광우상사":  ["iluvbin","pms999","fall1128","dbstmf3497","yui0902","qor0919","kkok7816","andoong0227","hellparty1","ektnrnrgml","hhyounooo"],
  "씨나인":    ["leeso0403","epsthddus","alwl1047","lcy011027","jkmjkm1236","dlswldus107","yunyeson3015","chocho12","oosuoey","ayoona","luaa0803","dhtnqls1238","ksdd7856"],
  "YXL":       ["sladk51","jaeha010","meldoy777","wk3220","zbxlzzz","asy1218","smkim82372","offside629","star49","tkek55","ahrum0912","fhwm0602","iluvpp","jeewon1202"],
  "이노레이블": ["baek224983","flowerboogie","bc3yu2fl","yeeeee00","sonhj2244","nooree","qkrrkgml1231","lia0322","nrini1213","duzzangg","ss2312","sul0509","522222m"],
  "정선컴퍼니": ["yin3745","whdbstn7","seola1420","lllloq","xgyuri2","yuyu0929","kariveal","your75","hhy789","youxzu","elixxir","yulbee","coqhal1992"],
  "GD컴퍼니":  ["inaa04","kyhkyh825","dbswn2312","pinepine0","jssisabel","jungym0116","haeri0324"],
  "더케이":    ["vvkk80","yhm777","kerin0308","dreamch77","pu1030","sso123","kcktksal12","eeseuu","elleeayo","damikim","mxxjiaa2358","onevley77","ssoi0911"]
}

router.post('/import-naksoo', adminOnly, async (req, res) => {
  const results = { crews_added: 0, crews_skipped: 0, members_added: 0, members_skipped: 0 }
  const naksooData = await fetchNaksooData()

  let colorIdx = db.prepare('SELECT COUNT(*) as c FROM crews').get().c

  for (const [crewName, soopIds] of Object.entries(naksooData)) {
    // 크루 없으면 추가
    let crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(crewName)
    if (!crew) {
      const color = CREW_COLORS[colorIdx % CREW_COLORS.length]
      const result = db.prepare(
        'INSERT INTO crews (name, color, sort_order) VALUES (?, ?, ?)'
      ).run(crewName, color, colorIdx + 1)
      crew = { id: result.lastInsertRowid }
      results.crews_added++
      console.log(`[import] 크루 추가: ${crewName}`)
    } else {
      results.crews_skipped++
    }
    colorIdx++

    // 멤버 추가 - 닉네임/프사는 CDN URL로 빠르게 처리
    for (let i = 0; i < soopIds.length; i++) {
      const soopId = soopIds[i]
      const exists = db.prepare('SELECT id FROM members WHERE soop_id = ?').get(soopId)
      if (exists) {
        // 비활성 멤버면 다시 활성화
        if (!exists.is_active) {
          db.prepare('UPDATE members SET is_active=1, crew_id=? WHERE soop_id=?').run(crew.id, soopId)
        }
        results.members_skipped++
        continue
      }

      const profile_img = soopCdnUrl(soopId)
      db.prepare(
        'INSERT INTO members (soop_id, name, crew_id, sort_order, profile_img, is_active) VALUES (?,?,?,?,?,1)'
      ).run(soopId, soopId, crew.id, i + 1, profile_img) // 닉네임 임시로 soopId
      results.members_added++
    }
  }

  // 닉네임 백그라운드 업데이트
  res.json({ ok: true, ...results })
  console.log('[naksoo] 임포트 완료:', results, '→ 닉네임 수집 시작')

  // 닉네임 없는 멤버들 백그라운드에서 업데이트
  const noName = db.prepare("SELECT id, soop_id FROM members WHERE name = soop_id AND is_active = 1").all()
  for (const m of noName) {
    const info = await fetchSoopInfo(m.soop_id)
    if (info?.nickname) {
      db.prepare('UPDATE members SET name=?, profile_img=? WHERE id=?')
        .run(info.nickname, info.profile_img || soopCdnUrl(m.soop_id), m.id)
    }
    await new Promise(r => setTimeout(r, 200))
  }
  console.log('[naksoo] 닉네임 업데이트 완료')
})


// ── naksoo 동기화 diff 확인 ──────────────────────────
router.get('/sync-naksoo/diff', adminOnly, async (req, res) => {
  // 실시간 naksoo 크롤링
  const naksooData = await fetchNaksooData()

  const added = []    // 낙수에만 있음 (추가 필요)
  const removed = []  // 내 DB에만 있음 (삭제 후보)
  const moved = []    // 크루 이동

  for (const [crewName, soopIds] of Object.entries(naksooData)) {
    for (const soopId of soopIds) {
      const member = db.prepare(
        'SELECT m.*, c.name as crew_name FROM members m JOIN crews c ON m.crew_id = c.id WHERE m.soop_id = ? AND m.is_active = 1'
      ).get(soopId)

      if (!member) {
        // 내 DB에 없음 → 추가 후보
        const info = await fetchSoopInfo(soopId)
        added.push({
          soop_id: soopId,
          name: info?.nickname || soopId,
          profile_img: info?.profile_img || soopCdnUrl(soopId),
          crew_name: crewName
        })
      } else if (member.crew_name !== crewName) {
        // 크루가 다름 → 이동 후보
        moved.push({
          soop_id: soopId,
          name: member.name,
          from_crew: member.crew_name,
          to_crew: crewName
        })
      }
    }
  }

  // 내 DB에는 있는데 낙수에 없는 멤버 → 삭제 후보 (낙수 크루 소속 멤버만 비교)
  const allNaksooIds = Object.values(naksooData).flat()
  const naksooCrewNames = Object.keys(naksooData)
  const myMembers = db.prepare(
    'SELECT m.soop_id, m.name, c.name as crew_name FROM members m JOIN crews c ON m.crew_id = c.id WHERE m.is_active = 1'
  ).all()

  for (const m of myMembers) {
    // 낙수 크루 소속 멤버만 비교 (문의/요청 같은 커스텀 크루는 제외)
    if (naksooCrewNames.includes(m.crew_name) && !allNaksooIds.includes(m.soop_id)) {
      removed.push({ soop_id: m.soop_id, name: m.name, crew_name: m.crew_name })
    }
  }

  res.json({ added, removed, moved, total: added.length + removed.length + moved.length })
})

// ── naksoo 동기화 적용 ───────────────────────────────
router.post('/sync-naksoo/apply', adminOnly, async (req, res) => {
  const { added = [], removed = [], moved = [] } = req.body
  const results = { added: 0, removed: 0, moved: 0 }

  // 동기화 전 DB 백업
  try {
    const dbPath = join(__dirname, '../data.db')
    const backupDir = join(__dirname, '../backups')
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    copyFileSync(dbPath, join(backupDir, `data-${ts}.db`))
    const files = readdirSync(backupDir).filter(f => f.endsWith('.db')).sort()
    if (files.length > 5) files.slice(0, files.length - 5).forEach(f => unlinkSync(join(backupDir, f)))
    console.log(`[backup] DB 백업 완료: data-${ts}.db`)
  } catch(e) { console.warn('[backup] 백업 실패:', e.message) }

  // 낙수 크루 목록
  const naksooData = await fetchNaksooData()
  const validCrewNames = Object.keys(naksooData)

  // 추가
  for (const m of added) {
    // 낙수에 없는 크루명이면 스킵
    if (!validCrewNames.includes(m.crew_name)) continue
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

  // 삭제 (비활성화)
  for (const m of removed) {
    db.prepare('UPDATE members SET is_active = 0 WHERE soop_id = ?').run(m.soop_id)
    results.removed++
  }

  // 크루 이동
  for (const m of moved) {
    const crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(m.to_crew)
    if (crew) {
      db.prepare('UPDATE members SET crew_id = ? WHERE soop_id = ?').run(crew.id, m.soop_id)
      results.moved++
    }
  }

  console.log('[sync] 적용 완료:', results)
  res.json({ ok: true, ...results })
})


// ── 팬 랭킹 ──────────────────────────────────────────
router.get('/fan-ranking/:soopId', async (req, res) => {
  const { soopId } = req.params
  const year = req.query.year || new Date().getFullYear()
  const month = req.query.month || (new Date().getMonth() + 1)

  try {
    const url = `https://static.poong.today/bj/detail/get?id=${soopId}&year=${year}&month=${month}`
    console.log('[fan] 요청 URL:', url)
    const r = await fetch(url, { headers: POONG_HEADERS })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    console.log('[fan] 응답 keys:', Object.keys(data), 'f 길이:', (data.f||[]).length)

    // f 배열이 팬랭킹
    const fans = (data.f || []).slice(0, 10).map((f, i) => ({
      rank: i + 1,
      soop_id: f.i,
      name: f.n,
      balloons: f.b,
      count: f.c,
      profile_img: `https://profile.img.sooplive.co.kr/LOGO/${f.i.slice(0,2).toLowerCase()}/${f.i}/${f.i}.jpg`
    }))

    res.json({ ok: true, soop_id: soopId, year, month, fans })
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// 서버 시작 시 자동 임포트 함수 (index.js에서 호출)
// ── 관리자 로그인 ────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    res.json({ ok: true, token: ADMIN_PASSWORD })
  } else {
    res.status(401).json({ ok: false, error: '비밀번호가 틀렸어요' })
  }
})
// ── 비밀번호 변경 ────────────────────────────────────
router.post('/admin/change-password', adminOnly, (req, res) => {
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 해요' })
  try {
    const envPath = join(__dirname, '../.env')
    writeFileSync(envPath, `ADMIN_PASSWORD=${newPassword}\n`)
    ADMIN_PASSWORD = newPassword
    res.json({ ok: true })
  } catch(e) {
    res.status(500).json({ error: '저장 실패: ' + e.message })
  }
})


// ── DB 백업 목록 조회 ────────────────────────────────
router.get('/backups', adminOnly, (req, res) => {
  try {
    const backupDir = join(__dirname, '../backups')
    if (!existsSync(backupDir)) return res.json({ backups: [] })
    const files = readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .sort().reverse()
      .map(f => ({ name: f, time: f.replace('data-', '').replace('.db', '').replace('T', ' ') }))
    res.json({ backups: files })
  } catch(e) { res.json({ backups: [] }) }
})

// ── DB 백업 복원 ────────────────────────────────────
router.post('/backups/restore', adminOnly, (req, res) => {
  const { name } = req.body
  try {
    const backupDir = join(__dirname, '../backups')
    const dbPath = join(__dirname, '../data.db')
    const backupPath = join(backupDir, name)
    if (!existsSync(backupPath)) return res.status(404).json({ error: '백업 파일 없음' })
    copyFileSync(backupPath, dbPath)
    console.log(`[restore] DB 복원 완료: ${name}`)
    res.json({ ok: true, message: `${name} 복원 완료. 서버를 재시작해주세요.` })
  } catch(e) { res.status(500).json({ error: e.message }) }
})


// ── 낙수에 없는 크루 조회/삭제 ───────────────────────
router.get('/unknown-crews', adminOnly, async (req, res) => {
  try {
    const naksooData = await fetchNaksooData()
    const naksooCrewNames = Object.keys(naksooData)
    const allCrews = db.prepare('SELECT * FROM crews').all()
    const unknown = allCrews.filter(c => !naksooCrewNames.includes(c.name))
    res.json({ crews: unknown })
  } catch(e) { res.json({ crews: [] }) }
})

router.delete('/unknown-crews/:id', adminOnly, (req, res) => {
  db.prepare('UPDATE members SET is_active=0 WHERE crew_id=?').run(req.params.id)
  db.prepare('DELETE FROM crews WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

export async function autoImportNaksoo() {
  try {
    const naksooData = await fetchNaksooData()
    let crewsAdded = 0, membersAdded = 0
    let colorIdx = db.prepare('SELECT COUNT(*) as c FROM crews').get().c

    // 낙수에 없는 크루 자동 비활성화 (문의/요청 등)
    const naksooCrewNames = Object.keys(naksooData)
    const allCrews = db.prepare('SELECT * FROM crews').all()
    for (const crew of allCrews) {
      if (!naksooCrewNames.includes(crew.name)) {
        db.prepare('UPDATE members SET is_active=0 WHERE crew_id=?').run(crew.id)
        db.prepare('DELETE FROM crews WHERE id=?').run(crew.id)
        console.log(`[자동임포트] 낙수에 없는 크루 삭제: ${crew.name}`)
      }
    }

    for (const [crewName, soopIds] of Object.entries(naksooData)) {
      let crew = db.prepare('SELECT id FROM crews WHERE name = ?').get(crewName)
      if (!crew) {
        const color = CREW_COLORS[colorIdx % CREW_COLORS.length]
        const r = db.prepare('INSERT INTO crews (name, color, sort_order) VALUES (?,?,?)').run(crewName, color, colorIdx + 1)
        crew = { id: r.lastInsertRowid }
        crewsAdded++
        console.log(`[자동임포트] 크루 추가: ${crewName}`)
      }
      colorIdx++

      for (let i = 0; i < soopIds.length; i++) {
        const soopId = soopIds[i]
        const exists = db.prepare('SELECT id, is_active FROM members WHERE soop_id = ?').get(soopId)
        if (!exists) {
          db.prepare('INSERT INTO members (soop_id, name, crew_id, sort_order, profile_img, is_active) VALUES (?,?,?,?,?,1)')
            .run(soopId, soopId, crew.id, i + 1, soopCdnUrl(soopId))
          membersAdded++
        } else if (!exists.is_active) {
          db.prepare('UPDATE members SET is_active=1, crew_id=? WHERE soop_id=?').run(crew.id, soopId)
          membersAdded++
        }
      }
    }

    if (crewsAdded > 0 || membersAdded > 0) {
      console.log(`[자동임포트] 완료 - 크루 +${crewsAdded}, 멤버 +${membersAdded}`)
      // 닉네임 없는 멤버 백그라운드 업데이트
      const noName = db.prepare("SELECT id, soop_id FROM members WHERE name = soop_id AND is_active = 1").all()
      for (const m of noName) {
        const info = await fetchSoopInfo(m.soop_id)
        if (info?.nickname) {
          db.prepare('UPDATE members SET name=?, profile_img=? WHERE id=?')
            .run(info.nickname, info.profile_img || soopCdnUrl(m.soop_id), m.id)
        }
        await new Promise(r => setTimeout(r, 200))
      }
    } else {
      console.log('[자동임포트] 변경사항 없음')
    }
  } catch(e) {
    console.warn('[자동임포트] 실패:', e.message)
  }
}

export default router

// ── 프사 일괄 업데이트 ─────────────────────────────
router.post('/update-profiles', adminOnly, async (req, res) => {
  const members = db.prepare('SELECT id, soop_id FROM members WHERE is_active = 1').all()
  res.json({ ok: true, message: `${members.length}명 프사 업데이트 시작` })
  
  for (const m of members) {
    const info = await fetchSoopInfo(m.soop_id)
    // fetchSoopInfo가 CDN URL 폴백 포함하므로 항상 값 있음
    const profile_img = info?.profile_img || soopCdnUrl(m.soop_id)
    db.prepare('UPDATE members SET profile_img=? WHERE id=?').run(profile_img, m.id)
    console.log(`[profile] ${m.soop_id}: ${profile_img}`)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('[profile] 일괄 업데이트 완료')
})
