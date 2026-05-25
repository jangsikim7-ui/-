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
                <div class="pod-medal-frame" :class="'medal-frame-'+(pos+1)">
                  <!-- SVG 메달 오버레이 (왕관 + 원형 장식 테두리) -->
                  <svg class="medal-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient :id="'gold'+pos" cx="50%" cy="40%">
                        <stop v-if="pos===0" offset="0%" stop-color="#fffbe0"/>
                        <stop v-if="pos===0" offset="50%" stop-color="#ffd700"/>
                        <stop v-if="pos===0" offset="100%" stop-color="#b8860b"/>
                        <stop v-if="pos===1" offset="0%" stop-color="#f0f8ff"/>
                        <stop v-if="pos===1" offset="50%" stop-color="#c0d8ee"/>
                        <stop v-if="pos===1" offset="100%" stop-color="#6a8fa8"/>
                        <stop v-if="pos===2" offset="0%" stop-color="#f8d8b0"/>
                        <stop v-if="pos===2" offset="50%" stop-color="#c87830"/>
                        <stop v-if="pos===2" offset="100%" stop-color="#7a4010"/>
                      </radialGradient>
                    </defs>
                    <!-- 왕관 -->
                    <g v-if="pos===0" transform="translate(60,18)" fill="#ffd700" filter="url(#gs)">
                      <polygon points="0,-14 -18,4 -10,4 0,-6 10,4 18,4" opacity="0.95"/>
                      <circle cx="-18" cy="5" r="3.5"/><circle cx="0" cy="-15" r="3.5"/><circle cx="18" cy="5" r="3.5"/>
                      <rect x="-18" y="5" width="36" height="7" rx="2"/>
                    </g>
                    <g v-if="pos===1" transform="translate(60,18)" :fill="'#c0d0e0'">
                      <polygon points="0,-12 -15,3 -8,3 0,-5 8,3 15,3" opacity="0.9"/>
                      <circle cx="-15" cy="4" r="3"/><circle cx="0" cy="-13" r="3"/><circle cx="15" cy="4" r="3"/>
                      <rect x="-15" y="4" width="30" height="6" rx="2"/>
                    </g>
                    <g v-if="pos===2" transform="translate(60,18)" :fill="'#c87830'">
                      <polygon points="0,-11 -13,2 -7,2 0,-4 7,2 13,2" opacity="0.9"/>
                      <circle cx="-13" cy="3" r="2.5"/><circle cx="0" cy="-12" r="2.5"/><circle cx="13" cy="3" r="2.5"/>
                      <rect x="-13" y="3" width="26" height="5" rx="2"/>
                    </g>
                    <!-- 원형 테두리 링 -->
                    <circle cx="60" cy="72" r="44" :fill="'none'" :stroke="`url(#gold${pos})`" stroke-width="7" opacity="0.95"/>
                    <circle cx="60" cy="72" r="48" :fill="'none'" :stroke="`url(#gold${pos})`" stroke-width="2" opacity="0.5"/>
                    <circle cx="60" cy="72" r="39" :fill="'none'" :stroke="`url(#gold${pos})`" stroke-width="1.5" opacity="0.4"/>
                    <!-- 날개/장식 (하단) -->
                    <g v-if="pos===0" transform="translate(60,116)" fill="#ffd700" opacity="0.85">
                      <ellipse cx="-22" cy="0" rx="18" ry="6" transform="rotate(-20,-22,0)"/>
                      <ellipse cx="-30" cy="-4" rx="12" ry="4" transform="rotate(-35,-30,-4)"/>
                      <ellipse cx="22" cy="0" rx="18" ry="6" transform="rotate(20,22,0)"/>
                      <ellipse cx="30" cy="-4" rx="12" ry="4" transform="rotate(35,30,-4)"/>
                      <circle cx="0" cy="2" r="4"/>
                    </g>
                    <g v-if="pos===1" transform="translate(60,116)" fill="#b0c8e0" opacity="0.75">
                      <ellipse cx="-18" cy="0" rx="14" ry="5" transform="rotate(-20,-18,0)"/>
                      <ellipse cx="-24" cy="-3" rx="9" ry="3" transform="rotate(-35,-24,-3)"/>
                      <ellipse cx="18" cy="0" rx="14" ry="5" transform="rotate(20,18,0)"/>
                      <ellipse cx="24" cy="-3" rx="9" ry="3" transform="rotate(35,24,-3)"/>
                      <circle cx="0" cy="2" r="3"/>
                    </g>
                    <g v-if="pos===2" transform="translate(60,116)" fill="#c87830" opacity="0.7">
                      <ellipse cx="-15" cy="0" rx="12" ry="4" transform="rotate(-20,-15,0)"/>
                      <ellipse cx="-20" cy="-2" rx="8" ry="3" transform="rotate(-35,-20,-2)"/>
                      <ellipse cx="15" cy="0" rx="12" ry="4" transform="rotate(20,15,0)"/>
                      <ellipse cx="20" cy="-2" rx="8" ry="3" transform="rotate(35,20,-2)"/>
                    </g>
                  </svg>
                  <!-- 실제 이미지 -->
                  <div class="medal-img-inner">
                    <img v-if="avgRanked[pos].logo_url" :src="avgRanked[pos].logo_url" class="pod-logo" @error="e => e.target.style.display='none'" />
                    <div v-else class="pod-initial" :style="{ background: avgRanked[pos].color + '33', color: avgRanked[pos].color }">{{ avgRanked[pos].name.charAt(0) }}</div>
                  </div>
                </div>
              </div>
              <div class="pod-name">{{ avgRanked[pos].name }}</div>
              <div class="pod-score" :class="pos===0?'gold-score':pos===1?'silver-score':'bronze-score'">{{ fmt(avgRanked[pos].avg) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)">
                <div class="pod-badge" :class="'badge-'+(pos+1)">{{ pos===0?'1st':pos===1?'2nd':'3rd' }}</div>
              </div>
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
                <div class="pod-medal-frame" :class="'medal-frame-'+(pos+1)">
                  <svg class="medal-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient :id="'mgold'+pos" cx="50%" cy="40%">
                        <stop v-if="pos===0" offset="0%" stop-color="#fffbe0"/><stop v-if="pos===0" offset="50%" stop-color="#ffd700"/><stop v-if="pos===0" offset="100%" stop-color="#b8860b"/>
                        <stop v-if="pos===1" offset="0%" stop-color="#f0f8ff"/><stop v-if="pos===1" offset="50%" stop-color="#c0d8ee"/><stop v-if="pos===1" offset="100%" stop-color="#6a8fa8"/>
                        <stop v-if="pos===2" offset="0%" stop-color="#f8d8b0"/><stop v-if="pos===2" offset="50%" stop-color="#c87830"/><stop v-if="pos===2" offset="100%" stop-color="#7a4010"/>
                      </radialGradient>
                    </defs>
                    <g v-if="pos===0" transform="translate(60,18)" fill="#ffd700">
                      <polygon points="0,-14 -18,4 -10,4 0,-6 10,4 18,4" opacity="0.95"/>
                      <circle cx="-18" cy="5" r="3.5"/><circle cx="0" cy="-15" r="3.5"/><circle cx="18" cy="5" r="3.5"/>
                      <rect x="-18" y="5" width="36" height="7" rx="2"/>
                    </g>
                    <g v-if="pos===1" transform="translate(60,18)" fill="#c0d0e0">
                      <polygon points="0,-12 -15,3 -8,3 0,-5 8,3 15,3" opacity="0.9"/>
                      <circle cx="-15" cy="4" r="3"/><circle cx="0" cy="-13" r="3"/><circle cx="15" cy="4" r="3"/>
                      <rect x="-15" y="4" width="30" height="6" rx="2"/>
                    </g>
                    <g v-if="pos===2" transform="translate(60,18)" fill="#c87830">
                      <polygon points="0,-11 -13,2 -7,2 0,-4 7,2 13,2" opacity="0.9"/>
                      <circle cx="-13" cy="3" r="2.5"/><circle cx="0" cy="-12" r="2.5"/><circle cx="13" cy="3" r="2.5"/>
                      <rect x="-13" y="3" width="26" height="5" rx="2"/>
                    </g>
                    <circle cx="60" cy="72" r="44" fill="none" :stroke="`url(#mgold${pos})`" stroke-width="7" opacity="0.95"/>
                    <circle cx="60" cy="72" r="48" fill="none" :stroke="`url(#mgold${pos})`" stroke-width="2" opacity="0.5"/>
                    <circle cx="60" cy="72" r="39" fill="none" :stroke="`url(#mgold${pos})`" stroke-width="1.5" opacity="0.4"/>
                    <g v-if="pos===0" transform="translate(60,116)" fill="#ffd700" opacity="0.85">
                      <ellipse cx="-22" cy="0" rx="18" ry="6" transform="rotate(-20,-22,0)"/>
                      <ellipse cx="-30" cy="-4" rx="12" ry="4" transform="rotate(-35,-30,-4)"/>
                      <ellipse cx="22" cy="0" rx="18" ry="6" transform="rotate(20,22,0)"/>
                      <ellipse cx="30" cy="-4" rx="12" ry="4" transform="rotate(35,30,-4)"/>
                      <circle cx="0" cy="2" r="4"/>
                    </g>
                    <g v-if="pos===1" transform="translate(60,116)" fill="#b0c8e0" opacity="0.75">
                      <ellipse cx="-18" cy="0" rx="14" ry="5" transform="rotate(-20,-18,0)"/>
                      <ellipse cx="-24" cy="-3" rx="9" ry="3" transform="rotate(-35,-24,-3)"/>
                      <ellipse cx="18" cy="0" rx="14" ry="5" transform="rotate(20,18,0)"/>
                      <ellipse cx="24" cy="-3" rx="9" ry="3" transform="rotate(35,24,-3)"/>
                      <circle cx="0" cy="2" r="3"/>
                    </g>
                    <g v-if="pos===2" transform="translate(60,116)" fill="#c87830" opacity="0.7">
                      <ellipse cx="-15" cy="0" rx="12" ry="4" transform="rotate(-20,-15,0)"/>
                      <ellipse cx="-20" cy="-2" rx="8" ry="3" transform="rotate(-35,-20,-2)"/>
                      <ellipse cx="15" cy="0" rx="12" ry="4" transform="rotate(20,15,0)"/>
                      <ellipse cx="20" cy="-2" rx="8" ry="3" transform="rotate(35,20,-2)"/>
                    </g>
                  </svg>
                  <div class="medal-img-inner">
                    <img v-if="masterRanked[pos].logo_url" :src="masterRanked[pos].logo_url" class="pod-logo" @error="e => e.target.style.display='none'" />
                    <div v-else class="pod-initial" :style="{ background: masterRanked[pos].color + '33', color: masterRanked[pos].color }">{{ masterRanked[pos].name.charAt(0) }}</div>
                  </div>
                </div>
              </div>
              <div class="pod-name">{{ masterRanked[pos].name }}</div>
              <div class="pod-score" :class="pos===0?'gold-score':pos===1?'silver-score':'bronze-score'">{{ fmt(masterRanked[pos].master_balloons) }}</div>
              <div class="pod-stage" :class="'stage-'+(pos+1)">
                <div class="pod-badge" :class="'badge-'+(pos+1)">{{ pos===0?'1st':pos===1?'2nd':'3rd' }}</div>
              </div>
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
                <div class="pod-medal-frame" :class="'medal-frame-'+(pos+1)">
                  <svg class="medal-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient :id="'igold'+pos" cx="50%" cy="40%">
                        <stop v-if="pos===0" offset="0%" stop-color="#fffbe0"/><stop v-if="pos===0" offset="50%" stop-color="#ffd700"/><stop v-if="pos===0" offset="100%" stop-color="#b8860b"/>
                        <stop v-if="pos===1" offset="0%" stop-color="#f0f8ff"/><stop v-if="pos===1" offset="50%" stop-color="#c0d8ee"/><stop v-if="pos===1" offset="100%" stop-color="#6a8fa8"/>
                        <stop v-if="pos===2" offset="0%" stop-color="#f8d8b0"/><stop v-if="pos===2" offset="50%" stop-color="#c87830"/><stop v-if="pos===2" offset="100%" stop-color="#7a4010"/>
                      </radialGradient>
                    </defs>
                    <g v-if="pos===0" transform="translate(60,18)" fill="#ffd700">
                      <polygon points="0,-14 -18,4 -10,4 0,-6 10,4 18,4" opacity="0.95"/>
                      <circle cx="-18" cy="5" r="3.5"/><circle cx="0" cy="-15" r="3.5"/><circle cx="18" cy="5" r="3.5"/>
                      <rect x="-18" y="5" width="36" height="7" rx="2"/>
                    </g>
                    <g v-if="pos===1" transform="translate(60,18)" fill="#c0d0e0">
                      <polygon points="0,-12 -15,3 -8,3 0,-5 8,3 15,3" opacity="0.9"/>
                      <circle cx="-15" cy="4" r="3"/><circle cx="0" cy="-13" r="3"/><circle cx="15" cy="4" r="3"/>
                      <rect x="-15" y="4" width="30" height="6" rx="2"/>
                    </g>
                    <g v-if="pos===2" transform="translate(60,18)" fill="#c87830">
                      <polygon points="0,-11 -13,2 -7,2 0,-4 7,2 13,2" opacity="0.9"/>
                      <circle cx="-13" cy="3" r="2.5"/><circle cx="0" cy="-12" r="2.5"/><circle cx="13" cy="3" r="2.5"/>
                      <rect x="-13" y="3" width="26" height="5" rx="2"/>
                    </g>
                    <circle cx="60" cy="72" r="44" fill="none" :stroke="`url(#igold${pos})`" stroke-width="7" opacity="0.95"/>
                    <circle cx="60" cy="72" r="48" fill="none" :stroke="`url(#igold${pos})`" stroke-width="2" opacity="0.5"/>
                    <circle cx="60" cy="72" r="39" fill="none" :stroke="`url(#igold${pos})`" stroke-width="1.5" opacity="0.4"/>
                    <g v-if="pos===0" transform="translate(60,116)" fill="#ffd700" opacity="0.85">
                      <ellipse cx="-22" cy="0" rx="18" ry="6" transform="rotate(-20,-22,0)"/>
                      <ellipse cx="-30" cy="-4" rx="12" ry="4" transform="rotate(-35,-30,-4)"/>
                      <ellipse cx="22" cy="0" rx="18" ry="6" transform="rotate(20,22,0)"/>
                      <ellipse cx="30" cy="-4" rx="12" ry="4" transform="rotate(35,30,-4)"/>
                      <circle cx="0" cy="2" r="4"/>
                    </g>
                    <g v-if="pos===1" transform="translate(60,116)" fill="#b0c8e0" opacity="0.75">
                      <ellipse cx="-18" cy="0" rx="14" ry="5" transform="rotate(-20,-18,0)"/>
                      <ellipse cx="-24" cy="-3" rx="9" ry="3" transform="rotate(-35,-24,-3)"/>
                      <ellipse cx="18" cy="0" rx="14" ry="5" transform="rotate(20,18,0)"/>
                      <ellipse cx="24" cy="-3" rx="9" ry="3" transform="rotate(35,24,-3)"/>
                      <circle cx="0" cy="2" r="3"/>
                    </g>
                    <g v-if="pos===2" transform="translate(60,116)" fill="#c87830" opacity="0.7">
                      <ellipse cx="-15" cy="0" rx="12" ry="4" transform="rotate(-20,-15,0)"/>
                      <ellipse cx="-20" cy="-2" rx="8" ry="3" transform="rotate(-35,-20,-2)"/>
                      <ellipse cx="15" cy="0" rx="12" ry="4" transform="rotate(20,15,0)"/>
                      <ellipse cx="20" cy="-2" rx="8" ry="3" transform="rotate(35,20,-2)"/>
                    </g>
                  </svg>
                  <div class="medal-img-inner medal-img-circle">
                    <img :src="indivRanked[pos].profile_img || cdnUrl(indivRanked[pos].soop_id)" class="pod-profile" @error="onImgError($event, indivRanked[pos].soop_id)" />
                  </div>
                </div>
              </div>
              <div class="pod-name">{{ indivRanked[pos].name }}</div>
              <div class="pod-crew-chip" :style="{ background: indivRanked[pos].crew_color+'22', color: indivRanked[pos].crew_color, borderColor: indivRanked[pos].crew_color+'55' }">{{ indivRanked[pos].crew_name }}</div>
              <div class="pod-score" :class="pos===0?'gold-score':pos===1?'silver-score':'bronze-score'">{{ fmt(indivRanked[pos].balloons) }}</div>
              <div class="pod-stage pod-stage-indiv" :class="'stage-'+(pos+1)">
                <div class="pod-badge" :class="'badge-'+(pos+1)">{{ pos===0?'1st':pos===1?'2nd':'3rd' }}</div>
              </div>
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
  gap: 0; margin-bottom: 4px;
  position: relative;
}

