<template>
  <div class="battle-overlay" @click.self="$emit('close')">
    <div class="battle-modal">
      <!-- 헤더 -->
      <div class="battle-header">
        <h2 class="battle-title">⚔️ 크루 대결 분석</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="battle-body">
        <!-- 1단계: 크루 선택 -->
        <div v-if="!result" class="select-section">
          <div class="select-desc">두 크루를 선택해 화력을 비교해보세요</div>
          <div class="select-row">
            <div class="select-box">
              <div class="select-label">크루 1</div>
              <select v-model="crewAId" class="select-input">
                <option value="">크루 선택...</option>
                <option v-for="c in availableCrews" :key="c.id" :value="c.id" :disabled="c.id === crewBId">{{ c.name }}</option>
              </select>
              <div v-if="crewA" class="preview-mini" :style="{ '--c': crewA.color }">
                <img v-if="crewA.logo_url" :src="crewA.logo_url" class="preview-logo" />
                <div v-else class="preview-logo-fb">{{ crewA.name.charAt(0) }}</div>
                <div class="preview-info">
                  <div class="preview-name">{{ crewA.name }}</div>
                  <div class="preview-stat">{{ crewA.members.length }}명 · {{ fmt(crewA.total) }}</div>
                </div>
              </div>
            </div>
            <div class="vs-mid">VS</div>
            <div class="select-box">
              <div class="select-label">크루 2</div>
              <select v-model="crewBId" class="select-input">
                <option value="">크루 선택...</option>
                <option v-for="c in availableCrews" :key="c.id" :value="c.id" :disabled="c.id === crewAId">{{ c.name }}</option>
              </select>
              <div v-if="crewB" class="preview-mini" :style="{ '--c': crewB.color }">
                <img v-if="crewB.logo_url" :src="crewB.logo_url" class="preview-logo" />
                <div v-else class="preview-logo-fb">{{ crewB.name.charAt(0) }}</div>
                <div class="preview-info">
                  <div class="preview-name">{{ crewB.name }}</div>
                  <div class="preview-stat">{{ crewB.members.length }}명 · {{ fmt(crewB.total) }}</div>
                </div>
              </div>
            </div>
          </div>
          <button class="btn-battle" @click="runBattle" :disabled="!crewAId || !crewBId">⚔️ 대결 시작</button>
        </div>

        <!-- 2단계: 결과 -->
        <div v-else class="result-section">
          <!-- 상단 크루 카드 -->
          <div class="vs-cards">
            <div class="vs-card" :style="{ '--c': crewA.color }">
              <div class="vs-logo-wrap">
                <img v-if="crewA.logo_url" :src="crewA.logo_url" class="vs-logo" />
                <div v-else class="vs-logo-fb">{{ crewA.name.charAt(0) }}</div>
              </div>
              <div class="vs-name">{{ crewA.name }}</div>
              <div class="vs-quick">
                <div class="quick-item"><span class="quick-label">멤버</span><span class="quick-val">{{ crewA.members.length }}명</span></div>
                <div class="quick-item"><span class="quick-label">총 풍선</span><span class="quick-val accent">{{ fmt(crewA.total) }}</span></div>
              </div>
            </div>
            <div class="vs-big">VS</div>
            <div class="vs-card" :style="{ '--c': crewB.color }">
              <div class="vs-logo-wrap">
                <img v-if="crewB.logo_url" :src="crewB.logo_url" class="vs-logo" />
                <div v-else class="vs-logo-fb">{{ crewB.name.charAt(0) }}</div>
              </div>
              <div class="vs-name">{{ crewB.name }}</div>
              <div class="vs-quick">
                <div class="quick-item"><span class="quick-label">멤버</span><span class="quick-val">{{ crewB.members.length }}명</span></div>
                <div class="quick-item"><span class="quick-label">총 풍선</span><span class="quick-val accent">{{ fmt(crewB.total) }}</span></div>
              </div>
            </div>
          </div>

          <!-- 항목별 비교 -->
          <div class="comp-list">
            <div v-for="item in result.items" :key="item.label" class="comp-item">
              <div class="comp-header">
                <div class="comp-label">{{ item.icon }} {{ item.label }}</div>
                <div class="comp-badge" :class="'b-'+item.badgeType">{{ item.badge }}</div>
              </div>
              <div class="comp-bars">
                <div class="comp-side">
                  <div class="bar-track"><div class="bar-fill" :style="{ width: item.barA + '%', background: crewA.color }"></div></div>
                  <div class="bar-num" :style="{ color: crewA.color }">{{ item.valueA }}</div>
                </div>
                <div class="comp-side">
                  <div class="bar-track"><div class="bar-fill" :style="{ width: item.barB + '%', background: crewB.color }"></div></div>
                  <div class="bar-num" :style="{ color: crewB.color }">{{ item.valueB }}</div>
                </div>
              </div>
              <div class="comp-desc">{{ item.desc }}</div>
            </div>
          </div>

          <!-- 종합 결과 -->
          <div class="winner-card" :style="{ '--c': result.winnerColor }">
            <div class="winner-label">🏆 종합 결과</div>
            <div class="winner-name">{{ result.winnerName }}</div>
            <div class="winner-score">
              <span class="score-a">{{ result.scoreA }}승</span>
              <span class="score-d">{{ result.draws }}무</span>
              <span class="score-b">{{ result.scoreB }}패</span>
            </div>
          </div>

          <!-- 전력 분석 리포트 -->
          <div class="report-section">
            <div class="report-title">📋 전력 분석 리포트</div>
            <div class="report-cards">

              <!-- 크루 A -->
              <div class="report-card" :style="{ '--c': crewA.color }">
                <div class="report-crew-header">
                  <img v-if="crewA.logo_url" :src="crewA.logo_url" class="report-logo" />
                  <div v-else class="report-logo-fb">{{ crewA.name.charAt(0) }}</div>
                  <div class="report-crew-name">{{ crewA.name }}</div>
                  <div class="report-style-badge">{{ result.insightA.style }}</div>
                </div>
                <div class="report-summary">{{ result.insightA.summary }}</div>
                <div class="report-block strength-block">
                  <div class="report-block-title"><span class="block-icon">💪</span> 강점</div>
                  <ul class="report-list">
                    <li v-for="s in result.insightA.strengths" :key="s">{{ s }}</li>
                  </ul>
                </div>
                <div class="report-block weakness-block">
                  <div class="report-block-title"><span class="block-icon">⚠️</span> 문제점</div>
                  <ul class="report-list">
                    <li v-for="w in result.insightA.weaknesses" :key="w">{{ w }}</li>
                  </ul>
                </div>
                <div class="report-verdict"><span class="verdict-icon">⚔️</span>{{ result.insightA.verdict }}</div>
              </div>

              <!-- 크루 B -->
              <div class="report-card" :style="{ '--c': crewB.color }">
                <div class="report-crew-header">
                  <img v-if="crewB.logo_url" :src="crewB.logo_url" class="report-logo" />
                  <div v-else class="report-logo-fb">{{ crewB.name.charAt(0) }}</div>
                  <div class="report-crew-name">{{ crewB.name }}</div>
                  <div class="report-style-badge">{{ result.insightB.style }}</div>
                </div>
                <div class="report-summary">{{ result.insightB.summary }}</div>
                <div class="report-block strength-block">
                  <div class="report-block-title"><span class="block-icon">💪</span> 강점</div>
                  <ul class="report-list">
                    <li v-for="s in result.insightB.strengths" :key="s">{{ s }}</li>
                  </ul>
                </div>
                <div class="report-block weakness-block">
                  <div class="report-block-title"><span class="block-icon">⚠️</span> 문제점</div>
                  <ul class="report-list">
                    <li v-for="w in result.insightB.weaknesses" :key="w">{{ w }}</li>
                  </ul>
                </div>
                <div class="report-verdict"><span class="verdict-icon">⚔️</span>{{ result.insightB.verdict }}</div>
              </div>

            </div>
          </div>

          <button class="btn-again" @click="reset">🔄 다른 크루로 비교하기</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  crews: { type: Array, required: true },
  mode: { type: String, default: 'balloon' }
})
defineEmits(['close'])

