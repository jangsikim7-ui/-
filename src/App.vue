<template>
  <div class="app">
    <header class="header">
      <div class="hl">
        <div class="logo">⚡ 엑셀크루 시너지표</div>
        <div class="source">출처: poong.today · 8시간마다 자동 갱신</div>
      </div>

      <div class="hc">
        <button class="mbtn" @click="prevMonth" :disabled="!canGoPrev" :title="canGoPrev ? '이전달' : '3개월 전까지만 볼 수 있어요'">‹</button>
        <div class="mdisp">
          <span class="my">{{ year }}</span><span class="md">.</span><span class="mm">{{ String(month).padStart(2,'0') }}</span>
        </div>
        <button class="mbtn" @click="nextMonth" :disabled="!canGoNext" title="다음달">›</button>
      </div>

      <div class="hr">
        <span class="updated" v-if="lastCollected">{{ formatTime(lastCollected) }} 수집</span>
        <button class="btn-theme" @click="toggleTheme" :title="isDark ? '라이트 모드' : '다크 모드'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <template v-if="isAdmin">
          <button class="btn-collect btn-sync" @click="triggerSync" :disabled="syncing" title="낙수표와 동기화">
            {{ syncing ? '동기화중...' : '🔄 낙수동기화' }}
          </button>
          <button class="btn-collect" @click="triggerCollect" :disabled="collecting">
            {{ collecting ? '수집중...' : '♻️ 수집' }}
          </button>
          <button class="btn-collect" @click="triggerUpdateProfiles" :disabled="updatingProfiles" title="BJ 프사 일괄 업데이트">
            {{ updatingProfiles ? '업데이트중...' : '👤 프사갱신' }}
          </button>
          <button class="btn-admin" @click="showAdmin = true">⚙️ 관리</button>
          <button class="btn-logout" @click="logout" title="관리자 로그아웃">🔓</button>
        </template>
        <button v-else class="btn-admin" @click="showLoginModal = true">🔐 관리자</button>
      </div>
    </header>

    <!-- 모드 탭 -->
    <div class="mode-tabs">
      <button class="mode-tab" :class="{ active: mode === 'balloon' }" @click="setMode('balloon')">
        🎈 별풍선
      </button>
      <button class="mode-tab" :class="{ active: mode === 'viewer' }" @click="setMode('viewer')">
        👁️ 뷰어십
      </button>

      <!-- 크루대결 버튼 - 탭 옆에 -->
      <button v-if="battleEnabled" class="btn-battle-center pc-only" @click="showBattle = true">
        ⚔️ 크루대결
      </button>

      <a
        href="https://ygosu.com/msg/?m2=write&member=703386"
        target="_blank"
        rel="noopener"
        class="contact-btn"
      >
        📩 문의하기
      </a>
    </div>

    <!-- 범례 -->
    <div class="legend" v-if="mode === 'balloon'">
      <span class="li"><i style="background:#ff4d7d"/>130만+</span>
      <span class="li"><i style="background:#f5a623"/>100만+</span>
      <span class="li"><i style="background:#4cd964"/>70만+</span>
      <span class="li"><i style="background:#4a9eff"/>40만+</span>
      <span class="li"><i style="background:#666680"/>40만↓</span>
      <span class="contact-hint">데이터 수정 및 오류 제보는 문의하기 눌러주세요</span>
    </div>
    <div class="legend" v-if="mode === 'viewer'">
      <span class="li"><i style="background:#ff4d7d"/>50만+</span>
      <span class="li"><i style="background:#f5a623"/>40만+</span>
      <span class="li"><i style="background:#4cd964"/>30만+</span>
      <span class="li"><i style="background:#4a9eff"/>15만+</span>
      <span class="li"><i style="background:#666680"/>15만↓</span>
      <span class="contact-hint">데이터 수정 및 오류 제보는 문의하기 눌러주세요</span>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="state">
      <div class="spin"/><span>불러오는 중...</span>
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="state" style="color:#ff6b6b">{{ error }}</div>

    <!-- 빈 상태 -->
    <div v-else-if="stats.length === 0" class="state">
      <div style="font-size:36px;margin-bottom:10px">📊</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">데이터가 없어요</div>
      <div class="empty-desc">⚙️ 관리 버튼으로 크루와 멤버를 추가하세요</div>
      <button class="btn-admin" style="margin-top:14px" @click="showAdmin = true">⚙️ 관리 열기</button>
    </div>

    <!-- 크루 그리드 -->
    <main v-else class="grid">
      <CrewCard
        v-for="(crew, i) in stats"
        :key="crew.id"
        :crew="crew"
        :maxBalloons="maxBalloons"
        :rank="i + 1"
        :isDark="isDark"
        :mode="mode"
        :year="year"
        :month="month"
      />
    </main>

    <!-- 관리자 로그인 모달 -->
    <div v-if="showLoginModal" class="login-overlay" @click.self="showLoginModal=false">
      <div class="login-modal">
        <div class="login-title">🔐 관리자 로그인</div>
        <input
          v-model="loginPassword"
          type="password"
          class="login-input"
          placeholder="비밀번호 입력"
          @keyup.enter="login"
          autofocus
        />
        <div v-if="loginError" class="login-error">{{ loginError }}</div>
        <div class="login-btns">
          <button class="btn-login" @click="login">로그인</button>
          <button class="btn-login-cancel" @click="showLoginModal=false">취소</button>
        </div>
      </div>
    </div>

    <AdminModal v-if="showAdmin" @close="showAdmin = false" @updated="loadStats" @battle-toggle="onBattleToggle" />
    <CrewBattleModal v-if="showBattle" :crews="stats" :mode="mode" @close="showBattle = false" />

    <!-- 웰컴 팝업 -->
    <div v-if="showWelcomePopup" class="popup-overlay" @click.self="closePopup">
      <div class="popup-box">
        <button class="popup-x" @click="closePopup">✕</button>
        <span class="popup-pill">⚡ 엑셀크루 시너지표</span>
        <p class="popup-ttl">어떤 기능들이<br>있는지 알아봐요</p>
        <p class="popup-sub">크루별 BJ 데이터를 다양한 방식으로 확인하세요</p>
     <div class="popup-grid">
  <div class="popup-feat balloon">
    <div class="feat-top"><div class="feat-ico">🎈</div><span class="feat-nm">별풍선 순위</span></div>
    <p class="feat-ds">크루별 월간 별풍선 현황 비교</p>
  </div>
  <div class="popup-feat viewer">
    <div class="feat-top"><div class="feat-ico">👁️</div><span class="feat-nm">뷰어십 순위</span></div>
    <p class="feat-ds">시청자 수 기준 크루 경쟁력 확인</p>
  </div>
  <div class="popup-feat battle">
    <div class="feat-top"><div class="feat-ico">⚔️</div><span class="feat-nm">크루대결</span></div>
    <p class="feat-ds">두 크루를 직접 맞대결 비교</p>
  </div>
  <div class="popup-feat contact">
    <div class="feat-top"><div class="feat-ico">📩</div><span class="feat-nm">문의하기</span></div>
    <p class="feat-ds">오류·수정 요청 바로 전송</p>
  </div>
  <div class="popup-feat full gold-card">
    <div class="feat-top"><div class="feat-ico">👑</div><span class="feat-nm">크루 매출풍</span></div>
    <p class="feat-ds">엑셀크루 수장 월간 별풍선</p>
  </div>
  <div class="popup-feat full fan-card">
    <div class="feat-top"><div class="feat-ico">🏅</div><span class="feat-nm">이달의 후원자</span></div>
    <p class="feat-ds">BJ 이름 클릭 시 TOP 10 후원자 확인 가능</p>
  </div>
