import db from './db/connection.js'

function soopCdnUrl(soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

export function fixBase64Profiles() {
  try {
    const members = db.prepare('SELECT id, soop_id, profile_img FROM members').all()
    let count = 0
    for (const m of members) {
      if (m.profile_img && m.profile_img.startsWith('data:')) {
        const url = soopCdnUrl(m.soop_id)
        db.prepare('UPDATE members SET profile_img=? WHERE id=?').run(url, m.id)
        count++
      }
    }
    if (count > 0) console.log(`[fix-profiles] base64 → URL 변환 완료: ${count}명`)
    else console.log('[fix-profiles] 수정할 항목 없음')
  } catch(e) {
    console.log('[fix-profiles] 오류:', e.message)
  }
}