const crewAId = ref('')
const crewBId = ref('')
const result = ref(null)

const availableCrews = computed(() =>
  props.crews.filter(c => c.members && c.members.length > 0)
)
const crewA = computed(() => props.crews.find(c => c.id === crewAId.value))
const crewB = computed(() => props.crews.find(c => c.id === crewBId.value))

function fmt(n) { return (n || 0).toLocaleString('ko-KR') }

function runBattle() {
  const A = crewA.value
  const B = crewB.value
  if (!A || !B) return

  const items = []
  let scoreA = 0, scoreB = 0, draws = 0

  const avgA = A.avg || 0
  const avgB = B.avg || 0
  const avgMax = Math.max(avgA, avgB)
  const avgDiff = Math.abs(avgA - avgB)
  const avgPct = avgMax > 0 ? avgDiff / avgMax : 0
  let avgBadge, avgBadgeType, avgDesc
  if (avgPct < 0.05) { avgBadge = '박빙'; avgBadgeType = 'tie'; draws++ }
  else if (avgPct < 0.20) { avgBadge = avgA > avgB ? `${A.name} 우위` : `${B.name} 우위`; avgBadgeType = 'win'; avgA > avgB ? scoreA++ : scoreB++ }
  else { avgBadge = avgA > avgB ? `${A.name} 압도` : `${B.name} 압도`; avgBadgeType = 'big'; avgA > avgB ? scoreA++ : scoreB++ }
  avgDesc = avgPct < 0.05 ? `차이 ${fmt(Math.round(avgDiff))}, 거의 동률` : `평균 ${fmt(Math.round(avgDiff))} 차이`
  items.push({ icon: '⚖️', label: '평균 화력 (인당)', valueA: fmt(Math.round(avgA)), valueB: fmt(Math.round(avgB)), barA: avgMax > 0 ? Math.round(avgA / avgMax * 100) : 0, barB: avgMax > 0 ? Math.round(avgB / avgMax * 100) : 0, badge: avgBadge, badgeType: avgBadgeType, desc: avgDesc })

  const top1A = A.members[0]?.balloons || 0
  const top1B = B.members[0]?.balloons || 0
  const depA = A.total > 0 ? top1A / A.total * 100 : 0
  const depB = B.total > 0 ? top1B / B.total * 100 : 0
  const depDiff = Math.abs(depA - depB)
  let depBadge, depBadgeType, depDesc
  if (depDiff < 3) { depBadge = '비슷'; depBadgeType = 'tie' }
  else if (depA > depB) { depBadge = `${A.name} 집중형`; depBadgeType = 'info' }
  else { depBadge = `${B.name} 집중형`; depBadgeType = 'info' }
  depDesc = depDiff < 3 ? '두 크루 모두 비슷한 분포' : `${depA > depB ? A.name : B.name}가 1위에 화력 집중, ${depA > depB ? B.name : A.name}는 분산형`
  items.push({ icon: '👑', label: '1위 의존도 (낮을수록 분산)', valueA: depA.toFixed(1) + '%', valueB: depB.toFixed(1) + '%', barA: Math.round(depA), barB: Math.round(depB), badge: depBadge, badgeType: depBadgeType, desc: depDesc })

  const midA = A.members.slice(5, 10).reduce((s, m) => s + m.balloons, 0)
  const midB = B.members.slice(5, 10).reduce((s, m) => s + m.balloons, 0)
  const midMax = Math.max(midA, midB)
  const midDiff = Math.abs(midA - midB)
  let midBadge, midBadgeType, midDesc
  if (midMax === 0) { midBadge = '데이터 없음'; midBadgeType = 'tie'; draws++ }
  else if (midDiff / midMax < 0.10) { midBadge = '비슷'; midBadgeType = 'tie'; draws++ }
  else { const ratio = midMax / Math.min(midA, midB || 1); midBadge = ratio > 2 ? (midA > midB ? `${A.name} 압도` : `${B.name} 압도`) : (midA > midB ? `${A.name} 우위` : `${B.name} 우위`); midBadgeType = ratio > 2 ? 'big' : 'win'; midA > midB ? scoreA++ : scoreB++ }
  midDesc = midMax > 0 && midDiff / midMax >= 0.10 ? `허리진 화력 ${(midMax / Math.min(midA, midB || 1)).toFixed(1)}배 차이` : '6~10위 멤버 화력 비슷'
  items.push({ icon: '💪', label: '허리진 화력 (6~10위)', valueA: fmt(midA), valueB: fmt(midB), barA: midMax > 0 ? Math.round(midA / midMax * 100) : 0, barB: midMax > 0 ? Math.round(midB / midMax * 100) : 0, badge: midBadge, badgeType: midBadgeType, desc: midDesc })

  const tailA = A.members.slice(-5).reduce((s, m) => s + m.balloons, 0)
  const tailB = B.members.slice(-5).reduce((s, m) => s + m.balloons, 0)
  const tailMax = Math.max(tailA, tailB)
  const tailDiff = Math.abs(tailA - tailB)
  let tailBadge, tailBadgeType, tailDesc
  if (tailMax === 0) { tailBadge = '데이터 없음'; tailBadgeType = 'tie'; draws++ }
  else if (tailDiff / tailMax < 0.10) { tailBadge = '비슷'; tailBadgeType = 'tie'; draws++ }
  else { tailBadge = tailA > tailB ? `${A.name} 우위` : `${B.name} 우위`; tailBadgeType = 'win'; tailA > tailB ? scoreA++ : scoreB++ }
  tailDesc = tailMax > 0 && tailDiff / tailMax >= 0.10 ? `${tailA > tailB ? A.name : B.name}는 하위권 멤버 화력도 탄탄` : '두 크루 모두 비슷한 하위권 분포'
  items.push({ icon: '🔻', label: '하위라인 (꼴찌 5명)', valueA: fmt(tailA), valueB: fmt(tailB), barA: tailMax > 0 ? Math.round(tailA / tailMax * 100) : 0, barB: tailMax > 0 ? Math.round(tailB / tailMax * 100) : 0, badge: tailBadge, badgeType: tailBadgeType, desc: tailDesc })

  const aceA = A.members[0]
  const aceB = B.members[0]
  const aceMax = Math.max(top1A, top1B)
  const aceDiff = Math.abs(top1A - top1B)
  let aceBadge, aceBadgeType, aceDesc
  if (aceMax === 0) { aceBadge = '데이터 없음'; aceBadgeType = 'tie'; draws++ }
  else if (aceDiff / aceMax < 0.05) { aceBadge = '초박빙'; aceBadgeType = 'tie'; draws++ }
  else { aceBadge = top1A > top1B ? `${A.name} 우위` : `${B.name} 우위`; aceBadgeType = 'win'; top1A > top1B ? scoreA++ : scoreB++ }
  aceDesc = aceMax > 0 && aceDiff / aceMax < 0.05 ? `${fmt(aceDiff)} 차이, 거의 동률` : aceMax > 0 ? `에이스 차이 ${fmt(aceDiff)}` : '데이터 없음'
  items.push({ icon: '🥇', label: '에이스 1위 화력', valueA: aceA ? `${aceA.name} ${fmt(top1A)}` : '없음', valueB: aceB ? `${aceB.name} ${fmt(top1B)}` : '없음', barA: aceMax > 0 ? Math.round(top1A / aceMax * 100) : 0, barB: aceMax > 0 ? Math.round(top1B / aceMax * 100) : 0, badge: aceBadge, badgeType: aceBadgeType, desc: aceDesc })

  let winnerName, winnerColor
  if (scoreA > scoreB) { winnerName = `${A.name} 우위`; winnerColor = A.color }
  else if (scoreB > scoreA) { winnerName = `${B.name} 우위`; winnerColor = B.color }
  else { winnerName = '무승부'; winnerColor = '#888' }

  const insightA = generateInsight(A, B, { dep: depA, mid: midA, tail: tailA, top1: top1A, avg: avgA })
  const insightB = generateInsight(B, A, { dep: depB, mid: midB, tail: tailB, top1: top1B, avg: avgB })

  result.value = { items, scoreA, scoreB, draws, winnerName, winnerColor, insightA, insightB }
}

