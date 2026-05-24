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
        <button
          class="hg-tab"
          :class="{ active: localGroup === 'excel' }"
          @click="localGroup = 'excel'"
        >
          <i class="ti ti-users" />엑셀크루
        </button>
        <button
          class="hg-tab hg-bora"
          :class="{ active: localGroup === 'bora' }"
          @click="localGroup = 'bora'"
        >
          <i class="ti ti-crown" />보라엑셀크루
        </button>
      </div>
    </div>

    <!-- 로딩 & 에러 -->
    <div v-if="loading" class="honor-loading">
      <div class="spin" /><span>순위 불러오는 중...</span>
    </div>
    <div v-else-if="error" class="honor-error">{{ error }}</div>

    <!-- 콘텐츠 (1단 세로 배치) -->
    <div v-else class="honor-cols">
      
      <!-- 1. 크루 평균 순위 -->
      <div class="hcol">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-avg"><i class="ti ti-chart-bar" /></div>
          <div>
            <div class="hcol-title">크루 평균 순위</div>
            <div class="hcol-sub">평균 별풍선 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="avgRanked[pos]">
              <div class="pod-img-wrap">
                <img v-if="avgRanked[pos].logo_url" :src="avgRanked[pos].logo_url" class="pod-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="pod-initial" :style="{ background: avgRanked[pos].color + '33', color: avgRanked[pos].color }">{{ avgRanked[pos].name.charAt(0) }}</div>
                <div class="pod-medal" :class="'medal-'+(pos+1)">{{ pos+1 }}</div>
              </div>
              <div class="pod-name">{{ avgRanked[pos].name }}</div>
              <div class="pod-val" :class="pos===0?'gold':''">{{ fmt(avgRanked[pos].avg) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(crew, i) in avgRanked.slice(3)" :key="crew.id" class="rank-row">
            <div class="rank-bg-fill" :style="{ width: pctOf(crew.avg, avgRanked[0]?.avg)+'%', background: crew.color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-logo-wrap">
                <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="rank-initial-sm" :style="{ background: crew.color+'22', color: crew.color }">{{ crew.name.charAt(0) }}</div>
              </div>
              <span class="rank-name">{{ crew.name }}</span>
              <span class="rank-val">{{ fmt(crew.avg) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 크루 매출 순위 -->
      <div class="hcol">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-master"><i class="ti ti-crown" /></div>
          <div>
            <div class="hcol-title">크루 매출 순위</div>
            <div class="hcol-sub">크루 매출풍 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="masterRanked[pos]">
              <div class="pod-img-wrap">
                <img v-if="masterRanked[pos].logo_url" :src="masterRanked[pos].logo_url" class="pod-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="pod-initial" :style="{ background: masterRanked[pos].color + '33', color: masterRanked[pos].color }">{{ masterRanked[pos].name.charAt(0) }}</div>
                <div class="pod-medal" :class="'medal-'+(pos+1)">{{ pos+1 }}</div>
              </div>
              <div class="pod-name">{{ masterRanked[pos].name }}</div>
              <div class="pod-val" :class="pos===0?'gold':''">{{ fmt(masterRanked[pos].master_balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(crew, i) in masterRanked.slice(3)" :key="crew.id" class="rank-row">
            <div class="rank-bg-fill" :style="{ width: pctOf(crew.master_balloons, masterRanked[0]?.master_balloons)+'%', background: crew.color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-logo-wrap">
                <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
                <div v-else class="rank-initial-sm" :style="{ background: crew.color+'22', color: crew.color }">{{ crew.name.charAt(0) }}</div>
              </div>
              <span class="rank-name">{{ crew.name }}</span>
              <span class="rank-val">{{ fmt(crew.master_balloons) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 개인 TOP 10 -->
      <div class="hcol">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-indiv"><i class="ti ti-medal" /></div>
          <div>
            <div class="hcol-title">개인 TOP 10</div>
            <div class="hcol-sub">전체 멤버 별풍선 순위</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="indivRanked[pos]">
              <div class="pod-img-wrap">
                <img :src="indivRanked[pos].profile_img || cdnUrl(indivRanked[pos].soop_id)" class="pod-profile" :style="{ borderColor: indivRanked[pos].crew_color }" @error="onImgError($event, indivRanked[pos].soop_id)" />
                <div class="pod-medal" :class="'medal-'+(pos+1)">{{ pos+1 }}</div>
              </div>
              <div class="pod-name">{{ indivRanked[pos].name }}</div>
              <div class="pod-crew-tag" :style="{ background: indivRanked[pos].crew_color+'22', color: indivRanked[pos].crew_color }">{{ indivRanked[pos].crew_name }}</div>
              <div class="pod-val" :class="pos===0?'gold':''">{{ fmt(indivRanked[pos].balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(m, i) in indivRanked.slice(3)" :key="m.id" class="rank-row rank-row-indiv">
            <div class="rank-bg-fill" :style="{ width: pctOf(m.balloons, indivRanked[0]?.balloons)+'%', background: m.crew_color }" />
            <div class="rank-content">
              <span class="rank-num">{{ i+4 }}</span>
              <div class="rank-profile-wrap">
                <img :src="m.profile_img || cdnUrl(m.soop_id)" class="rank-profile" :style="{ borderColor: m.crew_color }" @error="onImgError($event, m.soop_id)" />
              </div>
              <span class="rank-name">{{ m.name }}</span>
              <span class="rank-crew-tag" :style="{ background: m.crew_color+'22', color: m.crew_color }">{{ m.crew_name }}</span>
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
.honor-wrap {
  padding: 20px 24px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── 헤더 ── */
.honor-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.honor-title-row { display: flex; align-items: center; gap: 8px; }
.honor-crown { font-size: 24px; filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3)); }
.honor-title { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -0.5px; }
.honor-period { font-size: 15px; color: var(--text3); font-weight: 600; background: var(--bg4); padding: 4px 10px; border-radius: 8px; }

.honor-group-tabs { display: flex; gap: 8px; }
.hg-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: 12px;
  border: 1px solid var(--border); background: var(--bg3); color: var(--text3);
  font-size: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s ease;
}
.hg-tab.active { background: rgba(74, 158, 255, 0.15); border-color: #4a9eff; color: #90c8ff; box-shadow: 0 0 12px rgba(74, 158, 255, 0.1); }
.hg-bora.active { background: rgba(153, 68, 204, 0.15); border-color: #9944cc; color: #cc88ff; box-shadow: 0 0 12px rgba(153, 68, 204, 0.1); }

/* ── 1단 세로 레이아웃 ── */
.honor-cols { display: flex; flex-direction: column; gap: 32px; }

.hcol {
  background: linear-gradient(145deg, var(--bg3) 0%, var(--bg4) 100%);
  border: 1px solid var(--border); border-radius: 24px;
  overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}

.hcol-head {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0, 0, 0, 0.2);
}
.hcol-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.hcol-icon i { font-size: 22px; }
.hcol-icon-avg { background: rgba(201,150,10,0.2); color: #e8b820; box-shadow: 0 0 16px rgba(201,150,10,0.3); }
.hcol-icon-master { background: rgba(255,190,0,0.2); color: #ffcc44; box-shadow: 0 0 16px rgba(255,190,0,0.3); }
.hcol-icon-indiv { background: rgba(107,203,119,0.2); color: #88df94; box-shadow: 0 0 16px rgba(107,203,119,0.3); }

.hcol-title { font-size: 18px; font-weight: 800; color: var(--text); }
.hcol-sub { font-size: 13px; color: var(--text3); margin-top: 4px; }

/* ── 포디움 ── */
.podium {
  display: flex; align-items: flex-end; justify-content: center; gap: 20px;
  padding: 40px 20px 0; position: relative;
}

.pod { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-width: 0; z-index: 1; max-width: 200px; }
.pod-0 { order: 2; transform: translateY(-16px); }
.pod-1 { order: 1; }
.pod-2 { order: 3; }

.pod-img-wrap { position: relative; flex-shrink: 0; margin-bottom: 6px; }
.pod-logo { border-radius: 16px; object-fit: contain; box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
.pod-0 .pod-logo { width: 80px; height: 80px; }
.pod-1 .pod-logo { width: 64px; height: 64px; }
.pod-2 .pod-logo { width: 56px; height: 56px; }

.pod-initial { display: flex; align-items: center; justify-content: center; font-weight: 900; border-radius: 16px; box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
.pod-0 .pod-initial { width: 80px; height: 80px; font-size: 28px; }
.pod-1 .pod-initial { width: 64px; height: 64px; font-size: 22px; }
.pod-2 .pod-initial { width: 56px; height: 56px; font-size: 18px; }

.pod-profile { border-radius: 50%; object-fit: cover; border: 3px solid transparent; box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
.pod-0 .pod-profile { width: 80px; height: 80px; }
.pod-1 .pod-profile { width: 64px; height: 64px; }
.pod-2 .pod-profile { width: 56px; height: 56px; border-width: 2.5px; }

.pod-medal {
  position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
  font-size: 12px; font-weight: 900; padding: 4px 12px; border-radius: 12px;
  color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.medal-1 { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); box-shadow: 0 4px 12px rgba(246, 211, 101, 0.5); }
.medal-2 { background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%); box-shadow: 0 4px 12px rgba(142, 197, 252, 0.4); }
.medal-3 { background: linear-gradient(135deg, #f6d365 0%, #d48b55 100%); box-shadow: 0 4px 12px rgba(212, 139, 85, 0.4); }

.pod-name { font-size: 14px; font-weight: 800; color: var(--text); text-align: center; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pod-crew-tag { font-size: 11px; padding: 3px 8px; border-radius: 8px; font-weight: 800; }
.pod-val { font-size: 15px; font-weight: 800; color: var(--text2); letter-spacing: -0.3px; }
.pod-val.gold { color: #f6d365; text-shadow: 0 0 10px rgba(246, 211, 101, 0.4); font-size: 17px; }

/* 시상대 */
.pod-stage { width: 100%; border-radius: 8px 8px 0 0; position: relative; overflow: hidden; }
.pod-stage::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.4); }
.stage-1 { height: 60px; background: rgba(201,150,10,0.15); border: 1px solid rgba(201,150,10,0.4); border-bottom: none; box-shadow: 0 -6px 24px rgba(201,150,10,0.15); }
.stage-2 { height: 45px; background: rgba(122,138,154,0.15); border: 1px solid rgba(122,138,154,0.3); border-bottom: none; box-shadow: 0 -4px 18px rgba(122,138,154,0.1); }
.stage-3 { height: 30px; background: rgba(160,120,80,0.15); border: 1px solid rgba(160,120,80,0.3); border-bottom: none; box-shadow: 0 -4px 18px rgba(160,120,80,0.1); }

/* ── 리스트 (PC 2열) ── */
.rank-list { 
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 24px;
}

.rank-row {
  position: relative; border-radius: 12px; overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
}
.rank-row:hover { background: rgba(255, 255, 255, 0.05); }

.rank-bg-fill {
  position: absolute; top: 0; left: 0; bottom: 0;
  opacity: 0.15; border-radius: 12px 0 0 12px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.rank-content {
  position: relative; display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; z-index: 2;
}

.rank-num { font-size: 13px; font-weight: 800; color: var(--text3); width: 20px; text-align: center; flex-shrink: 0; }
.rank-logo-wrap, .rank-profile-wrap { flex-shrink: 0; width: 34px; height: 34px; }
.rank-logo { width: 100%; height: 100%; border-radius: 8px; object-fit: contain; }
.rank-profile { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid transparent; }
.rank-initial-sm { width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }

.rank-name { flex: 1; font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-crew-tag { font-size: 11px; padding: 3px 8px; border-radius: 8px; font-weight: 800; flex-shrink: 0; }
.rank-val { font-size: 14px; font-weight: 800; color: var(--text); flex-shrink: 0; font-family: monospace; letter-spacing: -0.5px; }

/* ── 모바일 반응형 ── */
@media (max-width: 900px) {
  .honor-wrap { padding: 16px; }
  .honor-header { flex-direction: column; align-items: flex-start; }
  
  .rank-list { grid-template-columns: 1fr; padding: 16px; }
  
  .pod-0 .pod-logo, .pod-0 .pod-profile, .pod-0 .pod-initial { width: 64px; height: 64px; font-size: 22px; }
  .pod-1 .pod-logo, .pod-1 .pod-profile, .pod-1 .pod-initial { width: 52px; height: 52px; font-size: 18px; }
  .pod-2 .pod-logo, .pod-2 .pod-profile, .pod-2 .pod-initial { width: 44px; height: 44px; font-size: 16px; }
}
</style>