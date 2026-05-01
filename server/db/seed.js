import db from './connection.js'

// 예시 데이터 - 실제 크루/멤버는 관리자 페이지에서 추가하세요
const exampleCrews = [
  { name: '씨나인', color: '#a855f7', sort_order: 0 },
  { name: 'YXL', color: '#8b5cf6', sort_order: 1 },
  { name: '이노레이블', color: '#3b82f6', sort_order: 2 },
]

const exampleMembers = [
  // 씨나인
  { crew_name: '씨나인', soop_id: 'example1', name: '예시멤버1', sort_order: 0 },
]

// crews 삽입
for (const crew of exampleCrews) {
  db.prepare(`
    INSERT OR IGNORE INTO crews (name, color, sort_order)
    VALUES (?, ?, ?)
  `).run(crew.name, crew.color, crew.sort_order)
}

console.log('[seed] crews:', db.prepare('SELECT COUNT(*) as c FROM crews').get().c, 'rows')
console.log('[seed] Done! 관리자 페이지에서 실제 멤버를 추가하세요.')
