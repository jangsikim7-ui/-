<template>
  <div class="honor-wrap">
    <!-- 헤더 -->
    <div class="honor-header">
      <div class="honor-title-row">
        <span class="honor-crown">🏆</span>
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
          <div class="hcol-icon hcol-icon-avg"><i class="ti ti-chart-bar" /></div>
          <div>
            <div class="hcol-title hcol-title-avg">크루 평균 순위</div>
            <div class="hcol-sub">평균 별풍선 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="avgRanked[pos]">
              <div class="pod-img-outer">
                <div class="pod-img-wrap" :class="'rank-border-'+(pos+1)">
                  <img v-if="avgRanked[pos].logo_url" :src="avgRanked[pos].logo_url" class="pod-logo" @error="e => e.target.style.display='none'" />
                  <div v-else class="pod-initial" :style="{ background: avgRanked[pos].color + '33', color: avgRanked[pos].color }">{{ avgRanked[pos].name.charAt(0) }}</div>
                  <div class="rank-glow" :class="'glow-'+(pos+1)"></div>
                </div>
                <div class="pod-badge" :class="'badge-'+(pos+1)">{{ pos===0?'1st':pos===1?'2nd':'3rd' }}</div>
              </div>
              <div class="pod-name">{{ avgRanked[pos].name }}</div>
              <div class="pod-score" :class="pos===0?'gold-score':pos===1?'silver-score':'bronze-score'">{{ fmt(avgRanked[pos].avg) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(crew, i) in avgRanked.slice(3)" :key="crew.id" class="rank-row">
            <div class="rank-bar-bg" :style="{ width: pctOf(crew.avg, avgRanked[0]?.avg)+'%', background: crew.color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-thumb">
                <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="rank-initial-sm" :style="{ background: crew.color+'33', color: crew.color }">{{ crew.name.charAt(0) }}</div>
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
          <div class="hcol-icon hcol-icon-master"><i class="ti ti-crown" /></div>
          <div>
            <div class="hcol-title hcol-title-master">크루 매출 순위</div>
            <div class="hcol-sub">크루 매출풍 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="masterRanked[pos]">
              <div class="pod-img-outer">
                <div class="pod-img-wrap" :class="'rank-border-'+(pos+1)">
                  <img v-if="masterRanked[pos].logo_url" :src="masterRanked[pos].logo_url" class="pod-logo" @error="e => e.target.style.display='none'" />
                  <div v-else class="pod-initial" :style="{ background: masterRanked[pos].color + '33', color: masterRanked[pos].color }">{{ masterRanked[pos].name.charAt(0) }}</div>
                  <div class="rank-glow" :class="'glow-'+(pos+1)"></div>
                </div>
                <div class="pod-badge" :class="'badge-'+(pos+1)">{{ pos===0?'1st':pos===1?'2nd':'3rd' }}</div>
              </div>
              <div class="pod-name">{{ masterRanked[pos].name }}</div>
              <div class="pod-score" :class="pos===0?'gold-score':pos===1?'silver-score':'bronze-score'">{{ fmt(masterRanked[pos].master_balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(crew, i) in masterRanked.slice(3)" :key="crew.id" class="rank-row">
            <div class="rank-bar-bg" :style="{ width: pctOf(crew.master_balloons, masterRanked[0]?.master_balloons)+'%', background: crew.color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-thumb">
                <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="rank-initial-sm" :style="{ background: crew.color+'33', color: crew.color }">{{ crew.name.charAt(0) }}</div>
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
          <div class="hcol-icon hcol-icon-indiv"><i class="ti ti-medal" /></div>
          <div>
            <div class="hcol-title hcol-title-indiv">개인 TOP 10</div>
            <div class="hcol-sub">전체 멤버 별풍선 순위</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="indivRanked[pos]">
              <div class="pod-img-outer">
                <div class="pod-img-wrap pod-img-circle" :class="'rank-border-'+(pos+1)">
                  <img :src="indivRanked[pos].profile_img || cdnUrl(indivRanked[pos].soop_id)" class="pod-profile" :style="{ borderColor: 'transparent' }" @error="onImgError($event, indivRanked[pos].soop_id)" />
                  <div class="rank-glow" :class="'glow-'+(pos+1)"></div>
                </div>
                <div class="pod-badge" :class="'badge-'+(pos+1)">{{ pos===0?'1st':pos===1?'2nd':'3rd' }}</div>
              </div>
              <div class="pod-name">{{ indivRanked[pos].name }}</div>
              <div class="pod-crew-chip" :style="{ background: indivRanked[pos].crew_color+'22', color: indivRanked[pos].crew_color, borderColor: indivRanked[pos].crew_color+'55' }">{{ indivRanked[pos].crew_name }}</div>
              <div class="pod-score" :class="pos===0?'gold-score':pos===1?'silver-score':'bronze-score'">{{ fmt(indivRanked[pos].balloons) }}</div>
              <div class="pod-stage pod-stage-indiv" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(m, i) in indivRanked.slice(3)" :key="m.id" class="rank-row rank-row-indiv">
            <div class="rank-bar-bg" :style="{ width: pctOf(m.balloons, indivRanked[0]?.balloons)+'%', background: m.crew_color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-thumb rank-thumb-circle">
                <img :src="m.profile_img || cdnUrl(m.soop_id)" class="rank-profile" :style="{ borderColor: m.crew_color }" @error="onImgError($event, m.soop_id)" />
              </div>
              <span class="rank-name">{{ m.name }}</span>
              <span class="rank-crew-chip-sm" :style="{ background: m.crew_color+'22', color: m.crew_color, borderColor: m.crew_color+'55' }">{{ m.crew_name }}</span>
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
   기본 변수 & 래퍼
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
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.honor-title-row { display: flex; align-items: center; gap: 10px; }
.honor-crown {
  font-size: 26px;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 165, 0, 0.5));
}
.honor-title {
  font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -0.5px;
}
.honor-period {
  font-size: 14px; color: var(--text3); font-weight: 600;
  background: var(--bg4); padding: 4px 12px; border-radius: 20px;
  border: 1px solid var(--border);
}

.honor-group-tabs { display: flex; gap: 8px; }
.hg-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 20px; border-radius: 12px;
  border: 1px solid var(--border); background: var(--bg3); color: var(--text3);
  font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s ease;
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
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 80px; color: var(--text3); font-size: 14px;
}
.spin {
  width: 22px; height: 22px;
  border: 2px solid var(--border); border-top-color: #c9960a;
  border-radius: 50%; animation: spin .8s linear infinite;
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
   컬럼 카드 (네온 테두리)
═══════════════════════════════════════ */
.hcol {
  background: linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.3) 100%);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

/* 황금 네온 테두리 - 평균/매출 */
.hcol-avg {
  border: 1px solid rgba(201, 150, 10, 0.5);
  box-shadow:
    0 0 0 1px rgba(201, 150, 10, 0.15),
    0 0 20px rgba(201, 150, 10, 0.12),
    0 0 50px rgba(201, 150, 10, 0.06),
    inset 0 0 30px rgba(201, 150, 10, 0.03);
}
.hcol-master {
  border: 1px solid rgba(255, 200, 50, 0.5);
  box-shadow:
    0 0 0 1px rgba(255, 200, 50, 0.15),
    0 0 20px rgba(255, 200, 50, 0.12),
    0 0 50px rgba(255, 200, 50, 0.06),
    inset 0 0 30px rgba(255, 200, 50, 0.03);
}
/* 초록 네온 테두리 - 개인 */
.hcol-indiv {
  border: 1px solid rgba(107, 203, 119, 0.5);
  box-shadow:
    0 0 0 1px rgba(107, 203, 119, 0.15),
    0 0 20px rgba(107, 203, 119, 0.12),
    0 0 50px rgba(107, 203, 119, 0.06),
    inset 0 0 30px rgba(107, 203, 119, 0.03);
}

/* ── 헤더 ── */
.hcol-head {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
/* 평균 헤더 배경 */
.hcol-avg .hcol-head {
  background: rgba(201, 150, 10, 0.12);
  border-bottom-color: rgba(201, 150, 10, 0.25);
}
/* 매출 헤더 배경 */
.hcol-master .hcol-head {
  background: rgba(255, 200, 50, 0.1);
  border-bottom-color: rgba(255, 200, 50, 0.22);
}
/* 개인 헤더 배경 */
.hcol-indiv .hcol-head {
  background: rgba(107, 203, 119, 0.1);
  border-bottom-color: rgba(107, 203, 119, 0.22);
}
.hcol-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.hcol-icon i { font-size: 18px; }
.hcol-icon-avg  { background: rgba(201,150,10,0.2); color: #e8b820; box-shadow: 0 0 12px rgba(201,150,10,0.4); }
.hcol-icon-master { background: rgba(255,200,50,0.2); color: #ffd040; box-shadow: 0 0 12px rgba(255,200,50,0.4); }
.hcol-icon-indiv { background: rgba(107,203,119,0.2); color: #6bcb77; box-shadow: 0 0 12px rgba(107,203,119,0.4); }

/* 타이틀 네온 글로우 */
.hcol-title { font-size: 15px; font-weight: 800; }
.hcol-title-avg   { color: #e8b820; text-shadow: 0 0 10px rgba(232,184,32,0.6), 0 0 20px rgba(232,184,32,0.3); }
.hcol-title-master { color: #ffd040; text-shadow: 0 0 10px rgba(255,208,64,0.6), 0 0 20px rgba(255,208,64,0.3); }
.hcol-title-indiv  { color: #6bcb77; text-shadow: 0 0 10px rgba(107,203,119,0.6), 0 0 20px rgba(107,203,119,0.3); }
.hcol-sub { font-size: 11px; color: var(--text3); margin-top: 3px; }

/* ═══════════════════════════════════════
   포디움
═══════════════════════════════════════ */
.podium {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 8px; padding: 28px 12px 0; position: relative;
}

.pod {
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; flex: 1; min-width: 0; position: relative;
}
.pod-0 { order: 2; transform: translateY(-10px); }
.pod-1 { order: 1; }
.pod-2 { order: 3; }

/* ── 이미지 + 배지 묶음 래퍼 ── */
.pod-img-outer {
  display: flex; flex-direction: column; align-items: center;
  gap: 0; margin-bottom: 6px;
}

/* ── 프로필 이미지 래퍼 (금/은/동 네온 테두리) ── */
.pod-img-wrap {
  position: relative; flex-shrink: 0;
  border-radius: 12px;
  padding: 3px;
}
.pod-img-circle { border-radius: 50%; }

/* 금색 테두리 + 네온 */
.rank-border-1 {
  background: linear-gradient(135deg, #f6d365, #fda085, #f6d365);
  box-shadow:
    0 0 12px rgba(246, 211, 101, 0.7),
    0 0 24px rgba(246, 211, 101, 0.4),
    0 0 40px rgba(246, 211, 101, 0.2);
}
/* 은색 테두리 + 네온 */
.rank-border-2 {
  background: linear-gradient(135deg, #c8d6e0, #8ec5fc, #c8d6e0);
  box-shadow:
    0 0 10px rgba(200, 214, 224, 0.6),
    0 0 20px rgba(142, 197, 252, 0.3);
}
/* 동색 테두리 + 네온 */
.rank-border-3 {
  background: linear-gradient(135deg, #e8a87c, #c47a3a, #e8a87c);
  box-shadow:
    0 0 10px rgba(232, 168, 124, 0.6),
    0 0 20px rgba(196, 122, 58, 0.3);
}

/* 이미지 안쪽 컨테이너 */
.pod-logo, .pod-profile, .pod-initial {
  display: block;
  border-radius: 9px;
  background: var(--bg4);
}
.pod-profile { border-radius: 50%; object-fit: cover; }
.pod-logo { object-fit: contain; }
.pod-initial {
  display: flex; align-items: center; justify-content: center;
  font-weight: 900;
}

/* 크기 */
.pod-0 .pod-logo, .pod-0 .pod-profile, .pod-0 .pod-initial { width: 64px; height: 64px; font-size: 22px; }
.pod-1 .pod-logo, .pod-1 .pod-profile, .pod-1 .pod-initial { width: 52px; height: 52px; font-size: 17px; }
.pod-2 .pod-logo, .pod-2 .pod-profile, .pod-2 .pod-initial { width: 44px; height: 44px; font-size: 14px; }

/* 네온 글로우 오버레이 */
.rank-glow {
  position: absolute; inset: 0;
  border-radius: inherit;
  pointer-events: none;
  animation: glowPulse 2.5s ease-in-out infinite;
}
.glow-1 { box-shadow: inset 0 0 12px rgba(246, 211, 101, 0.3); }
.glow-2 { box-shadow: inset 0 0 10px rgba(200, 214, 224, 0.2); }
.glow-3 { box-shadow: inset 0 0 10px rgba(232, 168, 124, 0.2); }

@keyframes glowPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pod-name {
  font-size: 12px; font-weight: 800; color: var(--text);
  text-align: center; max-width: 90px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pod-crew-chip {
  font-size: 9px; padding: 2px 7px; border-radius: 8px;
  font-weight: 800; border: 1px solid; white-space: nowrap;
  max-width: 80px; overflow: hidden; text-overflow: ellipsis;
}
.pod-score {
  font-size: 12px; font-weight: 900; letter-spacing: -0.4px;
}
.gold-score   { color: #f6d365; text-shadow: 0 0 8px rgba(246,211,101,0.7); }
.silver-score { color: #c8d6e0; text-shadow: 0 0 6px rgba(200,214,224,0.5); }
.bronze-score { color: #e8a87c; text-shadow: 0 0 6px rgba(232,168,124,0.5); }

/* 1st 2nd 3rd 배지 - 이미지 바로 아래 붙임 */
.pod-badge {
  font-size: 10px; font-weight: 900; padding: 3px 12px;
  border-radius: 20px; letter-spacing: 0.8px;
  margin-top: -2px;
  position: relative; z-index: 3;
}
.badge-1 {
  background: linear-gradient(135deg, #f6d365, #fda085);
  color: #3a2000;
  box-shadow: 0 0 10px rgba(246,211,101,0.6), 0 0 20px rgba(246,211,101,0.3);
}
.badge-2 {
  background: linear-gradient(135deg, #c8d6e0, #8ec5fc);
  color: #1a2a3a;
  box-shadow: 0 0 8px rgba(142,197,252,0.4);
}
.badge-3 {
  background: linear-gradient(135deg, #e8a87c, #c47a3a);
  color: #2a1500;
  box-shadow: 0 0 8px rgba(232,168,124,0.4);
}

/* 시상대 */
.pod-stage {
  width: 100%; border-radius: 4px 4px 0 0;
}
.stage-1 {
  height: 44px;
  background: linear-gradient(180deg, rgba(246,211,101,0.3) 0%, rgba(246,211,101,0.08) 100%);
  border: 1px solid rgba(246,211,101,0.35); border-bottom: none;
  box-shadow: 0 -4px 20px rgba(246,211,101,0.15);
}
.stage-2 {
  height: 32px;
  background: linear-gradient(180deg, rgba(200,214,224,0.2) 0%, rgba(200,214,224,0.05) 100%);
  border: 1px solid rgba(200,214,224,0.25); border-bottom: none;
  box-shadow: 0 -4px 14px rgba(200,214,224,0.1);
}
.stage-3 {
  height: 22px;
  background: linear-gradient(180deg, rgba(232,168,124,0.2) 0%, rgba(232,168,124,0.05) 100%);
  border: 1px solid rgba(232,168,124,0.25); border-bottom: none;
  box-shadow: 0 -4px 14px rgba(232,168,124,0.1);
}

/* ═══════════════════════════════════════
   4위~ 리스트
═══════════════════════════════════════ */
.rank-list {
  padding: 10px 12px 14px;
  display: flex; flex-direction: column; gap: 3px;
}

.rank-row {
  position: relative; border-radius: 10px; overflow: hidden;
  transition: background 0.15s;
}
.rank-row:hover { background: rgba(255,255,255,0.04); }

.rank-bar-bg {
  position: absolute; top: 0; left: 0; bottom: 0;
  opacity: 0.12; border-radius: 10px 0 0 10px;
  transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
  min-width: 4px;
}

.rank-content {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px;
}

.rank-num {
  font-size: 11px; font-weight: 800; color: var(--text3);
  width: 16px; text-align: center; flex-shrink: 0;
}
.rank-thumb { flex-shrink: 0; width: 28px; height: 28px; }
.rank-thumb-circle { }
.rank-logo {
  width: 28px; height: 28px; border-radius: 7px; object-fit: contain; display: block;
}
.rank-profile {
  width: 28px; height: 28px; border-radius: 50%;
  object-fit: cover; border: 2px solid; display: block;
}
.rank-initial-sm {
  width: 28px; height: 28px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800;
}

.rank-name {
  flex: 1; font-size: 12px; font-weight: 700; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rank-crew-chip-sm {
  font-size: 9px; padding: 2px 6px; border-radius: 6px;
  font-weight: 800; border: 1px solid; flex-shrink: 0; white-space: nowrap;
}
.rank-val {
  font-size: 11px; font-weight: 800; color: var(--text2);
  flex-shrink: 0; letter-spacing: -0.4px; font-variant-numeric: tabular-nums;
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
  .pod-0 .pod-logo, .pod-0 .pod-profile, .pod-0 .pod-initial { width: 56px; height: 56px; font-size: 20px; }
  .pod-1 .pod-logo, .pod-1 .pod-profile, .pod-1 .pod-initial { width: 46px; height: 46px; font-size: 15px; }
  .pod-2 .pod-logo, .pod-2 .pod-profile, .pod-2 .pod-initial { width: 38px; height: 38px; font-size: 13px; }
}
</style>