</div>
        <div class="popup-auto">
          <span class="popup-dot"></span>
          <span>데이터 <strong>4시간마다 자동 갱신</strong></span>
        </div>
        <button class="popup-btn" @click="closePopup">확인했어요!</button>
        <div class="popup-sep"></div>
        <div class="popup-skip" @click="skipToday = !skipToday">
          <div class="popup-chk" :class="{ on: skipToday }">✓</div>
          <span class="popup-sk-lbl">오늘 하루 안 보기</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import CrewCard from './components/CrewCard.vue'
import AdminModal from './components/AdminModal.vue'
import CrewBattleModal from './components/CrewBattleModal.vue'
import { api, getAdminToken, setAdminToken, clearAdminToken } from './composables/useApi.js'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const stats = ref([])
const loading = ref(false)
const error = ref('')
const showAdmin = ref(false)
const showBattle = ref(false)
const mode = ref('balloon')
const isAdmin = ref(false)
const showLoginModal = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const collecting = ref(false)
const collectingPrev = ref(false)
const syncing = ref(false)
const updatingProfiles = ref(false)

// 웰컴 팝업
const showWelcomePopup = ref(false)
const skipToday = ref(false)

function closePopup() {
  if (skipToday.value) {
    localStorage.setItem('popup_hidden_until', new Date().toDateString())
  }
  showWelcomePopup.value = false
}

