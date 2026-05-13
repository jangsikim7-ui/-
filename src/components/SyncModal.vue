<template>
  <div class="sync-overlay" @click.self="$emit('close')">
    <div class="sync-modal">
      <div class="sync-header">
        <span>🔄 낙수 동기화</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- 로딩 -->
      <div v-if="loading" class="sync-state">
        <div class="spin"></div>
        <span>yxlinfo에서 변경사항 확인 중...</span>
      </div>

      <!-- 변경사항 없음 -->
      <div v-else-if="diff && diff.total === 0" class="sync-state">
        ✅ 변경사항 없음 — yxlinfo랑 동일해요!
      </div>

      <!-- 변경사항 있음 -->
      <div v-else-if="diff" class="sync-body">

<!-- 삭제 -->
        <div v-if="diff.removed.length > 0" class="section">
          <div class="section-title">➖ 삭제 {{ diff.removed.length }}명</div>
          <div v-for="(m, idx) in diff.removed" :key="m.soop_id" class="member-row">
            <img :src="avatarUrl(m.soop_id)" class="avatar" @error="onImgError" />
            <div class="member-info">
              <span class="mname">{{ m.name }}</span>
              <span class="crew-tag remove">{{ m.crew_name }}</span>
            </div>
            <button class="x-btn" @click="diff.removed.splice(idx, 1)" title="이 항목 제외">✕</button>
          </div>
        </div>
        <!-- 이동 -->
        <div v-if="diff.moved.length > 0" class="section">
          <div class="section-title">🔀 이동 {{ diff.moved.length }}명</div>
          <div v-for="m in diff.moved" :key="m.soop_id" class="member-row">
            <img :src="avatarUrl(m.soop_id)" class="avatar" @error="onImgError" />
            <div class="member-info">
              <span class="mname">{{ m.name }}</span>
              <span class="crew-tag move">{{ m.from_crew }} → {{ m.to_crew }}</span>
            </div>
          </div>
        </div>

<!-- 신규 -->
        <div v-if="diff.added.length > 0" class="section">
          <div class="section-title">➕ 신규 {{ diff.added.length }}명</div>
          <div v-for="(m, idx) in diff.added" :key="m.name" class="added-block">
            <div class="added-top">
              <span class="mname">{{ m.name }}</span>
              <span class="crew-tag add">{{ m.crew_name }}</span>
              <button class="x-btn" @click="diff.added.splice(idx, 1)" title="이 항목 제외">✕</button>
            </div>

            <!-- 검색 중 -->
            <div v-if="searchMap[m.name] === undefined" class="searching">
              <div class="spin-sm"></div> 검색중...
            </div>

            <!-- 자동 매칭 (1개) -->
            <div v-else-if="searchMap[m.name].length === 1" class="auto-match">
              <img :src="searchMap[m.name][0].profile_img" class="avatar lg" @error="onImgError" />
              <div>
                <div class="rname">{{ searchMap[m.name][0].name }}</div>
                <div class="auto-badge">✅ 자동매칭</div>
              </div>
            </div>

            <!-- 여러개 → 프사 보고 선택 -->
            <div v-else-if="searchMap[m.name].length > 1">
              <div class="pick-label">프사 보고 선택해주세요</div>
              <div class="multi-results">
                <div
                  v-for="r in searchMap[m.name]"
                  :key="r.soop_id"
                  class="result-card"
                  :class="{ selected: selectedMap[m.name] === r.soop_id }"
                  @click="selectedMap[m.name] = r.soop_id"
                >
                  <img :src="r.profile_img" class="avatar lg" @error="onImgError" />
                  <div class="rname">{{ r.name }}</div>
                </div>
              </div>
            </div>

            <!-- 검색 결과 없음 -->
            <div v-else class="no-result">
              <span>검색 결과 없음</span>
              <input
                v-model="manualMap[m.name]"
                placeholder="soop ID 직접 입력"
                class="manual-input"
              />
            </div>
          </div>
        </div>

        <button class="apply-btn" @click="apply" :disabled="applying">
          {{ applying ? '적용중...' : '✅ 전체 적용' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api, getAdminToken } from '../composables/useApi.js'

const emit = defineEmits(['close', 'done'])

const loading = ref(true)
const applying = ref(false)
const diff = ref(null)
const searchMap = reactive({})
const selectedMap = reactive({})
const manualMap = reactive({})

function avatarUrl(soopId) {
  if (!soopId) return ''
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

function onImgError(e) {
  e.target.style.opacity = '0.15'
}

async function searchByName(name) {
  try {
    const BASE_URL = import.meta.env.VITE_API_URL || '/api'
    const res = await fetch(`${BASE_URL}/search-by-name?name=${encodeURIComponent(name)}`, {
      headers: { 'x-admin-token': getAdminToken() }
    })
    const data = await res.json()
    return data.results || []
  } catch { return [] }
}

function getResolvedSoopId(name) {
  if (manualMap[name]) return manualMap[name].trim()
  const results = searchMap[name] || []
  if (results.length === 1) return results[0].soop_id
  if (results.length > 1 && selectedMap[name]) return selectedMap[name]
  return null
}

async function apply() {
  applying.value = true
  try {
    const resolvedAdded = diff.value.added
      .map(m => {
        const soop_id = getResolvedSoopId(m.name)
        return soop_id ? { ...m, soop_id } : null
      })
      .filter(Boolean)

    await api.syncApply({
      added: resolvedAdded,
      removed: diff.value.removed,
      moved: diff.value.moved
    })

    const skipped = diff.value.added.length - resolvedAdded.length
    alert(
      `동기화 완료!\n` +
      `추가 ${resolvedAdded.length}명 / 삭제 ${diff.value.removed.length}명 / 이동 ${diff.value.moved.length}명` +
      (skipped > 0 ? `\n⚠️ soop ID 미확인 ${skipped}명은 스킵됨 (관리자에서 직접 추가 필요)` : '')
    )
    emit('done')
    emit('close')
  } catch(e) {
    alert('적용 실패: ' + e.message)
  }
  applying.value = false
}

onMounted(async () => {
  try {
    const data = await api.syncDiff()
    diff.value = data
    loading.value = false

    // 신규 멤버 검색 (순차적으로)
    for (const m of data.added) {
      searchMap[m.name] = undefined
      const results = await searchByName(m.name)
      searchMap[m.name] = results
    }
  } catch(e) {
    loading.value = false
    alert('불러오기 실패: ' + e.message)
  }
})
</script>

<style scoped>
.sync-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 16px; overflow-y: auto;
}
.sync-modal {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 18px; width: 100%; max-width: 500px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6); margin-bottom: 40px;
}
.sync-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 18px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 800; color: var(--text);
}
.close-btn {
  background: none; border: none; color: var(--text3);
  font-size: 14px; cursor: pointer; padding: 4px 8px; font-family: inherit;
}
.sync-state {
  padding: 50px; text-align: center; color: var(--text2);
  font-size: 13px; display: flex; flex-direction: column;
  align-items: center; gap: 10px;
}
.sync-body { padding: 14px; display: flex; flex-direction: column; gap: 16px; }

