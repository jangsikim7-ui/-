<template>
  <div class="ranking-wrap">

    <!-- 검색 + 성별 -->
    <div class="top-bar">
      <div class="sbox">
        <span class="sicon">🔍</span>
        <input v-model="search" placeholder="닉네임으로 검색..." @input="onSearch" />
        <button v-if="search" class="sclear" @click="search=''; highlightSoop=null; searchResult=null">✕</button>
      </div>
    </div>

    <!-- 검색 배너 -->
    <div v-if="searchResult" class="search-banner" :style="{'--cc': crewDisplayColor(searchResult.crew_name)}">
      <img :src="searchResult.profile_img" class="sb-avatar" @error="onImgError" />
      <div class="sb-info">
        <span class="sb-name">{{ searchResult.name }}</span>
        <span class="sb-crew" :style="{color: crewDisplayColor(searchResult.crew_name)}">{{ searchResult.crew_name }}</span>
      </div>
      <div class="sb-stats">
        <span class="sb-rank">전체 <b>{{ searchResult.rank }}위</b></span>
        <span class="sb-crewrank">크루내 <b>{{ searchResult.crew_rank }}위</b></span>
      </div>
      <span class="sb-balloons">{{ fmt(searchResult.balloons) }}</span>
    </div>

    <!-- 크루 필터 -->
    <div class="crew-pills">
      <button class="pill" :class="{on: crewFilter===null}" @click="crewFilter=null">전체</button>
      <button
        v-for="c in crewList" :key="c.name"
        class="pill"
        :class="{on: crewFilter===c.name}"
        :style="crewFilter===c.name ? {background: c.color+'33', borderColor: c.color, color: c.color} : {color: c.color}"
        @click="crewFilter = crewFilter===c.name ? null : c.name"
      >{{ c.name }}</button>
    </div>

    <!-- 존 통계 -->
    <div class="zone-row">
      <div
        v-for="(z, zi) in zoneStatsWithColor"
        :key="z.label"
        class="zc"
        :class="`zc-${zi}`"
        @click="scrollToZone(z.label)"
      >
        <div class="zt-head">
          <span class="zt-pill" :class="`zone-pill-${zi}`">{{ z.label }}</span>
          <span class="zt-total">{{ z.crews.reduce((s,c)=>s+c.count,0) }}명</span>
        </div>
        <div class="zbar-list">
          <div v-for="(c, ci) in z.crews" :key="c.name" class="zbar-row">
            <span class="zbar-dot" :style="{background: crewDisplayColor(c.name)}"></span>
            <span class="zbar-name">{{ c.name }}</span>
            <div class="zbar-track">
              <div class="zbar-fill" :style="{width: animated?(c.count/z.crews[0].count*100)+'%':'0%', background: crewDisplayColor(c.name), transitionDelay:(ci*28)+'ms'}"></div>
            </div>
            <span class="zbar-count">{{ c.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="rloading"><div class="spin"></div> 불러오는 중...</div>

    <template v-else>

      <!-- ══════════════ TOP 10 ══════════════ -->
      <div class="zone-section zone-gold" data-zone="TOP 10">
        <div class="zone-label-row">
          <div class="zone-label-line"></div>
          <span class="zone-label-text gold">🏆 TOP 10</span>
          <div class="zone-label-line"></div>
          <span class="zone-count">{{ zoneMembers(1,10).length }}명</span>
        </div>

        <!-- 포디움 1~3위 -->
        <div class="podium-row" v-if="zoneMembers(1,3).length">
          <template v-for="slot in [2,1,3]" :key="slot">
            <div
              v-if="getByRank(slot)"
              class="podium-card"
              :class="{gold: slot===1, silver: slot===2, bronze: slot===3, hl: getByRank(slot).soop_id===highlightSoop}"
              :ref="el => { if(getByRank(slot)?.soop_id===highlightSoop && el) hlEl=el }"
            >
              <div class="pi-medal">{{ ['🥇','🥈','🥉'][slot-1] }}</div>
              <div class="pi-avatar" :style="{borderColor: crewDisplayColor(getByRank(slot).crew_name)}">
                <img :src="getByRank(slot).profile_img" @error="onImgError" />
              </div>
              <div class="pi-name">{{ getByRank(slot).name }}</div>
              <div class="pi-crew-tag" :style="crewBadgeStyle(getByRank(slot).crew_name)">{{ getByRank(slot).crew_name }}</div>
              <div class="pi-balloons">🎈 {{ fmt(getByRank(slot).balloons) }}</div>
              <div class="pi-ratio-row">
                <div class="pi-bar-track">
                  <div class="pi-bar-fill" :style="{width: animated?(getByRank(slot).ratio/maxRatio*100)+'%':'0%', background: crewDisplayColor(getByRank(slot).crew_name)}"></div>
                </div>
                <span class="pi-pct">{{ fmtRatio(getByRank(slot).ratio) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- 4~10위 -->
        <div class="rank-grid top10-grid" v-if="zoneMembers(4,10).length">
          <div
            v-for="row in zoneMembers(4,10)" :key="row.soop_id"
            class="rcard rcard-md"
            :class="{hl: row.soop_id===highlightSoop}"
            :ref="el => { if(row.soop_id===highlightSoop && el) hlEl=el }"
          >
            <div class="rc-top-row">
              <div class="rc-rank gold-num">{{ row.rank }}</div>
              <div class="rc-avatar" :style="{borderColor: crewDisplayColor(row.crew_name)}"><img :src="row.profile_img" @error="onImgError" /></div>
              <div class="rc-body">
                <div class="rc-name">{{ row.name }}</div>
                <div class="rc-crew-tag" :style="crewBadgeStyle(row.crew_name)">{{ row.crew_name }}</div>
              </div>
              <div class="rc-balloons">{{ fmt(row.balloons) }}</div>
            </div>
            <div class="rc-bar-row">
              <div class="rc-bar-track"><div class="rc-bar-fill" :style="{width: animated?(row.ratio/maxRatio*100)+'%':'0%', background: crewDisplayColor(row.crew_name)}"></div></div>
              <span class="rc-pct">{{ fmtRatio(row.ratio) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════ 11~30위 ══════════════ -->
      <div class="zone-section zone-blue" data-zone="11 ~ 30위" v-if="zoneMembers(11,30).length">
        <div class="zone-label-row">
          <div class="zone-label-line"></div>
          <span class="zone-label-text blue">11 ~ 30위</span>
          <div class="zone-label-line"></div>
          <span class="zone-count">{{ zoneMembers(11,30).length }}명</span>
        </div>
        <div class="rank-grid g3">
          <div
            v-for="row in zoneMembers(11,30)" :key="row.soop_id"
            class="rcard rcard-md"
            :class="{hl: row.soop_id===highlightSoop}"
            :ref="el => { if(row.soop_id===highlightSoop && el) hlEl=el }"
          >
            <div class="rc-top-row">
              <div class="rc-rank">{{ row.rank }}</div>
              <div class="rc-avatar" :style="{borderColor: crewDisplayColor(row.crew_name)}"><img :src="row.profile_img" @error="onImgError" /></div>
              <div class="rc-body">
                <div class="rc-name">{{ row.name }}</div>
                <div class="rc-crew-tag" :style="crewBadgeStyle(row.crew_name)">{{ row.crew_name }}</div>
              </div>
              <div class="rc-balloons">{{ fmt(row.balloons) }}</div>
            </div>
            <div class="rc-bar-row">
              <div class="rc-bar-track"><div class="rc-bar-fill" :style="{width: animated?(row.ratio/maxRatio*100)+'%':'0%', background: crewDisplayColor(row.crew_name)}"></div></div>
              <span class="rc-pct">{{ fmtRatio(row.ratio) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════ 31~100위 ══════════════ -->
      <div class="zone-section zone-green" data-zone="31 ~ 70위" v-if="zoneMembers(31,70).length">
        <div class="zone-label-row">
          <div class="zone-label-line"></div>
          <span class="zone-label-text green">31 ~ 70위</span>
          <div class="zone-label-line"></div>
          <span class="zone-count">{{ zoneMembers(31,70).length }}명</span>
        </div>
        <div class="rank-grid g4">
          <div
            v-for="row in zoneMembers(31,70)" :key="row.soop_id"
            class="rcard rcard-sm"
            :class="{hl: row.soop_id===highlightSoop}"
            :ref="el => { if(row.soop_id===highlightSoop && el) hlEl=el }"
          >
            <div class="rc-top-row">
              <div class="rc-rank-sm">{{ row.rank }}</div>
              <div class="rc-avatar-sm" :style="{borderColor: crewDisplayColor(row.crew_name)}"><img :src="row.profile_img" @error="onImgError" /></div>
              <div class="rc-body">
                <div class="rc-name rc-name-sm">{{ row.name }}</div>
                <div class="rc-crew-tag rc-crew-sm" :style="crewBadgeStyle(row.crew_name)">{{ row.crew_name }}</div>
              </div>
              <div class="rc-balloons-sm">{{ fmt(row.balloons) }}</div>
            </div>
            <div class="rc-bar-row">
              <div class="rc-bar-track"><div class="rc-bar-fill" :style="{width: animated?(row.ratio/maxRatio*100)+'%':'0%', background: crewDisplayColor(row.crew_name)}"></div></div>
              <span class="rc-pct rc-pct-sm">{{ fmtRatio(row.ratio) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════ 101위~ ══════════════ -->
      <div class="zone-section zone-purple" data-zone="71위 ~" v-if="zoneMembers(71,99999).length">
        <div class="zone-label-row">
          <div class="zone-label-line"></div>
          <span class="zone-label-text purple">71위 ~</span>
          <div class="zone-label-line"></div>
          <span class="zone-count">{{ zoneMembers(71,99999).length }}명</span>
        </div>
        <div class="rank-grid g5">
          <div
            v-for="row in zoneMembers(71,99999)" :key="row.soop_id"
            class="rcard rcard-xs"
            :class="{hl: row.soop_id===highlightSoop}"
            :ref="el => { if(row.soop_id===highlightSoop && el) hlEl=el }"
          >
            <div class="rc-top-row">
              <div class="rc-rank-xs">{{ row.rank }}</div>
              <div class="rc-avatar-xs" :style="{borderColor: crewDisplayColor(row.crew_name)}"><img :src="row.profile_img" @error="onImgError" /></div>
              <div class="rc-body">
                <div class="rc-name rc-name-xs">{{ row.name }}</div>
                <div class="rc-crew-tag rc-crew-xs" :style="crewBadgeStyle(row.crew_name)">{{ row.crew_name }}</div>
              </div>
              <div class="rc-balloons-xs">{{ fmt(row.balloons) }}</div>
            </div>
            <div class="rc-bar-row">
              <div class="rc-bar-track"><div class="rc-bar-fill" :style="{width: animated?(row.ratio/maxRatio*100)+'%':'0%', background: crewDisplayColor(row.crew_name)}"></div></div>
              <span class="rc-pct rc-pct-xs">{{ fmtRatio(row.ratio) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredList.length===0" class="empty">해당하는 멤버가 없어요</div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { api } from '../composables/useApi.js'

const props = defineProps({
  activeGroup: { type: String, default: 'excel' },
  year: Number,
  month: Number
})

const localGroup = ref(props.activeGroup)
const crewData = ref([])          // getStats 가 주는 crews 배열 원본
const loading = ref(true)
const search = ref('')
const crewFilter = ref(null)
const highlightSoop = ref(null)
const searchResult = ref(null)
const hlEl = ref(null)
const animated = ref(false)

// 크루색은 백엔드(crew.color)에서 받아서 사용
function crewDisplayColor(name) {
  return crewColorMap.value[name] || '#888'
}
// 뱃지: 크루색 기반 (연한배경 + 진한글씨)
function crewBadgeStyle(name) {
  const c = crewColorMap.value[name] || '#888'
  return { background: c + '22', color: c }
}

function fmtRatio(r) {
  if (!r && r !== 0) return '0%'
  if (r >= 10) return r.toFixed(1) + '%'
  if (r >= 1)  return r.toFixed(2) + '%'
  return r.toFixed(3) + '%'
}

function cdnUrl(soopId) {
  if (!soopId) return ''
  const p = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${p}/${soopId}/${soopId}.jpg`
}

async function load() {
  loading.value = true
  animated.value = false
  try {
    const data = await api.getStats(props.year, props.month, localGroup.value)
    crewData.value = data.crews || []
    nextTick(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => { animated.value = true }))
    })
  } catch(e) { console.error(e); crewData.value = [] }
  loading.value = false
}

watch(() => props.activeGroup, (v) => { localGroup.value = v })
watch(() => [localGroup.value, props.year, props.month], load, { immediate: true })

// 크루색 맵 (백엔드 color)
const crewColorMap = computed(() => {
  const map = {}
  for (const crew of crewData.value) map[crew.name] = crew.color
  return map
})

// 크루 필터 목록
const crewList = computed(() =>
  crewData.value.map(c => ({ name: c.name, color: c.color }))
)

// 전체 멤버 평탄화 → 별풍선 내림차순 → rank 부여
const rankedMembers = computed(() => {
  const all = []
  for (const crew of crewData.value) {
    for (const m of (crew.members || [])) {
      all.push({
        ...m,
        crew_name: crew.name,
        crew_color: crew.color,
        balloons: m.balloons || 0,
        profile_img: m.profile_img || cdnUrl(m.soop_id)
      })
    }
  }
  all.sort((a, b) => b.balloons - a.balloons)
  all.forEach((m, i) => { m.rank = i + 1 })
  return all
})

const totalBalloons = computed(() =>
  rankedMembers.value.reduce((s, m) => s + (m.balloons || 0), 0)
)

const membersWithRatio = computed(() => {
  const total = totalBalloons.value
  return rankedMembers.value.map(m => ({
    ...m,
    ratio: total > 0 ? parseFloat(((m.balloons || 0) / total * 100).toFixed(3)) : 0
  }))
})

const maxRatio = computed(() => {
  const list = membersWithRatio.value
  return list.length > 0 ? Math.max(...list.map(m => m.ratio)) : 1
})

// 존 통계: 순위 구간별 크루 인원수
const ZONES = [
  { label: 'TOP 10',    from: 1,  to: 10 },
  { label: '11 ~ 30위', from: 11, to: 30 },
  { label: '31 ~ 70위', from: 31, to: 70 },
  { label: '71위 ~',    from: 71, to: 999999 },
]

const zoneStats = computed(() => {
  return ZONES.map(z => {
    const counts = {}
    for (const m of rankedMembers.value) {
      if (m.rank >= z.from && m.rank <= z.to) {
        counts[m.crew_name] = (counts[m.crew_name] || 0) + 1
      }
    }
    const crews = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    return { label: z.label, crews }
  })
})

const zoneStatsWithColor = computed(() =>
  zoneStats.value
    .filter(z => z.crews.length > 0)
    .map(z => ({
      ...z,
      crews: z.crews.map(c => ({ ...c, color: crewDisplayColor(c.name) }))
    }))
)

const filteredList = computed(() => {
  let list = membersWithRatio.value
  if (crewFilter.value) list = list.filter(m => m.crew_name === crewFilter.value)
  if (search.value) list = list.filter(m => m.name.includes(search.value))
  return list
})

function zoneMembers(from, to) {
  return filteredList.value.filter(m => m.rank >= from && m.rank <= to)
}

function getByRank(rank) {
  return filteredList.value.find(m => m.rank === rank) || null
}

function onSearch() {
  if (!search.value) { highlightSoop.value = null; searchResult.value = null; return }
  const found = membersWithRatio.value.find(m => m.name.includes(search.value))
  if (found) {
    // 크루내 순위 계산
    const crewMembers = membersWithRatio.value.filter(m => m.crew_name === found.crew_name)
    const crewRank = crewMembers.findIndex(m => m.soop_id === found.soop_id) + 1
    highlightSoop.value = found.soop_id
    searchResult.value = { ...found, crew_rank: crewRank }
    crewFilter.value = null
    nextTick(() => { hlEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
  } else { searchResult.value = null }
}

function scrollToZone(label) {
  const el = document.querySelector(`[data-zone="${label}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function fmt(n) { return (n || 0).toLocaleString('ko-KR') }
function onImgError(e) { e.target.style.display = 'none' }
</script>

<style scoped>
.ranking-wrap { display: flex; flex-direction: column; gap: 14px; padding: 16px 22px; }
[data-theme="light"] .ranking-wrap { background: #f0f2f5; border-radius: 12px; }

/* ── 상단바 ── */
.top-bar { display: flex; gap: 8px; align-items: center; }
.sbox { flex: 1; display: flex; align-items: center; gap: 8px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; }
.sicon { font-size: 15px; color: var(--text4); }
.sbox input { flex: 1; background: none; border: none; outline: none; color: var(--text); font-size: 13px; }
.sbox input::placeholder { color: var(--text4); }
.sclear { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 14px; }
.gender-tabs { display: flex; gap: 4px; }
.gtab { padding: 7px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg3); color: var(--text3); font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.15s; }
.gtab.on { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.gtab.male.on { background: #2563eb; border-color: #2563eb; color: #fff; }
.gtab.female.on { background: #db2777; border-color: #db2777; color: #fff; }

/* ── 검색 배너 ── */
.search-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: color-mix(in srgb, var(--cc,#7c3aed) 12%, var(--bg3)); border: 1px solid color-mix(in srgb, var(--cc,#7c3aed) 40%, transparent); border-radius: 10px; }
.sb-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--cc,#7c3aed); }
.sb-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.sb-name { font-size: 14px; font-weight: 800; color: var(--text); }
.sb-crew { font-size: 11px; font-weight: 700; }
.sb-stats { display: flex; gap: 10px; }
.sb-rank, .sb-crewrank { font-size: 12px; color: var(--text2); }
.sb-rank b, .sb-crewrank b { color: var(--text); font-weight: 900; }
.sb-balloons { font-size: 16px; font-weight: 900; color: #a78bfa; }
[data-theme="light"] .sb-balloons { color: #6d28d9; }

/* ── 크루 필터 ── */
.crew-pills { display: flex; gap: 5px; flex-wrap: wrap; }
.pill { padding: 4px 11px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg3); color: var(--text3); font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.pill.on { background: #7c3aed33; border-color: #7c3aed; color: #a78bfa; }

/* ── 존 통계 ── */
.zone-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
.zc { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 13px 14px 12px; cursor: pointer; transition: border-color 0.15s, transform 0.1s; position: relative; overflow: hidden; }
[data-theme="light"] .zc { background: #fff; border-color: rgba(0,0,0,.08); }
.zc::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.zc-0::before { background: linear-gradient(90deg,#d97706,#fbbf24); }
.zc-1::before { background: linear-gradient(90deg,#2563eb,#60a5fa); }
.zc-2::before { background: linear-gradient(90deg,#059669,#34d399); }
.zc-3::before { background: linear-gradient(90deg,#7c3aed,#a78bfa); }
.zc:hover { border-color: var(--text3); transform: translateY(-1px); }
.zt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.zt-pill { font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 20px; }
.zt-total { font-size: 10px; color: var(--text4); font-weight: 700; }
.zone-pill-0 { background: rgba(217,119,6,.15); color: #fbbf24; }
.zone-pill-1 { background: rgba(37,99,235,.15); color: #60a5fa; }
.zone-pill-2 { background: rgba(5,150,105,.15); color: #34d399; }
.zone-pill-3 { background: rgba(124,58,237,.15); color: #a78bfa; }
[data-theme="light"] .zone-pill-0 { color: #92400e; }
[data-theme="light"] .zone-pill-1 { color: #1e40af; }
[data-theme="light"] .zone-pill-2 { color: #065f46; }
[data-theme="light"] .zone-pill-3 { color: #5b21b6; }
.zbar-list { display: flex; flex-direction: column; gap: 8px; }
.zbar-row { display: flex; align-items: center; gap: 7px; }
.zbar-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.zbar-name { font-size: 11px; font-weight: 700; width: 46px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text2); }
.zbar-track { flex: 1; height: 4px; background: rgba(255,255,255,.07); border-radius: 99px; overflow: hidden; }
[data-theme="light"] .zbar-track { background: rgba(0,0,0,.07); }
.zbar-fill { height: 100%; border-radius: 99px; width: 0; transition: width 0.5s cubic-bezier(.4,0,.2,1); }
.zbar-count { font-size: 12px; font-weight: 900; color: var(--text); width: 20px; text-align: right; flex-shrink: 0; }

/* ══════════════════════════════════════
   존 섹션 구분
══════════════════════════════════════ */
.zone-section {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
[data-theme="light"] .zone-section { background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.zone-gold   { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.04); }
.zone-blue   { border-color: rgba(37,99,235,.3);   background: rgba(37,99,235,.03); }
.zone-green  { border-color: rgba(5,150,105,.3);   background: rgba(5,150,105,.03); }
.zone-purple { border-color: rgba(124,58,237,.3);  background: rgba(124,58,237,.03); }
[data-theme="light"] .zone-gold   { border-color: rgba(245,158,11,.35); background: #ffffff; }
[data-theme="light"] .zone-blue   { border-color: rgba(37,99,235,.25);  background: #ffffff; }
[data-theme="light"] .zone-green  { border-color: rgba(5,150,105,.25);  background: #ffffff; }
[data-theme="light"] .zone-purple { border-color: rgba(124,58,237,.25); background: #ffffff; }

/* 존 라벨 */
.zone-label-row { display: flex; align-items: center; gap: 10px; }
.zone-label-line { flex: 1; height: 1px; background: var(--border); }
.zone-label-text { font-size: 12px; font-weight: 900; letter-spacing: 1px; white-space: nowrap; padding: 4px 14px; border-radius: 20px; }
.zone-label-text.gold   { color: #fbbf24; background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.3); }
.zone-label-text.blue   { color: #60a5fa; background: rgba(37,99,235,.15);  border: 1px solid rgba(37,99,235,.3); }
.zone-label-text.green  { color: #34d399; background: rgba(5,150,105,.15);  border: 1px solid rgba(5,150,105,.3); }
.zone-label-text.purple { color: #a78bfa; background: rgba(124,58,237,.15); border: 1px solid rgba(124,58,237,.3); }
[data-theme="light"] .zone-label-text.gold   { color: #92400e; }
[data-theme="light"] .zone-label-text.blue   { color: #1e40af; }
[data-theme="light"] .zone-label-text.green  { color: #065f46; }
[data-theme="light"] .zone-label-text.purple { color: #5b21b6; }
.zone-count { font-size: 11px; color: var(--text4); font-weight: 600; white-space: nowrap; }

/* ══════════════════════════════════════
   포디움 1~3위
══════════════════════════════════════ */
.podium-row { display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 12px; align-items: end; }
.podium-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 14px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 18px 18px; }
[data-theme="light"] .podium-card { background: #ffffff; border-color: rgba(0,0,0,.09); box-shadow: 0 3px 10px rgba(0,0,0,.07); }
.podium-card:hover { transform: translateY(-3px); }
.podium-card.gold   { border-top: 3px solid #f59e0b; box-shadow: 0 4px 20px rgba(245,158,11,.12); }
.podium-card.silver { border-top: 3px solid #94a3b8; }
.podium-card.bronze { border-top: 3px solid #cd7c3a; }
.podium-card.hl     { outline: 2px solid #7c3aed; }

.pi-medal { font-size: 22px; }
.pi-avatar { width: 72px; height: 72px; border-radius: 50%; border: 3px solid; overflow: hidden; flex-shrink: 0; }
.pi-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pi-name { font-size: 15px; font-weight: 800; color: var(--text); text-align: center; }
.pi-crew-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: none; white-space: nowrap; }
.pi-balloons { font-size: 16px; font-weight: 900; color: #a78bfa; }
[data-theme="light"] .pi-balloons { color: #6d28d9; }
.pi-ratio-row { display: flex; align-items: center; gap: 7px; width: 100%; }
.pi-bar-track { flex: 1; height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
.pi-bar-fill { height: 100%; border-radius: 99px; transition: width 0.65s cubic-bezier(.4,0,.2,1); }
.pi-pct { font-size: 11px; font-weight: 800; color: var(--text2); min-width: 48px; text-align: right; flex-shrink: 0; }

/* ══════════════════════════════════════
   공통 랭크 카드
══════════════════════════════════════ */
.rank-grid { display: grid; gap: 8px; }
.top10-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.g3  { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.g4  { grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)); }
.g5  { grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); }

.rcard { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s; display: grid; gap: 0; }
[data-theme="light"] .rcard { background: #ffffff; border-color: rgba(0,0,0,.09); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.rcard:hover { transform: translateY(-2px); border-color: var(--text3); }
[data-theme="light"] .rcard:hover { box-shadow: 0 6px 16px rgba(0,0,0,.10); border-color: rgba(0,0,0,.18); }
.rcard.hl { outline: 2px solid #7c3aed; }

/* md 카드 (4~30위) */
.rcard-md { display: flex; flex-direction: column; padding: 14px; gap: 8px; }
.rcard-md .rc-top-row { display: flex; align-items: center; gap: 10px; }
.rcard-md .rc-rank { font-size: 16px; font-weight: 900; color: var(--text3); min-width: 24px; flex-shrink: 0; }
.rcard-md .rc-rank.gold-num { color: #f59e0b; }
[data-theme="light"] .rcard-md .rc-rank.gold-num { color: #d97706; }
.rcard-md .rc-avatar { width: 46px; height: 46px; border-radius: 50%; border: 2px solid; overflow: hidden; flex-shrink: 0; }
.rcard-md .rc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.rcard-md .rc-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rcard-md .rc-balloons { font-size: 13px; font-weight: 900; color: #a78bfa; white-space: nowrap; flex-shrink: 0; }
[data-theme="light"] .rcard-md .rc-balloons { color: #6d28d9; }

/* sm 카드 (31~100위) */
.rcard-sm { display: flex; flex-direction: column; padding: 9px 10px; gap: 5px; }
.rcard-sm .rc-top-row { display: flex; align-items: center; gap: 8px; }
.rcard-sm .rc-rank-sm { font-size: 13px; font-weight: 900; color: var(--text3); min-width: 20px; flex-shrink: 0; }
.rcard-sm .rc-avatar-sm { width: 34px; height: 34px; border-radius: 50%; border: 2px solid; overflow: hidden; flex-shrink: 0; }
.rcard-sm .rc-avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
.rcard-sm .rc-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rcard-sm .rc-balloons-sm { font-size: 12px; font-weight: 900; color: #a78bfa; white-space: nowrap; flex-shrink: 0; }
[data-theme="light"] .rcard-sm .rc-balloons-sm { color: #6d28d9; }

/* xs 카드 (101위~) */
.rcard-xs { display: flex; flex-direction: column; padding: 8px 9px; gap: 4px; }
.rcard-xs .rc-top-row { display: flex; align-items: center; gap: 7px; }
.rcard-xs .rc-rank-xs { font-size: 12px; font-weight: 900; color: var(--text3); min-width: 20px; flex-shrink: 0; }
.rcard-xs .rc-avatar-xs { width: 30px; height: 30px; border-radius: 50%; border: 2px solid; overflow: hidden; flex-shrink: 0; }
.rcard-xs .rc-avatar-xs img { width: 100%; height: 100%; object-fit: cover; }
.rcard-xs .rc-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rcard-xs .rc-balloons-xs { font-size: 11px; font-weight: 900; color: #a78bfa; white-space: nowrap; flex-shrink: 0; }
[data-theme="light"] .rcard-xs .rc-balloons-xs { color: #6d28d9; }

/* 공통 body 내부 요소 */
.rc-name { font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 3px; max-width: 100%; }
.rc-name-sm { font-size: 12px; }
.rc-name-xs { font-size: 11px; }
.rc-gender { font-size: 9px; font-weight: 800; flex-shrink: 0; }
.rc-gender.m { color: #3b82f6; }
.rc-gender.f { color: #ec4899; }
.rc-crew-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: none; display: inline-block; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; align-self: flex-start; }
.rc-crew-sm  { font-size: 9px;  padding: 1px 6px; }
.rc-crew-xs  { font-size: 9px;  padding: 1px 5px; }
.rc-bar-row { display: flex; align-items: center; gap: 5px; }
.rc-bar-track { flex: 1; height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; min-width: 20px; }
[data-theme="light"] .rc-bar-track { background: #e5e7eb; }
.rc-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(.4,0,.2,1); }
.rc-pct { font-size: 10px; font-weight: 700; color: var(--text3); min-width: 42px; text-align: right; flex-shrink: 0; }
.rc-pct-sm { font-size: 9px; min-width: 38px; }
.rc-pct-xs { font-size: 9px; min-width: 36px; }

/* ── 기타 ── */
.rloading { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 40px; color: var(--text3); font-size: 13px; }
.spin { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty { text-align: center; padding: 40px; color: var(--text3); font-size: 13px; }

/* ── 반응형 ── */
@media (max-width: 700px) {
  .ranking-wrap { padding: 10px; }
  .zone-row { grid-template-columns: repeat(2,1fr); }
  .podium-row { gap: 6px; }
  .pi-avatar { width: 54px; height: 54px; }
  .g4, .g5 { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}
</style>