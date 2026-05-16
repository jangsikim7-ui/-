<template>
  <div class="app">
    <header class="header">
      <div class="hl">
        <div class="logo">⚡ 엑셀크루 시너지표</div>
        <div class="source">출처: poong.today · 4시간마다 자동 갱신</div>
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
          <button class="btn-collect btn-sync" @click="showSync = true" title="낙수표와 동기화">
            🔄 낙수동기화
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

    <div class="group-tabs-wrap">
      <div class="group-tabs">
        <button class="group-tab excel-tab" :class="{ active: activeGroup === 'excel' }" @click="setGroup('excel')">
          <i class="ti ti-users" style="font-size:20px; flex-shrink:0;"></i>
          <div class="tab-info">
            <span class="tab-name">엑셀크루</span>
            <span class="tab-meta">{{ excelCrewCount }}크루 · {{ excelMemberCount }}명</span>
          </div>
        </button>
        <button class="group-tab bora-tab" :class="{ active: activeGroup === 'bora' }" @click="setGroup('bora')">
          <i class="ti ti-crown" style="font-size:20px; flex-shrink:0;"></i>
          <div class="tab-info">
            <span class="tab-name">보라엑셀크루</span>
            <span class="tab-meta">{{ boraCrewCount }}크루 · {{ boraMemberCount }}명</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 모드 탭 -->
    <div class="mode-tabs">
      <button class="mode-tab" :class="{ active: mode === 'balloon' }" @click="setMode('balloon')">
        🎈 별풍선
      </button>
      <button class="mode-tab" :class="{ active: mode === 'viewer' }" @click="setMode('viewer')">
        👁️ 뷰어십
      </button>

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

    <AdminModal v-if="showAdmin" :active-group="activeGroup" @close="showAdmin = false" @updated="loadStats" @battle-toggle="onBattleToggle" />
    <CrewBattleModal v-if="showBattle" :crews="stats" :mode="mode" @close="showBattle = false" />
    <SyncModal v-if="showSync" @close="showSync = false" @done="loadStats" />
    <WelcomePopup ref="welcomePopupRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CrewCard from './components/CrewCard.vue'
import AdminModal from './components/AdminModal.vue'
import CrewBattleModal from './components/CrewBattleModal.vue'
import SyncModal from './components/SyncModal.vue'
import WelcomePopup from './components/WelcomePopup.vue'
import { api, getAdminToken, setAdminToken, clearAdminToken } from './composables/useApi.js'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const stats = ref([])
const loading = ref(false)
const error = ref('')
const showAdmin = ref(false)
const showBattle = ref(false)
const showSync = ref(false)
const mode = ref('balloon')
const isAdmin = ref(false)
const showLoginModal = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const collecting = ref(false)
const updatingProfiles = ref(false)

// 웰컴 팝업
const welcomePopupRef = ref(null)

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
    for (const member of crew.members)
      if (member.balloons > max) max = member.balloons
  return max
})

const activeGroup = ref('excel')
const excelStats = ref([])
const boraStats = ref([])

const excelCrewCount = computed(() => excelStats.value.length)
const excelMemberCount = computed(() => excelStats.value.reduce((s, c) => s + c.members.length, 0))
const boraCrewCount = computed(() => boraStats.value.length)
const boraMemberCount = computed(() => boraStats.value.reduce((s, c) => s + c.members.length, 0))

function setGroup(g) { activeGroup.value = g; loadStats() }

// 🔥 최적화: 메인 그룹만 호출, 다른 그룹은 처음 한 번만
async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    // 1) 메인 데이터 호출 (현재 보고 있는 그룹 + 모드)
    const mainData = await (mode.value === 'viewer'
      ? api.getViewerStats(year.value, month.value, activeGroup.value)
      : api.getStats(year.value, month.value, activeGroup.value))
    stats.value = mainData.crews

    // 2) 메인 데이터는 별풍선 모드면 그대로 캐시용으로 저장
    if (mode.value === 'balloon') {
      if (activeGroup.value === 'excel') {
        excelStats.value = mainData.crews
      } else {
        boraStats.value = mainData.crews
      }
    }

    // 3) 다른 그룹 데이터는 처음 한 번만 받음 (탭 카운트 표시용)
    if (activeGroup.value === 'excel' && boraStats.value.length === 0) {
      try {
        const boraData = await api.getStats(year.value, month.value, 'bora')
        boraStats.value = boraData.crews
      } catch(e) { /* 무시 */ }
    } else if (activeGroup.value === 'bora' && excelStats.value.length === 0) {
      try {
        const excelData = await api.getStats(year.value, month.value, 'excel')
        excelStats.value = excelData.crews
      } catch(e) { /* 무시 */ }
    }

    // 4) lastCollected는 자주 안 받아도 됨 (페이지 첫 로드시만)
    if (!lastCollected.value) {
      try {
        const lc = await api.lastCollected()
        lastCollected.value = lc.last_collected
      } catch(e) { /* 무시 */ }
    }
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
  // 월 바뀌면 캐시 비우기 (다른 월 데이터 필요)
  excelStats.value = []
  boraStats.value = []
  loadStats()
}

