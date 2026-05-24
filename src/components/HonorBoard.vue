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

    <!-- 로딩 -->
    <div v-if="loading" class="honor-loading">
      <div class="spin" /><span>순위 불러오는 중...</span>
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="honor-error">{{ error }}</div>

    <!-- 콘텐츠 -->
    <div v-else class="honor-cols">

      <!-- 크루 평균 순위 -->
      <div class="hcol">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-avg">
            <i class="ti ti-chart-bar" />
          </div>
          <div>
            <div class="hcol-title">크루 평균 순위</div>
            <div class="hcol-sub">평균 별풍선 기준</div>
          </div>
        </div>

        <!-- 포디움 -->
        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="avgRanked[pos]">
              <div class="pod-img-wrap">
                <img
                  v-if="avgRanked[pos].logo_url"
                  :src="avgRanked[pos].logo_url"
                  class="pod-logo"
                  @error="e => e.target.style.display='none'"
                />
                <div v-else class="pod-initial" :style="{ background: avgRanked[pos].color + '33', color: avgRanked[pos].color }">
                  {{ avgRanked[pos].name.charAt(0) }}
                </div>
                <div class="pod-medal" :class="'medal-'+(pos+1)">{{ pos+1 }}</div>
              </div>
              <div class="pod-name">{{ avgRanked[pos].name }}</div>
              <div class="pod-val" :class="pos===0?'gold':''">{{ fmt(avgRanked[pos].avg) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <!-- 4위~10위 -->
        <div class="rank-list">
          <div v-for="(crew, i) in avgRanked.slice(3)" :key="crew.id" class="rank-row">
            <span class="rank-num">{{ i+4 }}</span>
            <div class="rank-logo-wrap">
              <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
              <div v-else class="rank-initial-sm" :style="{ background: crew.color+'22', color: crew.color }">{{ crew.name.charAt(0) }}</div>
            </div>
            <span class="rank-name">{{ crew.name }}</span>
            <span class="rank-val">{{ fmt(crew.avg) }}</span>
            <div class="rank-bar"><div class="rank-bar-fill" :style="{ width: pctOf(crew.avg, avgRanked[0]?.avg)+'%', background: crew.color }" /></div>
          </div>
        </div>
      </div>

      <!-- 수장 별풍선 순위 -->
      <div class="hcol">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-master">
            <i class="ti ti-crown" />
          </div>
          <div>
            <div class="hcol-title">수장 별풍선 순위</div>
            <div class="hcol-sub">크루 매출풍 기준</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="masterRanked[pos]">
              <div class="pod-img-wrap">
                <img
                  v-if="masterRanked[pos].logo_url"
                  :src="masterRanked[pos].logo_url"
                  class="pod-logo"
                  @error="e => e.target.style.display='none'"
                />
                <div v-else class="pod-initial" :style="{ background: masterRanked[pos].color + '33', color: masterRanked[pos].color }">
                  {{ masterRanked[pos].name.charAt(0) }}
                </div>
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
            <span class="rank-num">{{ i+4 }}</span>
            <div class="rank-logo-wrap">
              <img v-if="crew.logo_url" :src="crew.logo_url" class="rank-logo" @error="e => e.target.style.display='none'" />
              <div v-else class="rank-initial-sm" :style="{ background: crew.color+'22', color: crew.color }">{{ crew.name.charAt(0) }}</div>
            </div>
            <span class="rank-name">{{ crew.name }}</span>
            <span class="rank-val">{{ fmt(crew.master_balloons) }}</span>
            <div class="rank-bar"><div class="rank-bar-fill" :style="{ width: pctOf(crew.master_balloons, masterRanked[0]?.master_balloons)+'%', background: crew.color }" /></div>
          </div>
        </div>
      </div>

      <!-- 개인 TOP 10 -->
      <div class="hcol">
        <div class="hcol-head">
          <div class="hcol-icon hcol-icon-indiv">
            <i class="ti ti-medal" />
          </div>
          <div>
            <div class="hcol-title">개인 TOP 10</div>
            <div class="hcol-sub">전체 멤버 별풍선 순위</div>
          </div>
        </div>

        <div class="podium">
          <div v-for="(pos, pi) in podiumOrder" :key="pi" class="pod" :class="'pod-'+pos">
            <template v-if="indivRanked[pos]">
              <div class="pod-img-wrap">
                <img
                  :src="indivRanked[pos].profile_img || cdnUrl(indivRanked[pos].soop_id)"
                  class="pod-profile"
                  :style="{ borderColor: indivRanked[pos].crew_color }"
                  @error="onImgError($event, indivRanked[pos].soop_id)"
                />
                <div class="pod-medal" :class="'medal-'+(pos+1)">{{ pos+1 }}</div>
              </div>
              <div class="pod-name">{{ indivRanked[pos].name }}</div>
              <div class="pod-crew-tag" :style="{ background: indivRanked[pos].crew_color+'22', color: indivRanked[pos].crew_color }">
                {{ indivRanked[pos].crew_name }}
              </div>
              <div class="pod-val" :class="pos===0?'gold':''">{{ fmt(indivRanked[pos].balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)" />
            </template>
          </div>
        </div>

        <div class="rank-list">
          <div v-for="(m, i) in indivRanked.slice(3)" :key="m.id" class="rank-row rank-row-indiv">
            <span class="rank-num">{{ i+4 }}</span>
            <div class="rank-profile-wrap">
              <img
                :src="m.profile_img || cdnUrl(m.soop_id)"
                class="rank-profile"
                :style="{ borderColor: m.crew_color }"
                @error="onImgError($event, m.soop_id)"
              />
            </div>
            <span class="rank-name">{{ m.name }}</span>
            <span class="rank-crew-tag" :style="{ background: m.crew_color+'22', color: m.crew_color }">{{ m.crew_name }}</span>
            <span class="rank-val">{{ fmt(m.balloons) }}</span>
            <div class="rank-bar"><div class="rank-bar-fill" :style="{ width: pctOf(m.balloons, indivRanked[0]?.balloons)+'%', background: m.crew_color }" /></div>
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
  padding: 16px 22px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── 헤더 ── */
.honor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 10px;
}
.honor-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.honor-crown { font-size: 20px; }
.honor-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.4px;
}
.honor-period {
  font-size: 13px;
  color: var(--text3);
  font-weight: 600;
}

.honor-group-tabs { display: flex; gap: 6px; }
.hg-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 16px; border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg3);
  color: var(--text3);
  font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.hg-tab i { font-size: 13px; }
.hg-tab.active {
  background: #0d2040;
  border-color: #4a9eff;
  color: #90c8ff;
}
.hg-bora.active {
  background: #1e0d38;
  border-color: #9944cc;
  color: #cc88ff;
}
[data-theme="light"] .hg-tab.active {
  background: #ddeeff;
  border-color: #1a60dd;
  color: #0a3a99;
}
[data-theme="light"] .hg-bora.active {
  background: #f0deff;
  border-color: #8822cc;
  color: #5a0099;
}

/* ── 로딩/에러 ── */
.honor-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 60px;
  color: var(--text3); font-size: 14px;
}
.spin {
  width: 20px; height: 20px;
  border: 2px solid var(--border); border-top-color: #c9960a;
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
.honor-error { color: #ff6b6b; text-align: center; padding: 40px; }

/* ── 3열 레이아웃 ── */
.honor-cols {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

/* ── 컬럼 카드 ── */
.hcol {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.hcol-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg4);
}
.hcol-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.hcol-icon i { font-size: 16px; }
.hcol-icon-avg { background: rgba(201,150,10,0.15); color: #c9960a; }
.hcol-icon-master { background: rgba(255,190,0,0.15); color: #ffc832; }
.hcol-icon-indiv { background: rgba(107,203,119,0.15); color: #6bcb77; }
[data-theme="light"] .hcol-icon-avg { background: rgba(180,120,0,0.1); color: #8a6400; }
[data-theme="light"] .hcol-icon-master { background: rgba(200,140,0,0.1); color: #a07800; }
[data-theme="light"] .hcol-icon-indiv { background: rgba(30,140,60,0.1); color: #1e7a38; }

.hcol-title { font-size: 13px; font-weight: 800; color: var(--text); }
.hcol-sub { font-size: 10px; color: var(--text3); margin-top: 1px; }

/* ── 포디움 ── */
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  padding: 16px 8px 0;
  border-bottom: 1px solid var(--border);
}

.pod {
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  flex: 1; min-width: 0;
}
.pod-0 { order: 2; }
.pod-1 { order: 1; }
.pod-2 { order: 3; }

.pod-img-wrap { position: relative; flex-shrink: 0; }

/* 크루 로고 */
.pod-logo {
  border-radius: 8px;
  object-fit: contain;
  display: block;
}
.pod-0 .pod-logo { width: 48px; height: 48px; }
.pod-1 .pod-logo { width: 38px; height: 38px; }
.pod-2 .pod-logo { width: 32px; height: 32px; }

/* 크루 이니셜 */
.pod-initial {
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 16px;
}
.pod-0 .pod-initial { width: 48px; height: 48px; font-size: 18px; }
.pod-1 .pod-initial { width: 38px; height: 38px; font-size: 14px; }
.pod-2 .pod-initial { width: 32px; height: 32px; font-size: 12px; }

/* 개인 프로필 */
.pod-profile {
  border-radius: 50%; object-fit: cover; display: block;
  border: 2px solid transparent;
}
.pod-0 .pod-profile { width: 48px; height: 48px; border-width: 2.5px; }
.pod-1 .pod-profile { width: 38px; height: 38px; }
.pod-2 .pod-profile { width: 32px; height: 32px; border-width: 1.5px; }

/* 메달 뱃지 */
.pod-medal {
  position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
  font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 8px;
  line-height: 1.4; white-space: nowrap; color: #fff;
}
.medal-1 { background: #c9960a; box-shadow: 0 2px 6px rgba(201,150,10,0.5); }
.medal-2 { background: #7a8a9a; }
.medal-3 { background: #a07850; }

.pod-name {
  font-size: 10px; font-weight: 700; color: var(--text);
  text-align: center; max-width: 76px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 8px;
}
.pod-crew-tag {
  font-size: 8px; padding: 1px 5px; border-radius: 6px;
  font-weight: 700; white-space: nowrap;
  max-width: 72px; overflow: hidden; text-overflow: ellipsis;
}
.pod-val {
  font-size: 10px; font-weight: 700; color: var(--text2);
  margin-bottom: 3px; letter-spacing: -0.3px;
}
.pod-val.gold { color: #c9960a; }
[data-theme="light"] .pod-val.gold { color: #8a6400; }

/* 시상대 */
.pod-stage {
  width: 100%; border-radius: 3px 3px 0 0;
}
.stage-1 { height: 40px; background: linear-gradient(180deg, #c9960a 0%, #a07800 100%); }
.stage-2 { height: 28px; background: linear-gradient(180deg, #7a8a9a 0%, #5a6a7a 100%); }
.stage-3 { height: 20px; background: linear-gradient(180deg, #a07850 0%, #7a5830 100%); }
[data-theme="light"] .stage-1 { background: linear-gradient(180deg, #e8b820 0%, #c9960a 100%); }
[data-theme="light"] .stage-2 { background: linear-gradient(180deg, #9aabb8 0%, #7a8a9a 100%); }
[data-theme="light"] .stage-3 { background: linear-gradient(180deg, #c09870 0%, #a07850 100%); }

/* ── 리스트 ── */
.rank-list { padding: 6px 0 4px; }

.rank-row {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 14px;
  transition: background .1s;
}
.rank-row:hover { background: var(--member-hover); }

.rank-num {
  font-size: 10px; font-weight: 700; color: var(--text3);
  width: 14px; text-align: center; flex-shrink: 0;
}
.rank-logo-wrap { flex-shrink: 0; width: 22px; height: 22px; }
.rank-logo {
  width: 22px; height: 22px; border-radius: 5px;
  object-fit: contain; display: block;
}
.rank-initial-sm {
  width: 22px; height: 22px; border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800;
}
.rank-profile-wrap { flex-shrink: 0; width: 22px; height: 22px; }
.rank-profile {
  width: 22px; height: 22px; border-radius: 50%;
  object-fit: cover; border: 1.5px solid transparent; display: block;
}
.rank-name {
  flex: 1; font-size: 11px; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rank-crew-tag {
  font-size: 8px; padding: 1px 5px; border-radius: 5px;
  font-weight: 700; flex-shrink: 0; white-space: nowrap;
}
.rank-val {
  font-size: 10px; font-weight: 700; color: var(--text2);
  flex-shrink: 0; letter-spacing: -0.3px;
}
.rank-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 2px; background: var(--bar-bg);
}
.rank-row { position: relative; }
.rank-bar-fill {
  height: 100%; border-radius: 0 1px 1px 0;
  opacity: 0.6; transition: width .5s ease;
}

/* ── 반응형 ── */
@media (max-width: 900px) {
  .honor-cols { grid-template-columns: 1fr; }
  .honor-wrap { padding: 12px 12px 20px; }
}
@media (max-width: 600px) {
  .honor-header { flex-direction: column; align-items: flex-start; }
}
</style>
