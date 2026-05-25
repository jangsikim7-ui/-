<template>
  <div class="honor-wrap">
    <!-- 헤더 -->
    <div class="honor-header">
      <div class="honor-title-row">
        <span class="honor-crown-icon">
          <i class="ti ti-trophy" />
        </span>
        <span class="honor-title">이달의 명예</span>
        <span class="honor-period">{{ year }}.{{ String(month).padStart(2,'0') }}</span>
      </div>
      <div class="honor-group-tabs">
        <button class="hg-tab" :class="{ active: localGroup === 'excel' }" @click="localGroup = 'excel'">
          <i class="ti ti-users" />엑셀크루
        </button>
        <button class="hg-tab hg-bora" :class="{ active: localGroup === 'bora' }" @click="localGroup = 'bora'">
          <i class="ti ti-crown" />보라엑셀크루
        </button>
      </div>
    </div>

    <!-- 로딩 & 에러 -->
    <div v-if="loading" class="honor-loading">
      <div class="spin" /><span>순위 불러오는 중...</span>
    </div>
    <div v-else-if="error" class="honor-error">{{ error }}</div>

    <!-- 콘텐츠 -->
    <div v-else class="honor-cols">

      <!-- ① 크루 평균 순위 -->
      <div class="hcol hcol-avg">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-avg">
            <i class="ti ti-chart-bar" />
          </div>
          <div class="hcol-head-text">
            <div class="hcol-title hcol-title-avg">크루 평균 순위</div>
            <div class="hcol-sub hcol-sub-avg">평균 별풍선 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="avgRanked[pos]">
              <div class="pod-av-wrap">
                <div class="pod-av" :class="'pod-av-'+(pos+1)">
                  <img v-if="avgRanked[pos].logo_url" :src="avgRanked[pos].logo_url" class="pod-img pod-img-sq" @error="e => e.target.style.display='none'" />
                  <div v-else class="pod-initial" :style="{ background: avgRanked[pos].color + '22', color: avgRanked[pos].color }">{{ avgRanked[pos].name.charAt(0) }}</div>
                </div>
              </div>
              <div class="pod-name">{{ avgRanked[pos].name }}</div>
              <div class="pod-score" :class="'score-'+(pos+1)">{{ fmt(avgRanked[pos].avg) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)">
                <span class="stage-label">{{ pos===0?'1ST':pos===1?'2ND':'3RD' }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="rank-divider" />
        <div class="rank-list">
          <div v-for="(crew, i) in avgRanked.slice(3)" :key="crew.id" class="rank-row">
            <div class="rank-bar-bg" :style="{ width: pctOf(crew.avg, avgRanked[0]?.avg)+'%', background: crew.color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-thumb">
                <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="rank-initial-sm" :style="{ background: crew.color+'22', color: crew.color }">{{ crew.name.charAt(0) }}</div>
              </div>
              <span class="rank-name">{{ crew.name }}</span>
              <span class="rank-val">{{ fmt(crew.avg) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ② 크루 매출 순위 -->
      <div class="hcol hcol-master">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-master">
            <i class="ti ti-crown" />
          </div>
          <div class="hcol-head-text">
            <div class="hcol-title hcol-title-master">크루 매출 순위</div>
            <div class="hcol-sub hcol-sub-master">크루 매출풍 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="masterRanked[pos]">
              <div class="pod-av-wrap">
                <div class="pod-av" :class="'pod-av-'+(pos+1)">
                  <img v-if="masterRanked[pos].logo_url" :src="masterRanked[pos].logo_url" class="pod-img pod-img-sq" @error="e => e.target.style.display='none'" />
                  <div v-else class="pod-initial" :style="{ background: masterRanked[pos].color + '22', color: masterRanked[pos].color }">{{ masterRanked[pos].name.charAt(0) }}</div>
                </div>
              </div>
              <div class="pod-name">{{ masterRanked[pos].name }}</div>
              <div class="pod-score" :class="'score-'+(pos+1)">{{ fmt(masterRanked[pos].master_balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)">
                <span class="stage-label">{{ pos===0?'1ST':pos===1?'2ND':'3RD' }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="rank-divider" />
        <div class="rank-list">
          <div v-for="(crew, i) in masterRanked.slice(3)" :key="crew.id" class="rank-row">
            <div class="rank-bar-bg" :style="{ width: pctOf(crew.master_balloons, masterRanked[0]?.master_balloons)+'%', background: crew.color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-thumb">
                <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="rank-initial-sm" :style="{ background: crew.color+'22', color: crew.color }">{{ crew.name.charAt(0) }}</div>
              </div>
              <span class="rank-name">{{ crew.name }}</span>
              <span class="rank-val">{{ fmt(crew.master_balloons) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ③ 개인 TOP 10 -->
      <div class="hcol hcol-indiv">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-indiv">
            <i class="ti ti-medal" />
          </div>
          <div class="hcol-head-text">
            <div class="hcol-title hcol-title-indiv">개인 TOP 10</div>
            <div class="hcol-sub hcol-sub-indiv">전체 멤버 별풍선 순위</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="indivRanked[pos]">
              <div class="pod-av-wrap">
                <div class="pod-av pod-av-circle" :class="'pod-av-'+(pos+1)">
                  <img :src="indivRanked[pos].profile_img || cdnUrl(indivRanked[pos].soop_id)" class="pod-img" @error="onImgError($event, indivRanked[pos].soop_id)" />
                </div>
              </div>
              <div class="pod-name">{{ indivRanked[pos].name }}</div>
              <div class="pod-crew-chip" :style="{ background: indivRanked[pos].crew_color+'20', color: indivRanked[pos].crew_color, borderColor: indivRanked[pos].crew_color+'50' }">{{ indivRanked[pos].crew_name }}</div>
              <div class="pod-score" :class="'score-'+(pos+1)">{{ fmt(indivRanked[pos].balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)">
                <span class="stage-label">{{ pos===0?'1ST':pos===1?'2ND':'3RD' }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="rank-divider" />
        <div class="rank-list">
          <div v-for="(m, i) in indivRanked.slice(3)" :key="m.id" class="rank-row">
            <div class="rank-bar-bg" :style="{ width: pctOf(m.balloons, indivRanked[0]?.balloons)+'%', background: m.crew_color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-thumb rank-thumb-circle">
                <img :src="m.profile_img || cdnUrl(m.soop_id)" class="rank-profile" :style="{ borderColor: m.crew_color }" @error="onImgError($event, m.soop_id)" />
              </div>
              <span class="rank-name">{{ m.name }}</span>
              <span class="rank-crew-chip-sm" :style="{ background: m.crew_color+'20', color: m.crew_color, borderColor: m.crew_color+'50' }">{{ m.crew_name }}</span>
              <span class="rank-val">{{ fmt(m.balloons) }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../composables/useApi.js'

const props = defineProps({
  activeGroup: { type: String, default: 'excel' },
  year: Number,
  month: Number
})

const localGroup = ref(props.activeGroup)
const loading = ref(false)
const error = ref('')
const crewData = ref([])

const podiumOrder = [1, 0, 2]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.getStats(props.year, props.month, localGroup.value)
    crewData.value = data.crews || []
  } catch(e) {
    error.value = '불러오기 실패: ' + e.message
  }
  loading.value = false
}

watch(localGroup, load)
watch(() => [props.year, props.month], load)
onMounted(load)

const avgRanked = computed(() =>
  [...crewData.value].sort((a, b) => b.avg - a.avg)
)

const masterRanked = computed(() =>
  [...crewData.value]
    .filter(c => c.master_soop_id && c.master_balloons > 0)
    .sort((a, b) => b.master_balloons - a.master_balloons)
)

const indivRanked = computed(() => {
  const all = []
  for (const crew of crewData.value) {
    for (const m of crew.members) {
      all.push({ ...m, crew_name: crew.name, crew_color: crew.color })
    }
  }
  return all.sort((a, b) => b.balloons - a.balloons).slice(0, 10)
})

function fmt(n) { return (n || 0).toLocaleString('ko-KR') }
function pctOf(val, max) { return max ? Math.min(100, Math.round((val / max) * 100)) : 0 }
function cdnUrl(soopId) {
  const p = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${p}/${soopId}/${soopId}.jpg`
}
function onImgError(e, soopId) {
  const cdn = cdnUrl(soopId)
  if (e.target.src !== cdn) e.target.src = cdn
  else e.target.style.display = 'none'
}
</script>

<style scoped>
/* ═══════════════════════════════════════
   기본 래퍼
═══════════════════════════════════════ */
.honor-wrap {
  padding: 20px 24px 48px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ═══════════════════════════════════════
   헤더
═══════════════════════════════════════ */
.honor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.honor-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.honor-crown-icon {
  font-size: 20px;
  color: #ffd028;
  filter: drop-shadow(0 0 6px rgba(255, 208, 40, 0.8)) drop-shadow(0 0 16px rgba(255, 180, 0, 0.5));
}
.honor-title {
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.5px;
}
.honor-period {
  font-size: 14px;
  color: var(--text3);
  font-weight: 600;
  background: var(--bg4);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
}
.honor-group-tabs { display: flex; gap: 8px; }
.hg-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg3);
  color: var(--text3);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.hg-tab.active {
  background: rgba(74, 158, 255, 0.12);
  border-color: #4a9eff;
  color: #90c8ff;
  box-shadow: 0 0 16px rgba(74, 158, 255, 0.25), inset 0 0 16px rgba(74, 158, 255, 0.05);
}
.hg-bora.active {
  background: rgba(153, 68, 204, 0.12);
  border-color: #9944cc;
  color: #cc88ff;
  box-shadow: 0 0 16px rgba(153, 68, 204, 0.25), inset 0 0 16px rgba(153, 68, 204, 0.05);
}

/* ═══════════════════════════════════════
   로딩/에러
═══════════════════════════════════════ */
.honor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px;
  color: var(--text3);
  font-size: 14px;
}
.spin {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border);
  border-top-color: #ffd028;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
.honor-error { color: #ff6b6b; text-align: center; padding: 40px; }

/* ═══════════════════════════════════════
   3열 레이아웃
═══════════════════════════════════════ */
.honor-cols {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

/* ═══════════════════════════════════════
   컬럼 카드 — 다크모드 기본
═══════════════════════════════════════ */
.hcol {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
/* 다크모드에서만 컬러 테두리+글로우 */
[data-theme="dark"] .hcol-avg {
  border-color: rgba(255, 208, 40, 0.4);
  box-shadow: 0 0 20px rgba(255, 200, 40, 0.12), 0 0 50px rgba(255, 180, 0, 0.06);
}
[data-theme="dark"] .hcol-master {
  border-color: rgba(255, 140, 20, 0.4);
  box-shadow: 0 0 20px rgba(255, 140, 20, 0.12), 0 0 50px rgba(255, 120, 0, 0.06);
}
[data-theme="dark"] .hcol-indiv {
  border-color: rgba(60, 210, 110, 0.4);
  box-shadow: 0 0 20px rgba(60, 210, 110, 0.12), 0 0 50px rgba(40, 190, 90, 0.06);
}
/* 라이트모드 테두리 */
[data-theme="light"] .hcol-avg { border-color: rgba(180, 130, 0, 0.4); }
[data-theme="light"] .hcol-master { border-color: rgba(190, 80, 0, 0.4); }
[data-theme="light"] .hcol-indiv { border-color: rgba(20, 150, 70, 0.4); }

/* ── 헤더 ── */
.hcol-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--bg4);
}
.hcol-avg .hcol-head {
  background: rgba(255, 200, 40, 0.08);
  border-bottom-color: rgba(255, 200, 40, 0.2);
}
.hcol-master .hcol-head {
  background: rgba(255, 140, 20, 0.08);
  border-bottom-color: rgba(255, 140, 20, 0.2);
}
.hcol-indiv .hcol-head {
  background: rgba(60, 210, 110, 0.08);
  border-bottom-color: rgba(60, 210, 110, 0.2);
}

/* 아이콘 박스 */
.hcol-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid;
}
.hcol-icon i { font-size: 19px; }

.hcol-icon-avg {
  background: rgba(255, 200, 40, 0.12);
  color: #ffd028;
  border-color: rgba(255, 200, 40, 0.4);
  box-shadow: 0 0 12px rgba(255, 200, 40, 0.35), inset 0 0 8px rgba(255, 200, 40, 0.08);
}
.hcol-icon-master {
  background: rgba(255, 140, 20, 0.12);
  color: #ff9820;
  border-color: rgba(255, 140, 20, 0.4);
  box-shadow: 0 0 12px rgba(255, 140, 20, 0.35), inset 0 0 8px rgba(255, 140, 20, 0.08);
}
.hcol-icon-indiv {
  background: rgba(60, 210, 110, 0.12);
  color: #3cd278;
  border-color: rgba(60, 210, 110, 0.4);
  box-shadow: 0 0 12px rgba(60, 210, 110, 0.35), inset 0 0 8px rgba(60, 210, 110, 0.08);
}

.hcol-head-text { display: flex; flex-direction: column; gap: 3px; }

/* 제목 — 다크모드: 흰색 + 네온 */
.hcol-title {
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: -0.3px;
}
.hcol-title-avg  { text-shadow: 0 0 8px rgba(255, 208, 40, 0.7), 0 0 20px rgba(255, 180, 0, 0.4); }
.hcol-title-master { text-shadow: 0 0 8px rgba(255, 152, 32, 0.7), 0 0 20px rgba(255, 120, 0, 0.4); }
.hcol-title-indiv  { text-shadow: 0 0 8px rgba(60, 210, 110, 0.7), 0 0 20px rgba(40, 190, 90, 0.4); }

/* 서브타이틀 — 다크모드 */
.hcol-sub { font-size: 11px; font-weight: 600; }
.hcol-sub-avg    { color: #c9960a; text-shadow: 0 0 6px rgba(201, 150, 10, 0.6); }
.hcol-sub-master { color: #c87010; text-shadow: 0 0 6px rgba(200, 112, 16, 0.6); }
.hcol-sub-indiv  { color: #28a060; text-shadow: 0 0 6px rgba(40, 160, 96, 0.6); }

/* ═══════════════════════════════════════
   포디움
═══════════════════════════════════════ */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  padding: 24px 12px 0;
}
.pod {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.pod-0 { order: 2; }
.pod-1 { order: 1; margin-top: 14px; }
.pod-2 { order: 3; margin-top: 22px; }

.pod-av-wrap { position: relative; display: inline-block; margin-bottom: 4px; }
.pod-av {
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid;
}
.pod-av-circle { border-radius: 50%; }
.pod-av:not(.pod-av-circle) { border-radius: 12px; }

.pod-av-1 {
  width: 64px; height: 64px;
  border-color: #ffd028;
  box-shadow: 0 0 0 2px rgba(255,208,40,0.2), 0 0 12px rgba(255,208,40,0.8), 0 0 28px rgba(255,180,0,0.45), 0 0 50px rgba(255,160,0,0.2);
}
.pod-av-2 {
  width: 52px; height: 52px;
  border-color: #b8c8d8;
  box-shadow: 0 0 0 2px rgba(184,200,216,0.2), 0 0 10px rgba(184,200,216,0.7), 0 0 22px rgba(160,185,210,0.4), 0 0 40px rgba(140,170,200,0.15);
}
.pod-av-3 {
  width: 44px; height: 44px;
  border-color: #d07830;
  box-shadow: 0 0 0 2px rgba(208,120,48,0.2), 0 0 10px rgba(208,120,48,0.65), 0 0 22px rgba(180,90,20,0.35), 0 0 40px rgba(160,70,10,0.15);
}

.pod-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pod-img-sq { object-fit: contain; background: transparent; padding: 4px; }
.pod-initial {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 20px;
}

.pod-name {
  font-size: 11px; font-weight: 800; color: var(--text);
  text-align: center; max-width: 84px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pod-crew-chip {
  font-size: 9px; padding: 2px 7px; border-radius: 8px;
  font-weight: 800; border: 1px solid; white-space: nowrap;
  max-width: 80px; overflow: hidden; text-overflow: ellipsis;
}
.pod-score { font-size: 11px; font-weight: 900; letter-spacing: -0.4px; }
.score-1 { color: #ffd028; text-shadow: 0 0 8px rgba(255,208,40,0.7); }
.score-2 { color: #b8c8d8; text-shadow: 0 0 6px rgba(184,200,216,0.5); }
.score-3 { color: #d07830; text-shadow: 0 0 6px rgba(208,120,48,0.5); }

/* 시상대 */
.pod-stage {
  width: 100%; border-radius: 3px 3px 0 0;
  position: relative; display: flex;
  align-items: flex-start; justify-content: center;
}
.stage-1 {
  height: 40px;
  background: linear-gradient(180deg, rgba(255,208,40,0.18) 0%, rgba(255,180,0,0.04) 100%);
  border-top: 2px solid #ffd028;
  box-shadow: 0 -5px 20px rgba(255,208,40,0.22), inset 0 1px 0 rgba(255,220,80,0.15);
}
.stage-2 {
  height: 28px;
  background: linear-gradient(180deg, rgba(184,200,216,0.14) 0%, rgba(160,180,210,0.03) 100%);
  border-top: 2px solid #b8c8d8;
  box-shadow: 0 -4px 14px rgba(184,200,216,0.16);
}
.stage-3 {
  height: 20px;
  background: linear-gradient(180deg, rgba(208,120,48,0.14) 0%, rgba(180,90,20,0.03) 100%);
  border-top: 2px solid #d07830;
  box-shadow: 0 -4px 14px rgba(208,120,48,0.16);
}
.stage-label {
  position: absolute; top: 7px; left: 50%; transform: translateX(-50%);
  font-size: 9px; font-weight: 900; letter-spacing: 0.8px; white-space: nowrap;
}
.stage-1 .stage-label { color: #ffd028; text-shadow: 0 0 8px rgba(255,208,40,0.9); }
.stage-2 .stage-label { color: #b8c8d8; text-shadow: 0 0 6px rgba(184,200,216,0.6); }
.stage-3 .stage-label { color: #d07830; text-shadow: 0 0 6px rgba(208,120,48,0.6); }

/* ═══════════════════════════════════════
   4위~ 리스트
═══════════════════════════════════════ */
.rank-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0 12px; }
.rank-list {
  padding: 8px 10px 14px;
  display: flex; flex-direction: column; gap: 2px;
}
.rank-row {
  position: relative; border-radius: 8px; overflow: hidden;
  transition: background 0.15s; cursor: default;
}
.rank-row:hover { background: rgba(255,255,255,0.03); }
.rank-bar-bg {
  position: absolute; top: 0; left: 0; bottom: 0;
  opacity: 0.30; border-radius: 8px 0 0 8px;
  transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
  min-width: 4px;
}
.rank-content {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 7px; padding: 6px 10px;
}
.rank-num { font-size: 10px; font-weight: 800; color: var(--text3); width: 14px; text-align: center; flex-shrink: 0; }
.rank-thumb { flex-shrink: 0; width: 26px; height: 26px; }
.rank-logo {
  width: 26px; height: 26px; border-radius: 6px;
  object-fit: contain; display: block; background: transparent; padding: 2px;
}
.rank-profile {
  width: 26px; height: 26px; border-radius: 50%;
  object-fit: cover; border: 1.5px solid; display: block;
}
.rank-initial-sm {
  width: 26px; height: 26px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800;
}
.rank-name {
  flex: 1; font-size: 11px; font-weight: 700; color: var(--text2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rank-crew-chip-sm {
  font-size: 9px; padding: 1px 6px; border-radius: 5px;
  font-weight: 800; border: 1px solid; flex-shrink: 0; white-space: nowrap;
}
.rank-val {
  font-size: 10px; font-weight: 800; color: var(--text3);
  flex-shrink: 0; letter-spacing: -0.3px; font-variant-numeric: tabular-nums;
}

/* ═══════════════════════════════════════
   라이트모드 오버라이드
   data-theme="light" 기준으로만 통일
═══════════════════════════════════════ */

/* 아이콘 박스 */
:global([data-theme='light']) .hcol-icon-avg {
  background: rgba(255, 200, 40, 0.15);
  color: #9a6500;
  border-color: rgba(180, 130, 0, 0.4);
  box-shadow: 0 0 8px rgba(180, 130, 0, 0.15);
}
:global([data-theme='light']) .hcol-icon-master {
  background: rgba(255, 140, 20, 0.15);
  color: #a04000;
  border-color: rgba(190, 80, 0, 0.4);
  box-shadow: 0 0 8px rgba(190, 80, 0, 0.15);
}
:global([data-theme='light']) .hcol-icon-indiv {
  background: rgba(60, 210, 110, 0.15);
  color: #0e7a38;
  border-color: rgba(20, 150, 70, 0.4);
  box-shadow: 0 0 8px rgba(20, 150, 70, 0.15);
}

/* 제목 — 라이트모드: 진한 색 + 그림자 없음 */
:global([data-theme='light']) .hcol-title-avg    { color: #7a5000; text-shadow: none; }
:global([data-theme='light']) .hcol-title-master { color: #7a3200; text-shadow: none; }
:global([data-theme='light']) .hcol-title-indiv  { color: #0a6030; text-shadow: none; }

/* 서브타이틀 */
:global([data-theme='light']) .hcol-sub-avg    { color: #9a6500; text-shadow: none; }
:global([data-theme='light']) .hcol-sub-master { color: #9a4500; text-shadow: none; }
:global([data-theme='light']) .hcol-sub-indiv  { color: #0a7030; text-shadow: none; }

/* 탭 active */
:global([data-theme='light']) .hg-tab.active {
  background: rgba(74, 158, 255, 0.10);
  color: #1055b0;
  box-shadow: 0 0 10px rgba(74, 158, 255, 0.15);
}
:global([data-theme='light']) .hg-bora.active {
  background: rgba(153, 68, 204, 0.10);
  color: #6a10aa;
  box-shadow: 0 0 10px rgba(153, 68, 204, 0.15);
}

/* 포디움 이름 */
:global([data-theme='light']) .pod-name { color: #1a1a2e; }

/* 점수 */
:global([data-theme='light']) .score-1 { color: #9a6500; text-shadow: none; }
:global([data-theme='light']) .score-2 { color: #4a6070; text-shadow: none; }
:global([data-theme='light']) .score-3 { color: #8a3800; text-shadow: none; }

/* 시상대 */
:global([data-theme='light']) .stage-1 {
  background: linear-gradient(180deg, rgba(255,208,40,0.12) 0%, rgba(255,180,0,0.01) 100%);
  box-shadow: 0 -3px 10px rgba(200,160,0,0.15);
}
:global([data-theme='light']) .stage-1 .stage-label { color: #9a6500; text-shadow: none; }
:global([data-theme='light']) .stage-2 .stage-label { color: #4a6070; text-shadow: none; }
:global([data-theme='light']) .stage-3 .stage-label { color: #8a3800; text-shadow: none; }

/* 구분선 */
:global([data-theme='light']) .rank-divider { background: rgba(0,0,0,0.08); }

/* 리스트 hover */
:global([data-theme='light']) .rank-row:hover { background: rgba(0,0,0,0.04); }

/* 바 투명도 낮춤 (밝은 배경에서 과하지 않게) */
:global([data-theme='light']) .rank-bar-bg { opacity: 0.15; }

/* rank-num / rank-name / rank-val 은 var(--text3)/var(--text2)/var(--text3) 변수로 자동처리 */

/* 로딩 스핀 */
:global([data-theme='light']) .spin { border-top-color: #9a6500; }

/* honor-crown-icon */
:global([data-theme='light']) .honor-crown-icon {
  filter: drop-shadow(0 0 4px rgba(180, 130, 0, 0.5));
}

/* ═══════════════════════════════════════
   반응형
═══════════════════════════════════════ */
@media (max-width: 1100px) {
  .honor-cols { grid-template-columns: 1fr; }
  .honor-wrap { padding: 16px 16px 40px; }
  .rank-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
}
@media (max-width: 600px) {
  .honor-header { flex-direction: column; align-items: flex-start; }
  .rank-list { grid-template-columns: 1fr; }
  .pod-av-1 { width: 54px; height: 54px; }
  .pod-av-2 { width: 44px; height: 44px; }
  .pod-av-3 { width: 38px; height: 38px; }
}
</style>