<template>
  <div class="card" :style="{ '--c': crew.color }">

    <!-- 헤더 -->
    <div class="card-header">
      <div class="rank-ribbon">{{ rank }}</div>

      <div class="logo-area">
        <img v-if="crew.logo_url" :src="crew.logo_url" class="logo-img" />
        <div v-else class="logo-placeholder">{{ crew.name.charAt(0) }}</div>
      </div>

      <div class="crew-info">
        <div class="crew-name">{{ crew.name }}</div>
        <div class="avg-block">
          <span class="avg-label">{{ mode === "viewer" ? "평균 시청자" : "평균 별풍선" }}</span>
          <span class="avg-val">{{ fmt(crew.avg) }}</span>
        </div>
      </div>
    </div>

    <!-- 멤버 리스트 -->
    <div class="member-list">
      <template v-for="(m, i) in crew.members" :key="m.id">
        <div
          class="member-row"
          :class="{ 'top1': i === 0, 'expanded': selectedMember?.id === m.id }"
          @click="toggleMember(m)"
          style="cursor:pointer"
        >
          <div class="rank-badge" :class="'r'+(i<3?i+1:'x')">
            <span v-if="i===0" class="top1-crown">👑</span>
            <span v-else>{{ i+1 }}</span>
          </div>

          <div class="profile-wrap">
            <img
              :src="m.profile_img || cdnUrl(m.soop_id)"
              class="profile-img"
              @error="onImgError($event, m.soop_id)"
            />
            <div class="profile-placeholder" style="display:none">{{ m.name.charAt(0) }}</div>
          </div>

          <div class="minfo">
            <div class="mname-row">
              <span class="mname">{{ m.name }}</span>
              <span v-if="m.is_new" class="new-badge">NEW</span>
            </div>
          </div>

          <div class="mright">
            <span class="mval" :class="tierClass(m.balloons)">{{ fmt(m.balloons) }}</span>
            <div class="mdaily-badge" v-if="m.daily_balloons > 0 && mode === 'balloon'">
              (<span class="mdaily-plus">+</span>{{ fmt(m.daily_balloons) }})
            </div>
          </div>

          <div class="expand-arrow" :class="{ open: selectedMember?.id === m.id }">▾</div>

          <div class="bar-absolute">
            <div class="bar-fill" :style="{ width: pct(m.balloons)+'%', background: tierColor(m.balloons) }" />
          </div>
        </div>

        <!-- 후원자 패널 (아코디언) -->
        <div v-if="selectedMember?.id === m.id" class="fan-panel">
          <div v-if="fanLoading" class="fan-loading">
            <span class="spin">⟳</span> 불러오는 중...
          </div>
          <div v-else-if="fanError" class="fan-error">{{ fanError }}</div>
          <div v-else>
            <div class="fan-title">이달의 후원자 TOP 10</div>
            <div class="fan-list-head">
              <span>순위</span>
              <span>닉네임</span>
              <span class="r">별풍선</span>
            </div>
            <div v-for="fan in fans" :key="fan.rank" class="fan-row" :class="'fr'+fan.rank">
              <div class="fan-rank">
                <span v-if="fan.rank === 1">🥇</span>
                <span v-else-if="fan.rank === 2">🥈</span>
                <span v-else-if="fan.rank === 3">🥉</span>
                <span v-else class="fan-rank-num">{{ fan.rank }}</span>
              </div>
              <div class="fan-name">{{ fan.name }}</div>
              <div class="fan-balloons r">{{ fan.balloons.toLocaleString('ko-KR') }}</div>
            </div>
            <div v-if="fans.length === 0" class="fan-empty">후원자 데이터가 없어요</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 푸터 -->
    <div class="card-foot">
      <div class="foot-item">
        <span class="foot-label">총원</span>
        <span class="foot-val">{{ crew.members.length }}명</span>
      </div>
      <div class="foot-divider" />
      <div class="foot-item">
        <span class="foot-label">합계</span>
        <span class="foot-val" :class="tierClass(crew.avg)">{{ fmt(crew.total) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../composables/useApi.js'

const props = defineProps({ crew: Object, maxBalloons: Number, rank: Number, mode: { type: String, default: 'balloon' }, year: Number, month: Number })

const selectedMember = ref(null)
const fanLoading = ref(false)
const fanError = ref('')
const fans = ref([])

async function toggleMember(m) {
  if (selectedMember.value?.id === m.id) {
    selectedMember.value = null
    return
  }
  selectedMember.value = m
  fanLoading.value = true
  fanError.value = ''
  fans.value = []
  try {
    const data = await api.getFanRanking(m.soop_id, props.year, props.month)
    fans.value = data.fans || []
  } catch(e) {
    fanError.value = '불러오기 실패: ' + e.message
  }
  fanLoading.value = false
}

function cdnUrl(soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

function fmt(n) { return (n||0).toLocaleString('ko-KR') }
function pct(n) { return props.maxBalloons ? Math.min(100, Math.round(n/props.maxBalloons*100)) : 0 }
function tierClass(n) {
  if (props.mode === 'viewer') {
    if (n>=500000)  return 't1'
    if (n>=400000)  return 't2'
    if (n>=300000)  return 't3'
    if (n>=150000)  return 't4'
    return 't5'
  }
  if (n>=1300000) return 't1'
  if (n>=1000000) return 't2'
  if (n>=700000)  return 't3'
  if (n>=400000)  return 't4'
  return 't5'
}
function tierColor(n) {
  if (props.mode === 'viewer') {
    if (n>=500000)  return '#ff4d7d'
    if (n>=400000)  return '#f5a623'
    if (n>=300000)  return '#4cd964'
    if (n>=150000)  return '#4a9eff'
    return '#666680'
  }
  if (n>=1300000) return '#ff4d7d'
  if (n>=1000000) return '#f5a623'
  if (n>=700000)  return '#4cd964'
  if (n>=400000)  return '#4a9eff'
  return '#666680'
}
function onImgError(e, soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  const cdn = `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
  if (e.target.src !== cdn) {
    e.target.src = cdn
  } else {
    e.target.style.display = 'none'
    const ph = e.target.nextElementSibling
    if (ph) ph.style.display = 'flex'
  }
}
</script>

<style scoped>
.card {
  background: var(--bg3);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  transition: transform 0.2s, box-shadow 0.2s;
  max-width: 290px;
  position: relative;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.25), 0 0 20px color-mix(in srgb, var(--c) 12%, transparent);
}

.card-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c) 60%, var(--bg4)) 0%,
    color-mix(in srgb, var(--c) 28%, var(--bg3)) 50%,
    var(--bg3) 100%
  );
  position: relative; overflow: hidden;
}
[data-theme="light"] .card-header {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c) 55%, #fff) 0%,
    color-mix(in srgb, var(--c) 22%, #fff) 50%,
    #fff 100%
  );
}
.card-header::before {
  content: ''; position: absolute; top: -30px; left: -20px;
  width: 110px; height: 110px;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 35%, transparent), transparent 70%);
  pointer-events: none;
}
.logo-area { flex-shrink: 0; position: relative; z-index: 1; }
.logo-img { width: 76px; height: 76px; border-radius: 0; object-fit: contain; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.45)); }
[data-theme="light"] .logo-img { filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18)); }
.logo-placeholder { width: 76px; height: 76px; border-radius: 14px; background: color-mix(in srgb, var(--c) 30%, var(--bg3)); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; color: var(--c); }

.crew-info { flex: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; position: relative; z-index: 1; padding-right: 6px; }
.crew-name { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
[data-theme="light"] .crew-name { text-shadow: none; }
.avg-block { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; margin-top: 2px; }
.avg-label { font-size: 11px; font-weight: 600; color: var(--text2); letter-spacing: 0; }
.avg-val { font-size: 22px; font-weight: 900; color: var(--c); letter-spacing: -0.8px; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.45); }
[data-theme="light"] .avg-val { color: color-mix(in srgb, var(--c) 55%, #000); text-shadow: none; }

.rank-ribbon {
  position: absolute; top: 0; left: 0;
  width: 32px; height: 32px;
  background: var(--c);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900; color: #fff;
  border-radius: 0 0 14px 0;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
  z-index: 3;
}

.member-list { flex: 1; background: var(--member-bg); }
.member-list::before {
  content: ''; display: block; height: 6px;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--c) 10%, var(--bg3)) 0%, var(--member-bg) 100%);
}

.member-row {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 12px 12px;
  border-top: 1px solid var(--border2);
  position: relative; transition: background 0.12s;
}
.member-row:first-child { border-top: none; }
.member-row:hover { background: var(--member-hover); }
.member-row.expanded { background: color-mix(in srgb, var(--c) 8%, var(--member-bg)); }

.member-row.top1 {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--c) 25%, var(--member-bg)) 0%, 
    color-mix(in srgb, var(--c) 12%, var(--member-bg)) 50%, 
    color-mix(in srgb, var(--c) 25%, var(--member-bg)) 100%);
  background-size: 200% 100%;
  animation: top1Shimmer 4s linear infinite;
  border-left: 4px solid var(--c);
  padding: 16px 12px 14px 10px;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 8px;
  position: relative;
}
.member-row.top1::after {
  content: '👑 1ST';
  position: absolute;
  top: -9px; left: 12px;
  background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 70%, #fff));
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  padding: 3px 9px;
  border-radius: 10px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c) 50%, transparent);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  z-index: 2;
}
@keyframes top1Shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

[data-theme="light"] .member-row.top1 {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--c) 22%, #fff) 0%, 
    color-mix(in srgb, var(--c) 8%, #fff) 50%, 
    color-mix(in srgb, var(--c) 22%, #fff) 100%);
  background-size: 200% 100%;
  animation: top1Shimmer 4s linear infinite;
}
[data-theme="light"] .member-row.top1::after {
  background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 75%, #000));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c) 30%, transparent);
}
.member-row.top1.expanded { 
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--c) 32%, var(--member-bg)) 0%, 
    color-mix(in srgb, var(--c) 18%, var(--member-bg)) 50%, 
    color-mix(in srgb, var(--c) 32%, var(--member-bg)) 100%);
  background-size: 200% 100%;
  animation: top1Shimmer 4s linear infinite;
}
[data-theme="light"] .member-row.top1.expanded { 
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--c) 28%, #fff) 0%, 
    color-mix(in srgb, var(--c) 14%, #fff) 50%, 
    color-mix(in srgb, var(--c) 28%, #fff) 100%);
  background-size: 200% 100%;
  animation: top1Shimmer 4s linear infinite;
}
.member-row.top1 .rank-badge { display: none; }
.member-row.top1 .profile-wrap { width: 38px; height: 38px; }
.member-row.top1 .profile-img { 
  width: 38px; 
  height: 38px; 
  border: 2px solid var(--c); 
  box-shadow: 0 0 12px color-mix(in srgb, var(--c) 60%, transparent);
}
[data-theme="light"] .member-row.top1 .profile-img {
  box-shadow: 0 0 8px color-mix(in srgb, var(--c) 35%, transparent);
}
.member-row.top1 .profile-placeholder { width: 38px; height: 38px; font-size: 14px; }
.member-row.top1 .minfo { flex: 1; padding-left: 2px; }
.member-row.top1 .mname { font-size: 15px; font-weight: 800; color: var(--text); }
.member-row.top1 .mval { 
  font-size: 17px; 
  font-weight: 900;
  text-shadow: 0 0 8px color-mix(in srgb, var(--c) 30%, transparent);
}
[data-theme="light"] .member-row.top1 .mval {
  text-shadow: none;
}
.top1-crown { display: none; }

.expand-arrow {
  font-size: 14px; color: var(--text4);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.expand-arrow.open { transform: rotate(180deg); color: var(--c); }

.rank-badge { width: 17px; height: 17px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; flex-shrink: 0; }
.r1 { background: rgba(255,200,50,0.2); color: #ffc832; }
.r2 { background: rgba(180,180,200,0.13); color: #b0b0cc; }
.r3 { background: rgba(180,120,60,0.13); color: #cc9966; }
.rx { background: var(--bar-bg); color: var(--text4); }

.profile-wrap { flex-shrink: 0; width: 28px; height: 28px; position: relative; }
.profile-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid color-mix(in srgb, var(--c) 25%, var(--border)); }
.profile-placeholder { width: 28px; height: 28px; border-radius: 50%; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 15%, var(--bg3)); border: 1.5px solid var(--border); }

.minfo { flex: 1; min-width: 0; }
.mname-row { display: flex; align-items: center; gap: 4px; }
.mname { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.new-badge { font-size: 8px; font-weight: 800; color: #fff; background: #ff4d7d; padding: 1px 4px; border-radius: 4px; flex-shrink: 0; }

.mright { display: flex; flex-direction: column; align-items: flex-end; gap: 0; flex-shrink: 0; }
.mval { font-size: 13px; font-weight: 800; letter-spacing: -0.4px; line-height: 1; }
.mdaily-badge {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 400;
  margin-top: 7px;
  letter-spacing: -0.2px; line-height: 1.4;
  color: #ff3b3b;
}

/* 후원자 패널 */
.fan-panel {
  background: color-mix(in srgb, var(--c) 5%, var(--bg3));
  border-top: 1px solid color-mix(in srgb, var(--c) 20%, var(--border));
  border-bottom: 1px solid color-mix(in srgb, var(--c) 20%, var(--border));
  padding: 8px 0 10px;
  animation: fanSlide 0.2s ease;
}
@keyframes fanSlide { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }

.fan-title {
  font-size: 10px; font-weight: 700; color: var(--c);
  padding: 0 12px 6px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.fan-loading {
  display: flex; align-items: center; gap: 6px;
  padding: 16px 12px; font-size: 12px; color: var(--text3);
}
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg) } }

.fan-error { padding: 12px; color: #ff4d4d; font-size: 12px; }

.fan-list-head {
  grid-template-columns: 28px 1fr 70px;
  padding: 0 12px 4px;
  font-size: 9px; font-weight: 600; color: var(--text4);
  text-transform: uppercase; letter-spacing: 0.3px;
  border-bottom: 1px solid var(--border2);
  margin-bottom: 2px;
}
.fan-row {
  display: grid; grid-template-columns: 28px 1fr 70px;
  align-items: center; padding: 5px 12px;
  gap: 4px; transition: background 0.1s;
}
.fan-row:hover { background: var(--member-hover); }
.fan-row.fr1 { background: rgba(255,200,50,0.05); }
.fan-row.fr2 { background: rgba(180,180,200,0.03); }
.fan-row.fr3 { background: rgba(180,120,60,0.03); }

.fan-rank { display: flex; align-items: center; justify-content: center; font-size: 13px; }
.fan-rank-num { font-size: 10px; font-weight: 700; color: var(--text4); }
.fan-name { font-size: 11px; font-weight: 600; color: var(--text); word-break: break-all; }
.fan-count { font-size: 10px; color: var(--text3); text-align: right; }
.fan-balloons { font-size: 11px; font-weight: 700; color: #f5a623; text-align: right; letter-spacing: -0.3px; }
.r { text-align: right; }
.fan-empty { text-align: center; color: var(--text4); padding: 16px; font-size: 12px; }

.t1{color:#ff4d7d}.t2{color:#f5a623}.t3{color:#4cd964}.t4{color:#4a9eff}.t5{color:#d8d8e8}
[data-theme="light"] .t1{color:#d6004a}
[data-theme="light"] .t2{color:#b87000}
[data-theme="light"] .t3{color:#1e9e3a}
[data-theme="light"] .t4{color:#1565c0}
[data-theme="light"] .t5{color:#1a1a2e}

.bar-absolute { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: var(--bar-bg); }
.bar-fill { height: 100%; border-radius: 0 2px 2px 0; transition: width 0.6s ease; }

.card-foot {
  display: flex; align-items: stretch;
  border-top: 1px solid var(--border);
  background: var(--foot-bg);
}
.foot-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 9px 6px; gap: 3px; }
.foot-divider { width: 1px; background: var(--border); margin: 6px 0; }
.foot-label { font-size: 10px; color: var(--text2); letter-spacing: 0; font-weight: 600; }
.foot-val { font-size: 13px; font-weight: 900; color: var(--text); letter-spacing: -0.3px; }
[data-theme="light"] .foot-val { color: #0f0f1a; }
.card-foot .foot-val.t1,
.card-foot .foot-val.t2,
.card-foot .foot-val.t3,
.card-foot .foot-val.t4,
.card-foot .foot-val.t5 { color: var(--text); }
[data-theme="light"] .card-foot .foot-val.t1,
[data-theme="light"] .card-foot .foot-val.t2,
[data-theme="light"] .card-foot .foot-val.t3,
[data-theme="light"] .card-foot .foot-val.t4,
[data-theme="light"] .card-foot .foot-val.t5 { color: #0f0f1a; }

@media (max-width: 600px) {
  .card { max-width: 100%; }
  .profile-wrap { display: none; }
  .member-row.top1 .profile-wrap { display: none; }
  .crew-name { font-size: 16px; }
  .avg-val { font-size: 16px; }
  .logo-img { width: 52px; height: 52px; }
  .logo-placeholder { width: 52px; height: 52px; font-size: 18px; }
  .mname { font-size: 11px; }
  .mval { font-size: 11px; }
  .member-row { padding: 5px 8px 9px; gap: 4px; }
  .member-row.top1 .mname { font-size: 13px; }
  .member-row.top1 .mval { font-size: 14px; }
}
</style>