const battleEnabled = ref(localStorage.getItem('battle_enabled') !== 'false')

function onBattleToggle(value) {
  battleEnabled.value = value
  localStorage.setItem('battle_enabled', value ? 'true' : 'false')
}

const MIN_MONTHS_BACK = 2

function getOldestAllowed() {
  const n = new Date()
  const m = n.getMonth() + 1 - MIN_MONTHS_BACK
  let y = n.getFullYear()
  let mm = m
  if (mm <= 0) { mm += 12; y-- }
  return { year: y, month: mm }
}

const canGoPrev = computed(() => {
  const oldest = getOldestAllowed()
  if (year.value > oldest.year) return true
  if (year.value === oldest.year && month.value > oldest.month) return true
  return false
})

const canGoNext = computed(() => {
  const n = new Date()
  if (year.value < n.getFullYear()) return true
  if (year.value === n.getFullYear() && month.value < n.getMonth() + 1) return true
  return false
})

async function triggerUpdateProfiles() {
  updatingProfiles.value = true
  await api.updateProfiles()
  setTimeout(() => { loadStats(); updatingProfiles.value = false }, 15000)
}
const lastCollected = ref(null)
const isDark = ref(true)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

const maxBalloons = computed(() => {
  let max = 0
  for (const crew of stats.value)
    for (const m of crew.members)
      if (m.balloons > max) max = m.balloons
  return max
})

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    const data = mode.value === 'viewer'
      ? await api.getViewerStats(year.value, month.value)
      : await api.getStats(year.value, month.value)
    stats.value = data.crews
    const lc = await api.lastCollected()
    lastCollected.value = lc.last_collected
  } catch(e) { error.value = '로드 실패: ' + e.message }
  loading.value = false
}

function setMode(m) {
  mode.value = m
  loadStats()
}

function prevMonth() {
  if (!canGoPrev.value) return
  if (month.value === 1) { month.value = 12; year.value-- }
  else month.value--
  loadStats()
}
function nextMonth() {
  if (!canGoNext.value) return
  if (month.value === 12) { month.value = 1; year.value++ }
  else month.value++
  loadStats()
}

async function triggerCollectPrev() {
  collectingPrev.value = true
  await api.collectPrev()
  setTimeout(() => { loadStats(); collectingPrev.value = false }, 10000)
}

async function login() {
  loginError.value = ''
  try {
    const res = await api.adminLogin(loginPassword.value)
    if (res.ok) {
      setAdminToken(res.token)
      isAdmin.value = true
      showLoginModal.value = false
      loginPassword.value = ''
    }
  } catch(e) {
    loginError.value = '비밀번호가 틀렸어요'
  }
}

function logout() {
  clearAdminToken()
  isAdmin.value = false
}

