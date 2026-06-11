import db from '../db/connection.js'

const POONG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://poonggo.com/',
  'Origin': 'https://poonggo.com',
}

function getKST() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() }
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// 풍고 신규 API: /api/monthly?date=YYYY-MM&ids=id1,id2,...
async function fetchMonthlyByIds(year, month, ids) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}`
  const url = `https://poonggo.com/api/monthly?date=${dateStr}&ids=${ids.join(',')}`
  try {
    const res = await fetch(url, { headers: POONG_HEADERS })
    if (!res.ok) { console.error(`[fetch] 월별 HTTP ${res.status}`); return [] }
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.data || [])
    return list
  } catch(e) { console.error(`[fetch] 월별 실패:`, e.message); return [] }
}

// 풍고 신규 API: /api/daily?date=YYYY-MM-DD&ids=id1,id2,...
async function fetchDailyByIds(year, month, day, ids) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const url = `https://poonggo.com/api/daily?date=${dateStr}&ids=${ids.join(',')}`
  try {
    const res = await fetch(url, { headers: POONG_HEADERS })
    if (!res.ok) { console.error(`[fetch] 일별 HTTP ${res.status}`); return [] }
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.data || [])
    return list
  } catch(e) { console.error(`[fetch] 일별 실패:`, e.message); return [] }
}

// 전체 id 목록을 100개씩 나눠서 월별 수집
async function fetchMonthlyAll_new(year, month, ids) {
  const chunks = chunkArray(ids, 100)
  const results = []
  for (const chunk of chunks) {
    const list = await fetchMonthlyByIds(year, month, chunk)
    results.push(...list)
  }
  console.log(`[fetch] 월별 ${results.length}명 수집 완료`)
  return results
}

// 전체 id 목록을 100개씩 나눠서 일별 수집
async function fetchDailyAll_new(year, month, day, ids) {
  const chunks = chunkArray(ids, 100)
  const results = []
  for (const chunk of chunks) {
    const list = await fetchDailyByIds(year, month, day, chunk)
    results.push(...list)
  }
  console.log(`[fetch] 일별 ${results.length}명 수집 완료`)
  return results
}

// 하위호환용 (api.js의 fetchMonthlyAll import 유지)
export async function fetchMonthlyAll(year, month) {
  const members = db.prepare('SELECT soop_id FROM members WHERE is_active = 1').all()
  const ids = members.map(m => m.soop_id).filter(Boolean)
  if (ids.length === 0) return []
  const list = await fetchMonthlyAll_new(year, month, ids)
  return list.map(item => ({
    i: item.id,
    b: item.amt || 0,
    n: item.nick,
  }))
}

export async function collectAll() {
  const { year, month, day } = getKST()

  // 수집 대상: 활성 멤버 + 수장
  const members = db.prepare('SELECT soop_id, name FROM members WHERE is_active = 1').all()
  const crews = db.prepare('SELECT master_soop_id FROM crews WHERE master_soop_id IS NOT NULL').all()
  const masterIds = crews.map(c => c.master_soop_id).filter(Boolean)
  const memberIdSet = new Set(members.map(m => m.soop_id))

  const allTargets = [...members]
  for (const masterId of masterIds) {
    if (!memberIdSet.has(masterId)) allTargets.push({ soop_id: masterId, name: `[수장]${masterId}` })
  }

  if (allTargets.length === 0) { console.log('[collect] 등록된 멤버 없음'); return }

  const allIds = allTargets.map(t => t.soop_id).filter(Boolean)
  console.log(`[collect] ${year}년 ${month}월 ${day}일 - 총 ${allTargets.length}명 수집 시작`)

  // ── 월별 수집 (amt + cview) ──────────────────────────────
  const monthList = await fetchMonthlyAll_new(year, month, allIds)
  const monthMap = {}   // id → { amt, cview, broadTime }
  for (const item of monthList) {
    if (item.id) monthMap[item.id] = { amt: item.amt || 0, cview: item.cview || 0, broadTime: item.broadTime || 0 }
  }

  // ── 일별 수집 (daily amt) ────────────────────────────────
  const dayList = await fetchDailyAll_new(year, month, day, allIds)
  const dayMap = {}   // id → daily amt
  for (const item of dayList) {
    if (item.id) dayMap[item.id] = item.amt || 0
  }

  // ── DB 저장 ──────────────────────────────────────────────
  const upsertBalloon = db.prepare(`
    INSERT INTO balloon_snapshots (soop_id, year, month, day, total_balloons, daily_balloons)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(soop_id, year, month, day) DO UPDATE SET
      total_balloons = excluded.total_balloons,
      daily_balloons = excluded.daily_balloons,
      fetched_at = datetime('now')
  `)

  const upsertViewer = db.prepare(`
    INSERT INTO viewer_snapshots (soop_id, year, month, total_viewers, daily_viewers)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT(soop_id, year, month) DO UPDATE SET
      total_viewers = excluded.total_viewers,
      fetched_at = datetime('now')
  `)

  const saveTx = db.transaction((targets) => {
    for (const target of targets) {
      const sid = target.soop_id
      const monthly = monthMap[sid] ?? { amt: 0, cview: 0 }
      const dailyAmt = dayMap[sid] ?? 0

      upsertBalloon.run(sid, year, month, day, monthly.amt, dailyAmt)
      console.log(`[collect] ${target.name}(${sid}): 풍선 ${monthly.amt.toLocaleString()} (+${dailyAmt.toLocaleString()}) / 뷰어 ${monthly.cview.toLocaleString()}`)
    }
    // 뷰어쉽은 멤버만 (수장 제외)
    for (const member of members) {
      const sid = member.soop_id
      const cview = monthMap[sid]?.cview ?? 0
      upsertViewer.run(sid, year, month, cview)
    }
  })

  saveTx(allTargets)
  console.log('[collect] 완료 (출처: https://poonggo.com)')
}