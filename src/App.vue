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

      <button v-if="isAdmin" class="capture-btn-tab" @click="captureScreen" :disabled="capturing">
        {{ capturing ? '⏳ 캡처중...' : '📷 전체화면캡처' }}
      </button>
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

    <!-- 캡처 토스트 -->
    <div v-if="captureToast" class="capture-toast" :class="captureToastType">{{ captureToast }}</div>

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

    <div ref="captureTarget">
      <main v-if="!loading && stats.length > 0" class="grid">
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

      <!-- ── 하단 요약 섹션 ── -->
      <section v-if="!loading && mode === 'balloon' && summary" class="summary-section">
        <div class="summary-header">
          <span class="summary-icon">🏆</span>
          <span class="summary-title">{{ year }}년 {{ String(month).padStart(2,'0') }}월 순위 요약</span>
          <span class="summary-group-badge" :class="activeGroup === 'bora' ? 'bora' : 'excel'">
            {{ activeGroup === 'bora' ? '보라엑셀' : '엑셀크루' }}
          </span>
        </div>

        <div class="summary-grid">
          <!-- 평균 풍선 크루 순위 -->
          <div class="summary-card">
            <div class="summary-card-label">
              <span class="label-icon">📊</span> 평균 풍선 크루 순위
            </div>
            <div class="rank-list">
              <div v-for="c in summary.avgRanking" :key="c.id" class="rank-row">
                <span class="rk-num" :class="['rk-'+c.rank]">{{ c.rank }}</span>
                <span class="rk-dot" :style="{background: c.color}"></span>
                <span class="rk-name">{{ c.name }}</span>
                <span class="rk-val">{{ c.avg.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- 크루 총매출 순위 -->
          <div class="summary-card">
            <div class="summary-card-label">
              <span class="label-icon">💰</span> 크루 총매출 순위
            </div>
            <div class="rank-list">
              <div v-for="c in summary.totalRanking" :key="c.id" class="rank-row">
                <span class="rk-num" :class="['rk-'+c.rank]">{{ c.rank }}</span>
                <span class="rk-dot" :style="{background: c.color}"></span>
                <span class="rk-name">{{ c.name }}</span>
                <span class="rk-val">{{ c.total.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 개인 TOP 10 -->
        <div class="summary-card top10-card">
          <div class="summary-card-label">
            <span class="label-icon">👑</span> 개인 TOP 10
          </div>
          <div class="top10-list">
            <div v-for="m in summary.top10" :key="m.id" class="top10-row">
              <span class="rk-num" :class="['rk-'+m.rank]">{{ m.rank }}</span>
              <img :src="m.profile_img" class="top10-thumb" @error="e=>e.target.style.display='none'" />
              <span
                class="top10-crew-tag"
                :style="{background: m.crew_color + '28', color: m.crew_color, borderColor: m.crew_color + '55'}"
              >{{ m.crew_name }}</span>
              <span class="top10-name">
                {{ m.name }}
                <span v-if="m.is_new" class="new-chip">NEW</span>
              </span>
              <span class="top10-val">{{ m.balloons.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

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

import html2canvas from 'html2canvas'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CrewCard from './components/CrewCard.vue'
import AdminModal from './components/AdminModal.vue'
import CrewBattleModal from './components/CrewBattleModal.vue'
import SyncModal from './components/SyncModal.vue'
import WelcomePopup from './components/WelcomePopup.vue'
import { api, getAdminToken, setAdminToken, clearAdminToken } from './composables/useApi.js'

const BASE = import.meta.env.VITE_API_URL || '/api'

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
const summary = ref(null)

const capturing = ref(false)
const captureToast = ref('')
const captureToastType = ref('success')
const captureTarget = ref(null)

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

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    const mainData = await (mode.value === 'viewer'
      ? api.getViewerStats(year.value, month.value, activeGroup.value)
      : api.getStats(year.value, month.value, activeGroup.value))
    stats.value = mainData.crews

    if (mode.value === 'balloon') {
      if (activeGroup.value === 'excel') {
        excelStats.value = mainData.crews
      } else {
        boraStats.value = mainData.crews
      }
    }

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

    if (!lastCollected.value) {
      try {
        const lc = await api.lastCollected()
        lastCollected.value = lc.last_collected
      } catch(e) { /* 무시 */ }
    }

    // 요약 데이터 로드 (별풍선 모드일 때만)
    if (mode.value === 'balloon') {
      try {
        summary.value = await api.getSummary(year.value, month.value, activeGroup.value)
      } catch(e) { summary.value = null }
    } else {
      summary.value = null
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
  excelStats.value = []
  boraStats.value = []
  loadStats()
}

function nextMonth() {
  if (!canGoNext.value) return
  if (month.value === 12) { month.value = 1; year.value++ }
  else month.value++
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

function showToast(msg, type = 'success') {
  captureToast.value = msg
  captureToastType.value = type
  setTimeout(() => { captureToast.value = '' }, 3000)
}

async function captureScreen() {
  if (capturing.value) return
  capturing.value = true
  try {
    const target = captureTarget.value || document.querySelector('.app')
    const bgColor = isDark.value ? '#0d1117' : '#f8fafc'
    const imgs = target.querySelectorAll('img')
    const origSrcs = []
    imgs.forEach((img, i) => {
      origSrcs[i] = img.src
      if (img.src && !img.src.startsWith('data:')) {
        img.src = `${BASE}/proxy-img?url=${encodeURIComponent(img.src)}`
      }
    })
    await Promise.race([
      Promise.all([...imgs].map(img =>
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })
      )),
      new Promise(r => setTimeout(r, 2000))
    ])
    const canvas = await html2canvas(target, {
      backgroundColor: bgColor, useCORS: true, allowTaint: false,
      scrollX: -window.scrollX, scrollY: -window.scrollY, scale: 2,
      width: target.scrollWidth, height: target.scrollHeight,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (doc) => {
        doc.querySelectorAll('*').forEach(el => {
          const s = el.style
          if (s.overflow === 'hidden') s.overflow = 'visible'
          s.whiteSpace = 'nowrap'
        })
      }
    })
    imgs.forEach((img, i) => { img.src = origSrcs[i] })
    const dataUrl = canvas.toDataURL('image/png')
    const d = new Date()
    const filename = `synergy-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}.png`
    const a = document.createElement('a')
    a.href = dataUrl; a.download = filename; a.click()
    try {
      const r = await fetch(dataUrl)
      const blob = await r.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      showToast('📋 클립보드 복사 + 파일 저장됐어요!')
    } catch {
      showToast('💾 파일로 저장됐어요! (' + filename + ')', 'warn')
    }
  } catch(e) {
    showToast('❌ 캡처 실패: ' + (e?.message || ''), 'error')
  }
  capturing.value = false
}

let autoRefreshTimer = null

function startAutoRefresh() {
  autoRefreshTimer = setInterval(() => {
    if (!document.hidden) loadStats()
  }, 4 * 60 * 60 * 1000)
}

function stopAutoRefresh() {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null }
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

/* ── 크루 그룹 탭 ── */
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

.capture-btn-tab {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #4cd964, #2ecc71);
  color: #fff; padding: 8px 14px; border-radius: 10px;
  font-size: 13px; font-weight: 700; border: none; cursor: pointer;
  box-shadow: 0 2px 8px rgba(76,217,100,0.3);
  white-space: nowrap; transition: all 0.2s; font-family: inherit;
}
.capture-btn-tab:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(76,217,100,0.5); }
.capture-btn-tab:disabled { opacity: 0.5; cursor: not-allowed; }

.capture-toast {
  position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 700;
  z-index: 9999; pointer-events: none;
  animation: toastIn 0.2s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.capture-toast.success { background: #1e3a1e; color: #4cd964; border: 1px solid #4cd96440; }
.capture-toast.warn { background: #3a2e1e; color: #f5a623; border: 1px solid #f5a62340; }
.capture-toast.error { background: #3a1e1e; color: #ff6b6b; border: 1px solid #ff6b6b40; }
[data-theme="light"] .capture-toast.success { background: #e8f5e9; color: #1e7e34; border: 1px solid #1e7e3440; }
[data-theme="light"] .capture-toast.warn { background: #fff8e1; color: #c8860f; border: 1px solid #c8860f40; }
[data-theme="light"] .capture-toast.error { background: #fdecea; color: #c62828; border: 1px solid #c6282840; }

/* ── 하단 요약 섹션 ── */
.summary-section {
  margin: 0 22px 32px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
}

[data-theme="dark"] .summary-section { background: #10101e; border-color: #2a2a4a; }
[data-theme="light"] .summary-section { background: #f4f5fb; border-color: #d0d2e8; }

.summary-header {
  display: flex; align-items: center; gap: 10px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--border);
}

[data-theme="dark"] .summary-header { border-color: #2a2a4a; }
[data-theme="light"] .summary-header { border-color: #d0d2e8; }

.summary-icon { font-size: 20px; }
.summary-title {
  font-size: 15px; font-weight: 800; color: var(--text); flex: 1;
}

.summary-group-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
}
.summary-group-badge.excel {
  background: rgba(74,158,255,0.15); color: #4a9eff; border: 1px solid rgba(74,158,255,0.3);
}
.summary-group-badge.bora {
  background: rgba(180,80,255,0.15); color: #cc66ff; border: 1px solid rgba(180,80,255,0.3);
}

.summary-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
}

.summary-card {
  padding: 18px 20px;
}
.summary-grid .summary-card:first-child {
  border-right: 1px solid var(--border);
}
[data-theme="dark"] .summary-grid .summary-card:first-child { border-color: #2a2a4a; }
[data-theme="light"] .summary-grid .summary-card:first-child { border-color: #d0d2e8; }

.top10-card {
  border-top: 1px solid var(--border);
  padding: 18px 20px;
}
[data-theme="dark"] .top10-card { border-color: #2a2a4a; }
[data-theme="light"] .top10-card { border-color: #d0d2e8; }

.summary-card-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text3); margin-bottom: 12px; display: flex; align-items: center; gap: 5px;
}
.label-icon { font-size: 13px; }

/* 순위 공통 */
.rank-list { display: flex; flex-direction: column; gap: 4px; }
.rank-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 10px; transition: background 0.15s;
}
[data-theme="dark"] .rank-row:hover { background: #1e1e36; }
[data-theme="light"] .rank-row:hover { background: #e8eaf8; }

.rk-num {
  font-size: 14px; font-weight: 800; min-width: 20px; text-align: center;
  color: var(--text3);
}
.rk-1 { color: #f5c842; }
.rk-2 { color: #aaaaaa; }
.rk-3 { color: #cc8844; }

.rk-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.rk-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--text); }
.rk-val { font-size: 13px; font-weight: 700; color: var(--text2); font-variant-numeric: tabular-nums; }

/* TOP 10 */
.top10-list {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
}
.top10-row {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 12px; border-radius: 10px; transition: background 0.15s;
}
[data-theme="dark"] .top10-row:hover { background: #1e1e36; }
[data-theme="light"] .top10-row:hover { background: #e8eaf8; }

.top10-thumb {
  width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
  border: 1.5px solid var(--border);
}
.top10-crew-tag {
  font-size: 10px; font-weight: 700; padding: 2px 7px;
  border-radius: 999px; border: 1px solid; white-space: nowrap; flex-shrink: 0;
}
.top10-name {
  flex: 1; font-size: 13px; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: center; gap: 5px;
}
.top10-val {
  font-size: 12px; font-weight: 700; color: var(--text2);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}

.new-chip {
  font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 999px;
  background: rgba(255,75,143,0.18); color: #ff4b8f;
  border: 1px solid rgba(255,75,143,0.35); letter-spacing: 0.05em; flex-shrink: 0;
}

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
  .capture-btn-tab { padding: 7px 10px; font-size: 12px; }
  .summary-section { margin: 0 10px 20px; border-radius: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .summary-grid .summary-card:first-child { border-right: none; border-bottom: 1px solid var(--border); }
  .top10-list { grid-template-columns: 1fr; }
  .top10-crew-tag { display: none; }
}
</style>
