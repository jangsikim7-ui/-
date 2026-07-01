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
    const text = await res.text()
    if (!text || !text.trim()) { console.error(`[fetch] 월별 빈 응답 (${dateStr})`); return [] }
    const data = JSON.parse(text)
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
    const text = await res.text()
    if (!text || !text.trim()) { console.error(`[fetch] 일별 빈 응답 (${dateStr})`); return [] }
    const data = JSON.parse(text)
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

// 하위호환용 (api.js의 fetchMonthlyAll import 유지) - cview 포함
export async function fetchMonthlyAll(year, month) {
  const members = db.prepare('SELECT soop_id FROM members WHERE is_active = 1').all()
  const ids = members.map(m => m.soop_id).filter(Boolean)
  if (ids.length === 0) return []
  const list = await fetchMonthlyAll_new(year, month, ids)
  return list.map(item => ({
    i: item.id,
    b: item.amt || 0,
    v: item.cview || 0,
    n: item.nick,
  }))
}

// 수집 대상(활성 멤버 + 수장) 구하기
function getTargets() {
  const members = db.prepare('SELECT soop_id, name FROM members WHERE is_active = 1').all()
  const crews = db.prepare('SELECT master_soop_id FROM crews WHERE master_soop_id IS NOT NULL').all()
  const masterIds = crews.map(c => c.master_soop_id).filter(Boolean)
  const memberIdSet = new Set(members.map(m => m.soop_id))
  const allTargets = [...members]
  for (const masterId of masterIds) {
    if (!memberIdSet.has(masterId)) allTargets.push({ soop_id: masterId, name: `[수장]${masterId}` })
  }
  return { members, allTargets, memberIdSet }
}

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

// ── 핵심: 특정 월 수집 (재사용 가능) ──────────────────────
// withDaily=true 면 해당 day의 일별 풍선도 저장 (현재월 수집용)
// withDaily=false 면 월 총합만 갱신 (지난달 마무리/복구용, day=0에 저장)
export async function collectMonth(year, month, day, { withDaily = true } = {}) {
  const { members, allTargets } = getTargets()
  if (allTargets.length === 0) { console.log('[collect] 등록된 멤버 없음'); return { ok: 0 } }

  const allIds = allTargets.map(t => t.soop_id).filter(Boolean)
  console.log(`[collect] ${year}년 ${month}월${withDaily ? ` ${day}일` : ' (월마감)'} - 총 ${allTargets.length}명 수집 시작`)

  // 월별 수집 (amt + cview)
  const monthList = await fetchMonthlyAll_new(year, month, allIds)
  const monthMap = {}
  for (const item of monthList) {
    if (item.id) monthMap[item.id] = { amt: item.amt || 0, cview: item.cview || 0, broadTime: item.broadTime || 0 }
  }

  // 일별 수집 (현재월만)
  let dayMap = {}
  if (withDaily) {
    const dayList = await fetchDailyAll_new(year, month, day, allIds)
    for (const item of dayList) {
      if (item.id) dayMap[item.id] = item.amt || 0
    }
  }

  // DB 저장
  const saveDay = withDaily ? day : 0
  let ok = 0
  for (const target of allTargets) {
    const sid = target.soop_id
    const monthly = monthMap[sid] ?? { amt: 0, cview: 0 }
    const dailyAmt = dayMap[sid] ?? 0
    upsertBalloon.run(sid, year, month, saveDay, monthly.amt, dailyAmt)
    ok++
    console.log(`[collect] ${target.name}(${sid}): 풍선 ${monthly.amt.toLocaleString()} (+${dailyAmt.toLocaleString()}) / 뷰어 ${monthly.cview.toLocaleString()}`)
  }
  // 뷰어는 멤버만
  for (const member of members) {
    const sid = member.soop_id
    const cview = monthMap[sid]?.cview ?? 0
    upsertViewer.run(sid, year, month, cview)
  }
  console.log(`[collect] ${year}년 ${month}월 완료: ${ok}명 (출처: https://poonggo.com)`)
  return { ok }
}

export async function collectAll() {
  const { year, month, day } = getKST()

  // ── 현재월 수집 (일별 포함) ──
  await collectMonth(year, month, day, { withDaily: true })

  // ── 월초 롤오버 마무리: 1~3일이면 지난달 월 총합도 한 번 더 확정 ──
  // 6월 마지막 며칠치가 7월로 넘어가는 문제 방지.
  // 풍고는 과거월도 최종값을 주므로, 지난달 total을 다시 긁어 day=0에 확정 저장.
  if (day <= 3) {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    console.log(`[collect] 월초(${day}일) 감지 → ${prevYear}년 ${prevMonth}월 마감 수집`)
    await collectMonth(prevYear, prevMonth, 0, { withDaily: false })
  }
}