async function triggerSync() {
  syncing.value = true
  try {
    const diff = await api.syncDiff()
    if (diff.total === 0) {
      alert('✅ 변경사항 없음 — 낙수표와 동일해요!')
      syncing.value = false
      return
    }
    const msg = [
      diff.added.length > 0 ? `➕ 추가 ${diff.added.length}명:\n${diff.added.map(m=>`  • ${m.crew_name} - ${m.name}`).join('\n')}` : '',
      diff.removed.length > 0 ? `➖ 삭제 ${diff.removed.length}명:\n${diff.removed.map(m=>`  • ${m.crew_name} - ${m.name}`).join('\n')}` : '',
      diff.moved.length > 0 ? `🔀 이동 ${diff.moved.length}명:\n${diff.moved.map(m=>`  • ${m.name}: ${m.from_crew} → ${m.to_crew}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n')

    if (!confirm(`낙수표 변경사항 감지!\n\n${msg}\n\n전체 적용할까요?`)) {
      syncing.value = false
      return
    }
    await api.syncApply({ added: diff.added, removed: diff.removed, moved: diff.moved })
    await loadStats()
    alert(`동기화 완료!\n추가 ${diff.added.length}명 / 삭제 ${diff.removed.length}명 / 이동 ${diff.moved.length}명`)
  } catch(e) { alert('동기화 실패: ' + e.message) }
  syncing.value = false
}

async function triggerCollect() {
  collecting.value = true
  await api.collect()
  setTimeout(() => { loadStats(); collecting.value = false }, 8000)
}

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

onMounted(async () => {
  const saved = localStorage.getItem('theme') || 'dark'
  isDark.value = saved === 'dark'
  document.documentElement.setAttribute('data-theme', saved)

  if (getAdminToken()) isAdmin.value = true

  // 오늘 하루 안보기 체크
  const hiddenUntil = localStorage.getItem('popup_hidden_until')
  if (hiddenUntil !== new Date().toDateString()) {
    showWelcomePopup.value = true
  }

  loadStats()
  setInterval(loadStats, 8 * 60 * 60 * 1000)
})
</script>

<style scoped>
.app { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 20px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 100;
  gap: 10px; flex-wrap: wrap;
  transition: background 0.3s;
}
.logo { font-size: 15px; font-weight: 900; color: var(--text); }
.source { font-size: 10px; color: var(--text3); margin-top: 1px; }

.hc { display: flex; align-items: center; gap: 10px; }
.mbtn {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--btn-ghost-bg); border: 1px solid var(--border);
  color: var(--text); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s; font-family: inherit;
}
.mbtn:hover:not(:disabled) { background: var(--input-border); }
.mbtn:disabled { opacity: 0.3; cursor: not-allowed; }
.mdisp { display: flex; align-items: baseline; gap: 1px; }
.my, .mm { font-size: 20px; font-weight: 900; color: var(--text); }
.md { font-size: 16px; color: var(--text3); }

.hr { display: flex; align-items: center; gap: 8px; }
.updated { font-size: 10px; color: var(--text3); }

.btn-theme {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--btn-ghost-bg); border: 1px solid var(--border);
  font-size: 14px; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: all 0.15s;
}
.btn-theme:hover { background: var(--input-border); }