/* ── 메달 프레임 전체 컨테이너 ── */
.pod-medal-frame {
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.pod-0 .pod-medal-frame { width: 110px; height: 128px; }
.pod-1 .pod-medal-frame { width: 90px;  height: 105px; }
.pod-2 .pod-medal-frame { width: 78px;  height: 91px;  }

/* SVG 장식 오버레이 - 프레임 위에 포개기 */
.medal-svg {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none; z-index: 3;
  filter: drop-shadow(0 0 4px rgba(0,0,0,0.6));
}
.medal-frame-1 .medal-svg { filter: drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.medal-frame-2 .medal-svg { filter: drop-shadow(0 0 6px rgba(180,210,230,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
.medal-frame-3 .medal-svg { filter: drop-shadow(0 0 6px rgba(200,120,48,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }

/* 실제 이미지 원형 클리핑 */
.medal-img-inner {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -54%);
  z-index: 2; overflow: hidden;
  border-radius: 50%;
  background: #111;
}
.pod-0 .medal-img-inner { width: 72px; height: 72px; }
.pod-1 .medal-img-inner { width: 58px; height: 58px; }
.pod-2 .medal-img-inner { width: 50px; height: 50px; }

.medal-img-circle { border-radius: 50%; }

/* 이미지 안쪽 */
.pod-logo, .pod-profile, .pod-initial {
  display: block; width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.pod-logo { object-fit: contain; border-radius: 8px; }
.pod-initial {
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 22px; border-radius: 50%;
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

/* 1st 2nd 3rd 배지 - 시상대 위 중앙 */
.pod-badge {
  position: absolute;
  top: -14px; left: 50%; transform: translateX(-50%);
  font-size: 10px; font-weight: 900; padding: 3px 13px;
  border-radius: 20px; letter-spacing: 0.8px;
  white-space: nowrap; z-index: 5;
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
  position: relative; overflow: visible;
  display: flex; align-items: flex-start; justify-content: center;
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