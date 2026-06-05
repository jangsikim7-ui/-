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

// 풍고 API: month 파라미터는 반드시 YYYY-MM 형식
async function fetchMonthly(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const url = `https://poonggo.com/api/get?month=${monthStr}`
  try {
    const res = await fetch(url, { headers: POONG_HEADERS })
    if (!res.ok) { console.error(`[fetch] 월별 HTTP ${res.status}`); return null }
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.data || [])
    console.log(`[fetch] 월별 ${list.length}명 (풍고 API)`)
    return list
  } catch(e) { console.error(`[fetch] 월별 실패:`, e.message); return null }
}

// 일별 수집 비활성화 (풍고 미지원, 나중에 활성화 예정)
// async function fetchDaily(year, month, day) {
//   const url = `https://static.poong.today/chart/get?ctype=day&ks=false&year=${year}&month=${month}&day=${day}`
//   try {
//     const res = await fetch(url, { headers: POONG_HEADERS })
//     if (!res.ok) { console.error(`[fetch] 일별 HTTP ${res.status}`); return null }
//     const data = await res.json()
//     const list = Array.isArray(data) ? data : (data.b || [])
//     console.log(`[fetch] 일별 ${list.length}명`)
//     return list
//   } catch(e) { console.error(`[fetch] 일별 실패:`, e.message); return null }
// }

export async function fetchMonthlyAll(year, month) {
  const list = await fetchMonthly(year, month)
  if (!list) return null
  // 풍고 필드: id → i, amt → b, name → n 으로 정규화
  return list.map(item => ({
    i: item.id,
    b: item.amt || 0,
    n: item.name,
  }))
}

export async function collectAll() {
  const { year, month, day } = getKST()
  const members = db.prepare('SELECT soop_id, name FROM members WHERE is_active = 1').all()

  // 수장 soop_id 목록 추가 수집 (중복 제거)
  const crews = db.prepare('SELECT master_soop_id FROM crews WHERE master_soop_id IS NOT NULL').all()
  const masterIds = crews.map(c => c.master_soop_id).filter(Boolean)
  const memberIds = new Set(members.map(m => m.soop_id))

  // 수장 중 멤버에 없는 것만 추가
  const allTargets = [...members]
  for (const masterId of masterIds) {
    if (!memberIds.has(masterId)) {
      allTargets.push({ soop_id: masterId, name: `[수장]${masterId}` })
    }
  }

  if (allTargets.length === 0) { console.log('[collect] 등록된 멤버 없음'); return }
  console.log(`[collect] ${year}년 ${month}월 ${day}일 - 멤버 ${members.length}명 + 수장 ${masterIds.length}명 수집 시작`)

  // 월별만 수집 (일별은 풍고 미지원으로 비활성화)
  const monthList = await fetchMonthly(year, month)
  if (!monthList) { console.error('[collect] 월별 데이터 실패'); return }

  const monthMap = {}
  const viewerMonthMap = {}
  for (const item of monthList) {
    if (item.id) {
      monthMap[item.id] = item.amt || 0
      viewerMonthMap[item.id] = item.v || 0  // 풍고 미제공시 0
    }
  }

  const upsertBalloon = db.prepare(`
    INSERT INTO balloon_snapshots (soop_id, year, month, day, total_balloons, daily_balloons)
    VALUES (?, ?, ?, ?, ?, 0)
    ON CONFLICT(soop_id, year, month, day) DO UPDATE SET
      total_balloons = excluded.total_balloons,
      daily_balloons = 0,
      fetched_at = datetime('now')
  `)
  const upsertViewer = db.prepare(`
    INSERT INTO viewer_snapshots (soop_id, year, month, total_viewers, daily_viewers)
    VALUES (?, ?, ?, ?, 0)
    ON CONFLICT(soop_id, year, month) DO UPDATE SET
      total_viewers = excluded.total_viewers,
      daily_viewers = 0,
      fetched_at = datetime('now')
  `)

  // 일반 멤버 + 수장 모두 balloon_snapshots에 저장
  for (const target of allTargets) {
    const total = monthMap[target.soop_id] ?? 0
    upsertBalloon.run(target.soop_id, year, month, day, total)
    console.log(`[collect] ${target.name}(${target.soop_id}): 풍선 ${total.toLocaleString()}`)
  }

  // 뷰어십은 일반 멤버만 (풍고 미지원으로 0 유지)
  for (const member of members) {
    const totalViewers = viewerMonthMap[member.soop_id] ?? 0
    upsertViewer.run(member.soop_id, year, month, totalViewers)
  }

  console.log('[collect] 완료 (출처: https://poonggo.com)')
}