function generateInsight(self, other, stats) {
  const strengths = []
  const weaknesses = []

  const otherMid = other.members.slice(5, 10).reduce((s, m) => s + m.balloons, 0)
  const otherTail = other.members.slice(-5).reduce((s, m) => s + m.balloons, 0)
  const otherAvg = other.avg || 0
  const otherTop1 = other.members[0]?.balloons || 0
  const activeCount = self.members.filter(m => m.balloons >= 10000).length
  const activeRatio = self.members.length > 0 ? activeCount / self.members.length : 0
  const avgRatioPct = otherAvg > 0 ? Math.abs(((stats.avg / otherAvg) - 1) * 100).toFixed(0) : 0

  // 스타일
  let style = ''
  if (stats.dep > 30) style = '에이스 의존형'
  else if (stats.dep < 15 && self.members.length >= 10) style = '균형 분산형'
  else if (self.members.length <= 8) style = '소수 정예형'
  else style = '팀형'

  // 요약
  const summary = stats.avg > otherAvg
    ? `평균 화력 ${fmt(Math.round(stats.avg))}으로 상대보다 ${avgRatioPct}% 높은 ${style} 크루.`
    : `${style} 구조로 운영 중이며, 평균 화력은 상대보다 ${avgRatioPct}% 낮음.`

  // 강점
  if (stats.avg > otherAvg * 1.15) strengths.push(`평균 화력 ${fmt(Math.round(stats.avg))}으로 상대보다 ${avgRatioPct}% 우세`)
  if (stats.dep < 20) strengths.push(`에이스 의존도 ${stats.dep.toFixed(1)}%로 특정 멤버 없어도 안정적`)
  if (stats.mid > otherMid * 1.3 && otherMid > 0) strengths.push(`허리진(6~10위) ${fmt(stats.mid)}으로 상대의 ${(stats.mid / otherMid).toFixed(1)}배`)
  if (stats.tail > otherTail * 1.2 && otherTail > 0) strengths.push(`하위권도 탄탄, 꼴찌 5명 합계 ${fmt(stats.tail)}`)
  if (self.members.length > other.members.length + 2) strengths.push(`${self.members.length}명의 두터운 멤버풀로 물량 우위`)
  if (activeRatio >= 0.85) strengths.push(`전체 ${Math.round(activeRatio * 100)}% 멤버가 활발히 활동 중`)
  if (stats.top1 > otherTop1 * 1.2) strengths.push(`에이스 ${self.members[0]?.name} ${fmt(stats.top1)}으로 상대 에이스 압도`)
  if (strengths.length === 0) strengths.push('전반적으로 균형 잡힌 안정적 구조')

  // 문제점
  if (stats.dep > 25) weaknesses.push(`에이스 의존도 ${stats.dep.toFixed(1)}% — 1위 이탈 시 화력 급락 위험`)
  if (stats.mid < otherMid * 0.7 && otherMid > 0) weaknesses.push(`허리진 ${fmt(stats.mid)}으로 상대 대비 취약, 중간 멤버 육성 필요`)
  if (stats.tail < otherTail * 0.8 && otherTail > 0) weaknesses.push(`하위권 편차 큼, 꼴찌 5명 1인당 평균 ${fmt(Math.round(stats.tail / 5))}`)
  if (activeRatio < 0.6) weaknesses.push(`${Math.round((1 - activeRatio) * 100)}% 멤버가 저활동 상태, 참여율 관리 필요`)
  if (self.members.length < other.members.length - 2 && stats.avg < otherAvg) weaknesses.push(`멤버 ${self.members.length}명으로 상대 대비 물량 열세`)
  if (stats.avg < otherAvg * 0.8) weaknesses.push(`평균 화력 ${fmt(Math.round(stats.avg))}으로 상대보다 ${avgRatioPct}% 낮음`)
  if (weaknesses.length === 0) weaknesses.push('현재 눈에 띄는 약점 없음')

  // 한줄 총평
  let verdict = ''
  if (stats.avg > otherAvg && activeRatio >= 0.8) verdict = '전 라인 고른 화력의 완성형 크루'
  else if (stats.dep > 25) verdict = '에이스 의존 극복이 최우선 과제'
  else if (stats.mid > otherMid * 1.5) verdict = '허리진이 강한 중심형 크루'
  else if (self.members.length <= 8 && stats.avg > otherAvg) verdict = '적은 인원으로 상대를 압도하는 정예 크루'
  else if (stats.avg < otherAvg) verdict = '화력 강화를 위한 멤버 육성이 필요'
  else verdict = '꾸준한 성장세의 안정형 크루'

  return { style, summary, strengths, weaknesses, verdict }
}

