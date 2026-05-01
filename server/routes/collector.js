import db from '../db/connection.js'

const POONG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://poong.today/',
  'Origin': 'https://poong.today',
}

function getKST() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  }
}

async function fetchMonthly(year, month) {
  const url = `https://static.poong.today/chart/get?ctype=month&ks=false&year=${year}&month=${month}&day=undefined`
  try {
    const res = await fetch(url, { headers: POONG_HEADERS })
    if (!res.ok) { console.error(`[fetch] 월별 HTTP ${res.status}`); return null }
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.b || [])
    console.log(`[fetch] 월별 ${list.length}명`)
    return list
  } catch(e) { console.error(`[fetch] 월별 실패:`, e.message); return null }
}

async function fetchDaily(year, month, day) {
  const url = `https://static.poong.today/chart/get?ctype=day&ks=false&year=${year}&month=${month}&day=${day}`
  try {
    const res = await fetch(url, { headers: POONG_HEADERS })
    if (!res.ok) { console.error(`[fetch] 일별 HTTP ${res.status}`); return null }
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.b || [])
    console.log(`[fetch] 일별 ${list.length}명`)
    return list
  } catch(e) { console.error(`[fetch] 일별 실패:`, e.message); return null }
}

export async function fetchMonthlyAll(year, month) {
  return await fetchMonthly(year, month)
}

export async function collectAll() {
  const { year, month, day } = getKST()

  const members = db.prepare('SELECT soop_id, name FROM members WHERE is_active = 1').all()
  if (members.length === 0) { console.log('[collect] 등록된 멤버 없음'); return }

  console.log(`[collect] ${year}년 ${month}월 ${day}일 - ${members.length}명 수집 시작`)

  const [monthList, dayList] = await Promise.all([
    fetchMonthly(year, month),
    fetchDaily(year, month, day),
  ])

  if (!monthList) { console.error('[collect] 월별 데이터 실패'); return }

  const monthMap = {}
  const viewerMonthMap = {}
  for (const item of monthList) {
    if (item.i) {
      monthMap[item.i] = item.b || 0
      viewerMonthMap[item.i] = item.v || 0
    }
  }

  const dayMap = {}
  const viewerDayMap = {}
  if (dayList) {
    for (const item of dayList) {
      if (item.i) {
        dayMap[item.i] = item.b || 0
        viewerDayMap[item.i] = item.v || 0
      }
    }
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
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(soop_id, year, month) DO UPDATE SET
      total_viewers = excluded.total_viewers,
      daily_viewers = excluded.daily_viewers,
      fetched_at = datetime('now')
  `)

  for (const member of members) {
    const total = monthMap[member.soop_id] ?? 0
    const daily = dayMap[member.soop_id] ?? 0
    const totalViewers = viewerMonthMap[member.soop_id] ?? 0
    const dailyViewers = viewerDayMap[member.soop_id] ?? 0

    upsertBalloon.run(member.soop_id, year, month, day, total, daily)
    upsertViewer.run(member.soop_id, year, month, totalViewers, dailyViewers)

    console.log(`[collect] ${member.name}: 풍선 ${total.toLocaleString()} / 시청자 ${totalViewers.toLocaleString()}`)
  }

  console.log('[collect] 완료')
}