function nextMonth() {
  if (!canGoNext.value) return
  if (month.value === 12) { month.value = 1; year.value++ }
  else month.value++
  // 월 바뀌면 캐시 비우기 (다른 월 데이터 필요)
  excelStats.value = []
  boraStats.value = []
  loadStats()
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

// 🔥 자동 새로고침 + 페이지 가시성 체크 (탭이 백그라운드면 안 함)
let autoRefreshTimer = null

function startAutoRefresh() {
  // 4시간마다 자동 새로고침 (1시간 → 4시간)
  autoRefreshTimer = setInterval(() => {
    // 페이지가 보이고 있을 때만 새로고침 (백그라운드 탭이면 스킵)
    if (!document.hidden) {
      loadStats()
    }
  }, 4 * 60 * 60 * 1000)
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

onMounted(async () => {
  const saved = localStorage.getItem('theme') || 'dark'
  isDark.value = saved === 'dark'
  document.documentElement.setAttribute('data-theme', saved)

  if (getAdminToken()) isAdmin.value = true

  welcomePopupRef.value?.open()

  loadStats()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
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

.mode-tabs {
  position: relative; display: flex; gap: 8px;
  padding: 12px 20px 0; justify-content: center; background: var(--bg2);
}
.mode-tab {
  padding: 8px 28px; border-radius: 999px; border: 1.5px solid var(--border);
  background: var(--bg3); color: var(--text2); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.18s; letter-spacing: -0.2px;
}
.mode-tab:hover { border-color: var(--text3); color: var(--text); }
.mode-tab.active { background: var(--text); color: var(--bg); border-color: var(--text); box-shadow: 0 4px 14px rgba(0,0,0,0.25); }

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
  border-bottom: 1px solid var(--border); flex-wrap: wrap; transition: background 0.3s;
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

/* ── 크루 그룹 탭 ─────────────────────────── */
.group-tabs-wrap {
  display: flex; justify-content: center;
  padding: 14px 20px 0; background: var(--bg2);
}
.group-tabs {
  display: flex; gap: 8px;
  width: 100%; max-width: 480px;
}
.group-tab {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--bg3);
  cursor: pointer; text-align: left; font-family: inherit;
  position: relative; overflow: hidden;
  transition: all 0.2s;
}
.tab-info { display: flex; flex-direction: column; gap: 3px; }
.tab-name { font-size: 14px; font-weight: 700; line-height: 1; }
.tab-meta { font-size: 11px; font-weight: 500; }

[data-theme="dark"] .group-tab { background: #16162a; border-color: #32325a; }
[data-theme="dark"] .group-tab .tab-name { color: #8888bb; }
[data-theme="dark"] .group-tab .tab-meta { color: #55557a; }
[data-theme="dark"] .group-tab i { color: #55557a; }

[data-theme="dark"] .group-tab.active.excel-tab { background: #0d2040; border-color: #4a9eff; }
[data-theme="dark"] .group-tab.active.excel-tab .tab-name { color: #90c8ff; }
[data-theme="dark"] .group-tab.active.excel-tab .tab-meta { color: #5590dd; }
[data-theme="dark"] .group-tab.active.excel-tab i { color: #60aaff; }
[data-theme="dark"] .group-tab.active.excel-tab::after {
  content: ''; position: absolute; bottom: 0; left: 12px; right: 12px;
  height: 3px; background: #4a9eff; border-radius: 2px;
}

[data-theme="dark"] .group-tab.active.bora-tab { background: #220a38; border-color: #cc66ff; }
[data-theme="dark"] .group-tab.active.bora-tab .tab-name { color: #ee99ff; }
[data-theme="dark"] .group-tab.active.bora-tab .tab-meta { color: #9944cc; }
[data-theme="dark"] .group-tab.active.bora-tab i { color: #cc66ff; }
[data-theme="dark"] .group-tab.active.bora-tab::after {
  content: ''; position: absolute; bottom: 0; left: 12px; right: 12px;
  height: 3px; background: #cc66ff; border-radius: 2px;
}

[data-theme="light"] .group-tab { background: #eaeaf4; border-color: #c0c0d8; }
[data-theme="light"] .group-tab .tab-name { color: #7070a0; }
[data-theme="light"] .group-tab .tab-meta { color: #9090b8; }
[data-theme="light"] .group-tab i { color: #9090b8; }

[data-theme="light"] .group-tab.active.excel-tab { background: #ddeeff; border-color: #1a60dd; }
[data-theme="light"] .group-tab.active.excel-tab .tab-name { color: #0a3a99; }
[data-theme="light"] .group-tab.active.excel-tab .tab-meta { color: #2255bb; }
[data-theme="light"] .group-tab.active.excel-tab i { color: #1a60dd; }
[data-theme="light"] .group-tab.active.excel-tab::after {
  content: ''; position: absolute; bottom: 0; left: 12px; right: 12px;
  height: 3px; background: #1a60dd; border-radius: 2px;
}

[data-theme="light"] .group-tab.active.bora-tab { background: #f0deff; border-color: #8822cc; }
[data-theme="light"] .group-tab.active.bora-tab .tab-name { color: #5a0099; }
[data-theme="light"] .group-tab.active.bora-tab .tab-meta { color: #7722aa; }
[data-theme="light"] .group-tab.active.bora-tab i { color: #8822cc; }
[data-theme="light"] .group-tab.active.bora-tab::after {
  content: ''; position: absolute; bottom: 0; left: 12px; right: 12px;
  height: 3px; background: #8822cc; border-radius: 2px;
}

.pip { display: none; }

@media (max-width: 600px) {
  .grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }
  .pc-only { display: none !important; }
  .mode-tabs { gap: 6px; padding: 12px 10px 0; }
  .mode-tab { padding: 7px 14px; font-size: 12px; }
  .contact-btn { position: static; transform: none; padding: 7px 12px; font-size: 12px; }
  .contact-btn:hover { transform: translateY(-2px); }
  .contact-hint { display: none; }
  .group-tabs-wrap { padding: 10px 10px 0; }
  .group-tab { font-size: 13px; padding: 10px 12px; gap: 8px; }
  .tab-name { font-size: 13px; }
}
</style>