function reset() {
  result.value = null
  crewAId.value = ''
  crewBId.value = ''
}
</script>

<style scoped>
.battle-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.78);
  display: flex; align-items: flex-start; justify-content: center;
  z-index: 1000; padding: 40px 20px 20px;
  backdrop-filter: blur(4px); overflow-y: auto;
}
.battle-modal {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 720px; max-height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
}
.battle-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid var(--border);
}
.battle-title { font-size: 17px; font-weight: 800; color: var(--text); }
.close-btn { font-size: 16px; color: var(--text2); padding: 4px 10px; cursor: pointer; border-radius: 7px; transition: all 0.15s; background: none; border: none; }
.close-btn:hover { color: var(--text); background: var(--border); }
.battle-body { padding: 22px 24px; overflow-y: auto; flex: 1; }

.select-section { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 20px 0; }
.select-desc { font-size: 13px; color: var(--text3); }
.select-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: start; width: 100%; }
.select-box { display: flex; flex-direction: column; gap: 8px; }
.select-label { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
.select-input { background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 9px; padding: 10px 12px; font-size: 13px; color: var(--text); font-family: inherit; outline: none; transition: border-color 0.15s; -webkit-appearance: none; appearance: none; }
.select-input:focus { border-color: #4a9eff; }
.select-input option { background: #1e1e2e; color: #ffffff; }
[data-theme="light"] .select-input { background: #ffffff; color: #1a1a2e; }
[data-theme="light"] .select-input option { background: #ffffff; color: #1a1a2e; }
.preview-mini { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: color-mix(in srgb, var(--c) 12%, var(--bg3)); border: 1px solid color-mix(in srgb, var(--c) 35%, var(--border)); border-radius: 10px; }
.preview-logo { width: 36px; height: 36px; object-fit: contain; flex-shrink: 0; }
.preview-logo-fb { width: 36px; height: 36px; border-radius: 8px; background: var(--c); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; }
.preview-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.preview-name { font-size: 13px; font-weight: 800; color: var(--text); }
.preview-stat { font-size: 11px; color: var(--text3); }
.vs-mid { align-self: center; font-size: 18px; font-weight: 900; color: #f5a623; padding-top: 24px; }
.btn-battle { margin-top: 8px; padding: 12px 36px; border-radius: 10px; background: linear-gradient(135deg, #4a9eff, #6b5fff); color: #fff; border: none; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; transition: all 0.18s; box-shadow: 0 4px 12px rgba(74,158,255,0.3); }
.btn-battle:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(74,158,255,0.45); }
.btn-battle:disabled { opacity: 0.4; cursor: not-allowed; }

.result-section { display: flex; flex-direction: column; gap: 14px; }
.vs-cards { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; }
.vs-card { background: linear-gradient(135deg, color-mix(in srgb, var(--c) 18%, var(--bg3)) 0%, var(--bg3) 100%); border: 1.5px solid color-mix(in srgb, var(--c) 45%, var(--border)); border-radius: 14px; padding: 14px 14px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.vs-logo-wrap { width: 50px; height: 50px; }
.vs-logo { width: 50px; height: 50px; object-fit: contain; }
.vs-logo-fb { width: 50px; height: 50px; border-radius: 12px; background: var(--c); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
.vs-name { font-size: 17px; font-weight: 900; color: var(--c); letter-spacing: -0.3px; }
[data-theme="light"] .vs-name { color: color-mix(in srgb, var(--c) 60%, #000); }
.vs-quick { display: flex; gap: 12px; width: 100%; justify-content: center; padding-top: 4px; }
.quick-item { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.quick-label { font-size: 9px; color: var(--text3); font-weight: 600; }
.quick-val { font-size: 13px; font-weight: 800; color: var(--text); }
.quick-val.accent { color: var(--c); }
[data-theme="light"] .quick-val.accent { color: color-mix(in srgb, var(--c) 60%, #000); }
.vs-big { font-size: 26px; font-weight: 900; color: #f5a623; text-shadow: 0 0 12px rgba(245,166,35,0.3); }
[data-theme="light"] .vs-big { text-shadow: none; }

.comp-list { display: flex; flex-direction: column; gap: 10px; }
.comp-item { background: var(--item-bg); border: 1px solid var(--item-border); border-radius: 12px; padding: 12px 14px; }
.comp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.comp-label { font-size: 12px; font-weight: 700; color: var(--text2); }
.comp-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 5px; letter-spacing: 0.2px; }
.b-tie { background: rgba(245,166,35,0.15); color: #f5a623; }
.b-win { background: rgba(76,217,100,0.15); color: #4cd964; }
.b-big { background: rgba(255,77,125,0.15); color: #ff4d7d; }
.b-info { background: rgba(74,158,255,0.15); color: #4a9eff; }
.comp-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.comp-side { display: flex; flex-direction: column; gap: 5px; }
.bar-track { height: 7px; background: var(--bar-bg); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.bar-num { font-size: 13px; font-weight: 800; letter-spacing: -0.3px; }
.comp-desc { font-size: 11px; color: var(--text3); margin-top: 8px; line-height: 1.5; }

.winner-card { background: linear-gradient(135deg, color-mix(in srgb, var(--c) 22%, var(--bg3)) 0%, var(--bg3) 100%); border: 2px solid var(--c); border-radius: 14px; padding: 18px; text-align: center; display: flex; flex-direction: column; gap: 6px; }
.winner-label { font-size: 11px; color: var(--c); letter-spacing: 1.5px; font-weight: 700; }
[data-theme="light"] .winner-label { color: color-mix(in srgb, var(--c) 60%, #000); }
.winner-name { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -0.5px; }
.winner-score { display: flex; justify-content: center; gap: 16px; font-size: 13px; font-weight: 700; }
.score-a { color: #4cd964; }
.score-d { color: var(--text3); }
.score-b { color: #ff4d7d; }

/* ── 전력 분석 리포트 ── */
.report-section { display: flex; flex-direction: column; gap: 12px; }
.report-title {
  font-size: 12px; font-weight: 800; color: var(--text2);
  letter-spacing: 1px; text-transform: uppercase;
  padding-bottom: 8px; border-bottom: 1px solid var(--border);
}
.report-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.report-card {
  background: color-mix(in srgb, var(--c) 6%, var(--bg3));
  border: 1.5px solid color-mix(in srgb, var(--c) 30%, var(--border));
  border-radius: 14px; padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.report-crew-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.report-logo { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
.report-logo-fb { width: 28px; height: 28px; border-radius: 6px; background: var(--c); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.report-crew-name { font-size: 14px; font-weight: 900; color: var(--c); flex: 1; min-width: 0; }
[data-theme="light"] .report-crew-name { color: color-mix(in srgb, var(--c) 60%, #000); }
.report-style-badge { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 20px; background: color-mix(in srgb, var(--c) 20%, var(--bg3)); color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); white-space: nowrap; }
[data-theme="light"] .report-style-badge { color: color-mix(in srgb, var(--c) 60%, #000); }

.report-summary {
  font-size: 11px; color: var(--text2); line-height: 1.6;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--c) 8%, var(--bg2));
  border-radius: 8px;
  border-left: 3px solid var(--c);
}

.report-block { border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.strength-block { background: rgba(76,217,100,0.07); border: 1px solid rgba(76,217,100,0.2); }
.weakness-block { background: rgba(255,77,125,0.07); border: 1px solid rgba(255,77,125,0.2); }
.report-block-title { font-size: 10px; font-weight: 800; display: flex; align-items: center; gap: 4px; letter-spacing: 0.5px; }
.strength-block .report-block-title { color: #4cd964; }
.weakness-block .report-block-title { color: #ff4d7d; }
[data-theme="light"] .strength-block .report-block-title { color: #1e9e3a; }
[data-theme="light"] .weakness-block .report-block-title { color: #d6004a; }
.block-icon { font-size: 12px; }

.report-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.report-list li { font-size: 10.5px; color: var(--text2); line-height: 1.5; padding-left: 12px; position: relative; }
.strength-block .report-list li::before { content: '✓'; position: absolute; left: 0; color: #4cd964; font-size: 9px; font-weight: 800; }
[data-theme="light"] .strength-block .report-list li::before { color: #1e9e3a; }
.weakness-block .report-list li::before { content: '!'; position: absolute; left: 0; color: #ff4d7d; font-size: 9px; font-weight: 800; }
[data-theme="light"] .weakness-block .report-list li::before { color: #d6004a; }

.report-verdict { font-size: 11px; font-weight: 700; color: var(--text); padding: 8px 10px; background: color-mix(in srgb, var(--c) 10%, var(--bg2)); border-radius: 8px; display: flex; align-items: center; gap: 6px; line-height: 1.4; }
.verdict-icon { font-size: 12px; flex-shrink: 0; }

.btn-again { margin-top: 4px; padding: 11px 20px; border-radius: 10px; background: var(--btn-ghost-bg); color: var(--text); border: 1px solid var(--input-border); font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-again:hover { background: var(--input-border); }
</style>