.section { display: flex; flex-direction: column; gap: 6px; }
.section-title {
  font-size: 11px; font-weight: 800; color: var(--text3);
  letter-spacing: 0.5px; padding: 4px 0;
  border-bottom: 1px solid var(--border); margin-bottom: 2px;
}

.member-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg4); border-radius: 10px; padding: 8px 10px;
}
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: var(--bg2); flex-shrink: 0; }
.avatar.lg { width: 46px; height: 46px; }
.member-info { display: flex; flex-direction: column; gap: 3px; }
.mname { font-size: 13px; font-weight: 700; color: var(--text); }
.crew-tag {
  font-size: 10px; font-weight: 700; padding: 2px 8px;
  border-radius: 99px; display: inline-block; width: fit-content;
}
.crew-tag.remove { background: rgba(255,77,77,0.15); color: #ff6b6b; }
.crew-tag.move { background: rgba(74,158,255,0.15); color: #4a9eff; }
.crew-tag.add { background: rgba(107,203,119,0.15); color: #6bcb77; }
.crew-tag.add { background: rgba(107,203,119,0.15); color: #6bcb77; }

.x-btn {
  background: none; border: none; color: var(--text3);
  font-size: 14px; cursor: pointer; padding: 4px 8px;
  margin-left: auto; font-family: inherit;
  border-radius: 6px; transition: all 0.15s;
}
.x-btn:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }

.member-row { position: relative; }
.added-top { position: relative; }

.added-block {
  background: var(--bg4); border-radius: 10px; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.added-top { display: flex; align-items: center; gap: 8px; }

.searching {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text3);
}
.spin-sm {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: #4a9eff;
  animation: spin 0.8s linear infinite; flex-shrink: 0;
}

.auto-match {
  display: flex; align-items: center; gap: 10px;
  background: rgba(107,203,119,0.08); border-radius: 8px; padding: 8px 10px;
  border: 1px solid rgba(107,203,119,0.2);
}
.auto-badge { font-size: 10px; color: #6bcb77; font-weight: 700; margin-top: 2px; }
.rname { font-size: 12px; font-weight: 600; color: var(--text); }

.pick-label { font-size: 10px; color: var(--text3); margin-bottom: 6px; }
.multi-results { display: flex; gap: 8px; flex-wrap: wrap; }
.result-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px; border-radius: 10px; cursor: pointer;
  border: 2px solid transparent; background: var(--bg3); transition: all 0.15s;
  min-width: 70px;
}
.result-card:hover { border-color: var(--text3); }
.result-card.selected { border-color: #6bcb77; background: rgba(107,203,119,0.1); }
.result-card .rname { font-size: 10px; color: var(--text2); text-align: center; word-break: break-all; max-width: 70px; }

.no-result {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--text3);
}
.manual-input {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 6px; padding: 5px 8px; color: var(--text);
  font-size: 11px; outline: none; flex: 1; font-family: inherit;
}
.manual-input:focus { border-color: var(--text3); }

.apply-btn {
  width: 100%; padding: 13px; border-radius: 12px; border: none;
  background: #6bcb77; color: #000; font-size: 14px; font-weight: 800;
  cursor: pointer; transition: opacity 0.15s; font-family: inherit;
}
.apply-btn:hover:not(:disabled) { opacity: 0.85; }
.apply-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.spin {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2.5px solid var(--border); border-top-color: #4a9eff;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .sync-overlay { padding: 16px 10px; }
}
</style>