.btn-collect {
  padding: 6px 12px; border-radius: 7px; font-size: 11px; font-weight: 600;
  background: var(--btn-ghost-bg); border: 1px solid var(--border);
  color: var(--btn-ghost-color); cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.btn-collect:hover:not(:disabled) { color: var(--text); }
.btn-collect:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sync { border-color: #6bcb77; color: #6bcb77; }
.btn-sync:hover:not(:disabled) { background: rgba(107,203,119,0.1); }

.btn-logout { background: none; border: 1px solid var(--border); color: var(--text3); padding: 5px 8px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-logout:hover { color: var(--text); }

.btn-admin {
  padding: 6px 12px; border-radius: 7px; font-size: 11px; font-weight: 700;
  background: #4a9eff; border: none; color: #fff; cursor: pointer;
  transition: background 0.15s; font-family: inherit;
}
.btn-admin:hover { background: #3a8ef0; }

.login-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.login-modal { background: var(--bg3); border: 1px solid var(--border); border-radius: 16px; padding: 28px 24px; width: 300px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.login-title { font-size: 16px; font-weight: 800; color: var(--text); text-align: center; }
.login-input { background: var(--bg4); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 14px; outline: none; }
.login-input:focus { border-color: var(--text3); }
.login-error { font-size: 12px; color: #ff4d4d; text-align: center; }
.login-btns { display: flex; gap: 8px; }
.btn-login { flex: 1; padding: 10px; border-radius: 8px; border: none; background: var(--text); color: var(--bg); font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-login-cancel { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: none; color: var(--text3); font-size: 13px; cursor: pointer; }

/* 모드 탭 */
.mode-tabs {
  position: relative;
  display: flex;
  gap: 8px;
  padding: 12px 20px 0;
  justify-content: center;
  background: var(--bg2);
}
.mode-tab {
  padding: 8px 28px;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: var(--bg3);
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  letter-spacing: -0.2px;
}
.mode-tab:hover { border-color: var(--text3); color: var(--text); }
.mode-tab.active {
  background: var(--text); color: var(--bg);
  border-color: var(--text);
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
}

.btn-battle-center {
  padding: 8px 18px; border-radius: 999px;
  background: linear-gradient(135deg, #4a9eff, #6b5fff);
  color: #fff; border: none; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all 0.18s;
  box-shadow: 0 2px 8px rgba(74,158,255,0.3); white-space: nowrap;
}
.btn-battle-center:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(74,158,255,0.5); }

.legend {
  display: flex; align-items: center; gap: 14px;
  padding: 7px 20px; background: var(--bg2);
  border-bottom: 1px solid var(--border); flex-wrap: wrap;
  transition: background 0.3s;
}
.li { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text2); }
.li i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; font-style: normal; }

.contact-hint { margin-left: auto; font-size: 11px; color: var(--text3); font-weight: 500; }

.contact-btn {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #4a9eff, #6b5fff);
  color: #fff; padding: 8px 14px; border-radius: 10px;
  font-size: 13px; font-weight: 700; text-decoration: none;
  box-shadow: 0 2px 8px rgba(74,158,255,0.3); white-space: nowrap; transition: all 0.2s;
}
.contact-btn:hover { transform: translateY(calc(-50% - 2px)); box-shadow: 0 6px 16px rgba(74,158,255,0.5); }
.contact-btn::before {
  content: ''; position: absolute; inset: 0; border-radius: 10px;
  animation: contactPulse 2s infinite; pointer-events: none;
}
@keyframes contactPulse {
  0% { box-shadow: 0 0 0 0 rgba(74,158,255,0.6); }
  70% { box-shadow: 0 0 0 10px rgba(74,158,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(74,158,255,0); }
}

.state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: var(--text2); gap: 6px; padding: 60px;
}
.empty-desc { color: var(--text3); font-size: 13px; }
.spin {
  width: 24px; height: 24px;
  border: 2.5px solid var(--border); border-top-color: #4a9eff;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px; padding: 18px 22px; flex: 1;
  align-content: start; justify-content: center;
}

/* ===== 웰컴 팝업 ===== */
.popup-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.65);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 60px;
  backdrop-filter: blur(6px);
  overflow-y: auto;
}
.popup-box {
  border-radius: 22px; width: 480px; padding: 28px 26px 22px;
  position: relative; display: flex; flex-direction: column;
  background: var(--bg3);
  border: 0.5px solid var(--border);
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  margin-bottom: 40px;
}
.popup-x {
  position: absolute; top: 14px; right: 14px;
  width: 26px; height: 26px; border-radius: 50%; border: none;
  font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: var(--btn-ghost-bg); color: var(--text3);
  font-family: inherit;
}
.popup-pill {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 500;
  padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;
  background: var(--bg4); color: var(--text2);
  border: 0.5px solid var(--border);
}
.popup-ttl {
  font-size: 18px; font-weight: 500; line-height: 1.35;
  margin-bottom: 5px; color: var(--text);
}
.popup-sub {
  font-size: 12px; line-height: 1.5; color: var(--text3);
  padding-bottom: 14px; margin-bottom: 14px;
  border-bottom: 0.5px solid var(--border);
}
.popup-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-bottom: 10px;
}
.popup-feat {
  border-radius: 12px; padding: 12px 11px 10px;
  background: var(--bg4); border: 0.5px solid var(--border);
}
.popup-ico { font-size: 19px; display: block; margin-bottom: 6px; line-height: 1; }
.popup-nm { font-size: 12px; font-weight: 500; margin-bottom: 2px; color: var(--text); }
.popup-ds { font-size: 10px; line-height: 1.5; color: var(--text3); }

/* 크루 매출풍 카드 - 다크: 골드 / 라이트: 파란색 */
.popup-feat-special {
  grid-column: 1 / -1;
}
[data-theme="dark"] .popup-feat-special {
  background: #1c1a10;
  border-color: rgba(255,196,0,0.25);
}
[data-theme="light"] .popup-feat-special {
  background: #1e1a0e;
  border-color: rgba(255,196,0,0.3);
}
.popup-feat-inline { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.popup-feat-inline .popup-ico { font-size: 17px; display: inline; margin-bottom: 0; }
[data-theme="dark"] .popup-feat-special .popup-nm { color: #f5c842; }
[data-theme="light"] .popup-feat-special .popup-nm { color: #fff; }
[data-theme="dark"] .popup-feat-special .popup-ds { color: #7a6c38; }
[data-theme="light"] .popup-feat-special .popup-ds { color: rgba(255,255,255,0.75); }

.popup-auto {
  display: flex; align-items: center; gap: 8px;
  border-radius: 10px; padding: 9px 12px; margin-bottom: 12px;
  font-size: 11px; background: var(--bg4);
  border: 0.5px solid var(--border); color: var(--text3);
}
.popup-dot { width: 6px; height: 6px; border-radius: 50%; background: #1D9E75; flex-shrink: 0; }
.popup-auto strong { color: var(--text); font-weight: 500; }
[data-theme="light"] .popup-auto strong { color: #0d6b52; }

.popup-btn {
  width: 100%; padding: 12px; border-radius: 12px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer;
  font-family: inherit; margin-bottom: 10px;
  background: #a09af5; color: #fff;
  transition: opacity .15s;
}
[data-theme="light"] .popup-btn { background: #534AB7; }
.popup-btn:hover { opacity: .88; }

.popup-sep { height: 0.5px; background: var(--border); margin-bottom: 10px; }
.popup-skip {
  display: flex; align-items: center; justify-content: center;
  gap: 7px; cursor: pointer; user-select: none;
}
.popup-chk {
  width: 15px; height: 15px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: transparent;
  border: 1.5px solid var(--text3); transition: all .15s;
}
.popup-chk.on { background: #7c74e8; border-color: #7c74e8; color: #fff; }
.popup-sk-lbl { font-size: 11px; font-weight: 500; color: var(--text2); }

@media (max-width: 600px) {
  .grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }
  .pc-only { display: none !important; }
  .mode-tabs { gap: 6px; padding: 12px 10px 0; }
  .mode-tab { padding: 7px 14px; font-size: 12px; }
  .contact-btn { position: static; transform: none; padding: 7px 12px; font-size: 12px; }
  .contact-btn:hover { transform: translateY(-2px); }
  .contact-hint { display: none; }
  .popup-box { width: 90vw; padding: 20px 18px 18px; }
  .popup-overlay { padding-top: 20px; }
}
.feat-top { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
.feat-ico { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.feat-nm { font-size: 12px; font-weight: 500; color: var(--text); white-space: nowrap; }
.feat-ds { font-size: 10px; line-height: 1.6; color: var(--text2); word-break: keep-all; }

.balloon .feat-ico { background: rgba(255,77,125,0.15); }
.viewer .feat-ico { background: rgba(74,158,255,0.15); }
.battle .feat-ico { background: rgba(107,95,255,0.15); }
.contact .feat-ico { background: rgba(74,201,158,0.15); }

.full { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: space-between; padding: 11px 14px; gap: 12px; }
.full .feat-top { margin-bottom: 0; flex-shrink: 0; }
.full .feat-ds { text-align: right; font-size: 10px; }

.gold-card { background: rgba(255,196,0,0.07); border-color: rgba(255,196,0,0.2); }
.gold-card .feat-nm { color: #c9960a; }
[data-theme="dark"] .gold-card .feat-nm { color: #f5c842; }
.gold-card .feat-ico { background: rgba(255,196,0,0.12); }

.fan-card { background: rgba(74,158,255,0.07); border-color: rgba(74,158,255,0.2); }
.fan-card .feat-nm { color: #1a6fb5; }
[data-theme="dark"] .fan-card .feat-nm { color: #60b4ff; }
.fan-card .feat-ico { background: rgba(74,158,255,0.12); }
</style>