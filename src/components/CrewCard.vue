<template>
  <div class="card" :style="{ '--c': crew.color }">

    <!-- 헤더 -->
    <div class="card-header">
      <!-- 크루 순위: 로고 왼쪽 상단 리본 -->
      <div class="rank-ribbon">{{ rank }}</div>

      <div class="logo-area">
        <img v-if="crew.logo_url" :src="crew.logo_url" class="logo-img" />
        <div v-else class="logo-placeholder">{{ crew.name.charAt(0) }}</div>
      </div>

      <div class="crew-info">
        <div class="crew-name">{{ crew.name }}</div>
        <!-- 평균: 라벨 작게, 숫자 크게 분리 -->
        <div class="avg-block">
          <span class="avg-label">{{ mode === "viewer" ? "평균 시청자" : "평균 별풍선" }}</span>
          <span class="avg-val">{{ fmt(crew.avg) }}</span>
        </div>

      </div>
    </div>

    <!-- 멤버 리스트 -->
    <div class="member-list">
      <div
        v-for="(m, i) in crew.members"
        :key="m.id"
        class="member-row"
        :class="{ 'top1': i === 0 }"
        @click="selectedMember = m"
        style="cursor:pointer"
      >
        <!-- 순위 먼저 -->
        <div class="rank-badge" :class="'r'+(i<3?i+1:'x')">
          <span v-if="i===0" class="top1-crown">👑</span>
          <span v-else>{{ i+1 }}</span>
        </div>

        <!-- 프사: DB저장값 우선, 없으면 CDN URL, 둘다 실패시 플레이스홀더 -->
        <div class="profile-wrap">
          <img
            :src="m.profile_img || cdnUrl(m.soop_id)"
            class="profile-img"
            @error="onImgError($event, m.soop_id)"
          />
          <div class="profile-placeholder" style="display:none">{{ m.name.charAt(0) }}</div>
        </div>

        <!-- 이름 + 지난달 + 증감 -->
        <div class="minfo">
          <div class="mname-row">
            <span class="mname">{{ m.name }}</span>
            <span v-if="m.is_new" class="new-badge">NEW</span>
          </div>

        </div>

        <!-- 풍선 수 + 일일 -->
        <div class="mright">
          <span class="mval" :class="tierClass(m.balloons)">{{ fmt(m.balloons) }}</span>
          <div class="mdaily-badge" v-if="m.daily_balloons > 0 && mode === 'balloon'">
(<span class="mdaily-plus">+</span>{{ fmt(m.daily_balloons) }})
          </div>
        </div>

        <!-- 게이지바 -->
        <div class="bar-absolute">
          <div class="bar-fill" :style="{ width: pct(m.balloons)+'%', background: tierColor(m.balloons) }" />
        </div>
      </div>
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

  <!-- 팬랭킹 모달 -->
  <FanRankingModal
    v-if="selectedMember"
    :member="selectedMember"
    :year="year"
    :month="month"
    @close="selectedMember = null"
  />
</template>

<script setup>
import { ref } from 'vue'
import FanRankingModal from './FanRankingModal.vue'

const props = defineProps({ crew: Object, maxBalloons: Number, rank: Number, mode: { type: String, default: 'balloon' }, year: Number, month: Number })

const selectedMember = ref(null)

// sooplive CDN URL 생성 - 첫 두글자가 폴더명
// 예: jaeha010 → /LOGO/ja/jaeha010/jaeha010.jpg
function cdnUrl(soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

function fmt(n) { return (n||0).toLocaleString('ko-KR') }
function pct(n) { return props.maxBalloons ? Math.min(100, Math.round(n/props.maxBalloons*100)) : 0 }
function tierClass(n) {
  if (props.mode === 'viewer') {
    if (n>=1000000) return 't1'
    if (n>=700000)  return 't2'
    if (n>=500000)  return 't3'
    if (n>=300000)  return 't4'
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
    if (n>=1000000) return '#ff4d7d'
    if (n>=700000)  return '#f5a623'
    if (n>=500000)  return '#4cd964'
    if (n>=300000)  return '#4a9eff'
    return '#666680'
  }
  if (n>=1300000) return '#ff4d7d'
  if (n>=1000000) return '#f5a623'
  if (n>=700000)  return '#4cd964'
  if (n>=400000)  return '#4a9eff'
  return '#666680'
}
function onImgError(e, soopId) {
  // DB값 실패 → CDN URL로 재시도
  const prefix = soopId.slice(0, 2).toLowerCase()
  const cdn = `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
  if (e.target.src !== cdn) {
    e.target.src = cdn
  } else {
    // CDN도 실패 → 이니셜 플레이스홀더
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

/* 크루 순위 리본 */
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
.crew-diff { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.diff-label { font-size: 9px; color: var(--text3); }
.diff-val { font-size: 11px; font-weight: 700; }
.diff-val.up { color: #4cd964; }
.diff-val.down { color: #ff4d4d; }

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

.member-row.top1 {
  background: color-mix(in srgb, var(--c) 14%, var(--member-bg));
  border-left: 4px solid var(--c);
  padding: 10px 12px 14px 10px;
  flex-wrap: wrap;
  gap: 0;
}
.member-row.top1 .rank-badge { display: none; }
.member-row.top1 .profile-wrap { width: 38px; height: 38px; }
.member-row.top1 .profile-img { width: 38px; height: 38px; border: 2px solid var(--c); }
.member-row.top1 .profile-placeholder { width: 38px; height: 38px; font-size: 14px; }
.member-row.top1 .minfo { flex: 1; padding-left: 2px; }
.member-row.top1 .mname { font-size: 15px; font-weight: 800; color: var(--text); }
.member-row.top1 .mval { font-size: 17px; font-weight: 900; }
.top1-crown { font-size: 11px; margin-right: 2px; }

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

.mprev-row { display: flex; align-items: center; gap: 4px; margin-top: 2px; flex-wrap: wrap; }
.mprev { font-size: 9px; color: var(--text3); }
.mdiff { font-size: 9px; font-weight: 700; }
.mdiff.up { color: #4cd964; }
.mdiff.down { color: #ff4d4d; }

.mright { display: flex; flex-direction: column; align-items: flex-end; gap: 0; flex-shrink: 0; }
.mval { font-size: 13px; font-weight: 800; letter-spacing: -0.4px; line-height: 1; }
.mdaily-badge {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 400;
  margin-top: 7px;
  letter-spacing: -0.2px; line-height: 1.4;
  color: #ff3b3b;
}
.mdaily-badge.up {
  color: #34c759;
  background: rgba(52,199,89,0.10);
  border: 1px solid rgba(52,199,89,0.2);
  padding: 1px 5px; border-radius: 4px;
}
.mdaily-badge.down {
  color: #ff3b3b;
  background: rgba(255,59,59,0.10);
  border: 1px solid rgba(255,59,59,0.2);
  padding: 1px 5px; border-radius: 4px;
}

.t1{color:#ff4d7d}.t2{color:#f5a623}.t3{color:#4cd964}.t4{color:#4a9eff}.t5{color:#9b9bbf}
[data-theme="light"] .t1{color:#d6004a}
[data-theme="light"] .t2{color:#b87000}
[data-theme="light"] .t3{color:#1e9e3a}
[data-theme="light"] .t4{color:#1565c0}
[data-theme="light"] .t5{color:#44445a}

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
/* 합계: 티어 클래스 무력화 - 완전 기본 텍스트 스타일로 */
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
.foot-prev { font-size: 11px; color: var(--text2); font-weight: 600; }
</style>