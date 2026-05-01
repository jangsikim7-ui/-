<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>⚙️ 크루 / 멤버 관리</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button :class="['tab', tab==='crews'&&'active']" @click="tab='crews'">크루 관리</button>
          <button :class="['tab', tab==='members'&&'active']" @click="tab='members'">멤버 관리</button>
          <button :class="['tab', tab==='backup'&&'active']" @click="tab='backup';loadBackups()">💾 백업</button>
        </div>

        <!-- ── 크루 관리 ── -->
        <div v-if="tab==='crews'">
          <div class="section-title">새 크루 추가</div>
          <div class="form-row">
            <input v-model="newCrew.name" placeholder="크루명 (예: 씨나인)" />
            <div class="color-wrap">
              <input type="color" v-model="newCrew.color" class="color-input" />
              <span class="color-label">색상</span>
            </div>
            <input v-model.number="newCrew.sort_order" type="number" placeholder="순서" style="width:70px" />
          </div>
          <div class="form-row" style="margin-top:6px">
            <input v-model="newCrew.logo_url" placeholder="로고 이미지 URL (선택)" />
          </div>
          <div class="logo-row">
            <label class="upload-btn">
              📁 파일 업로드
              <input type="file" accept="image/*" @change="handleLogoFile" style="display:none" />
            </label>
            <div v-if="newCrew.logo_url" class="logo-preview-wrap">
              <img :src="newCrew.logo_url" class="logo-preview" />
              <button class="btn-x" @click="newCrew.logo_url=''">✕</button>
            </div>
            <button class="btn-add" @click="addCrew" :disabled="adding">
              {{ adding ? '추가중...' : '+ 크루 추가' }}
            </button>
          </div>

          <div class="section-title" style="margin-top:22px">크루 목록 ({{ crews.length }}개)</div>
          <div class="item-list">
            <div v-for="crew in crews" :key="crew.id" class="item-row crew-item">
              <template v-if="editingCrew?.id === crew.id">
                <div class="edit-block">
                  <div class="form-row">
                    <input v-model="editingCrew.name" placeholder="크루명" />
                    <div class="color-wrap">
                      <input type="color" v-model="editingCrew.color" class="color-input" />
                    </div>
                    <input v-model.number="editingCrew.sort_order" type="number" placeholder="순서" style="width:60px" />
                  </div>
                  <div class="form-row" style="margin-top:6px">
                    <input v-model="editingCrew.logo_url" placeholder="로고 URL" />
                    <label class="upload-btn-sm">📁<input type="file" accept="image/*" @change="handleEditLogoFile" style="display:none" /></label>
                  </div>
                  <div class="edit-btns">
                    <button class="btn-save" @click="saveCrew">✓ 저장</button>
                    <button class="btn-cancel" @click="editingCrew=null">취소</button>
                  </div>
                </div>
              </template>
              <template v-else>
                <img v-if="crew.logo_url" :src="crew.logo_url" class="item-logo" />
                <div v-else class="item-logo-placeholder" :style="{background: crew.color+'33', color: crew.color}">{{ crew.name.charAt(0) }}</div>
                <div class="color-dot" :style="{background: crew.color}" />
                <span class="item-name">{{ crew.name }}</span>
                <span class="item-sub">순서 {{ crew.sort_order }}</span>
                <button class="btn-edit" @click="startEdit(crew)">수정</button>
                <button class="btn-del" @click="removeCrew(crew)">삭제</button>
              </template>
            </div>
            <div v-if="crews.length===0" class="empty">크루가 없습니다</div>
          </div>
        </div>

        <!-- ── 멤버 관리 ── -->
        <div v-if="tab==='members'">
          <div class="section-title">개별 멤버 추가</div>
          <div class="form-row">
            <select v-model.number="newMember.crew_id">
              <option value="">크루 선택</option>
              <option v-for="c in crews" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-row" style="margin-top:6px">
            <div class="soop-id-wrap">
              <input
                v-model="newMember.soop_id"
                placeholder="SOOP ID (예: epsthddus)"
                @blur="lookupNickname"
                @keyup.enter="lookupNickname"
              />
              <span v-if="nickLooking" class="nick-status loading">조회중...</span>
              <span v-else-if="newMember.name && newMember.name !== newMember.soop_id" class="nick-status found">✓ {{ newMember.name }}</span>
              <span v-else-if="nickFailed" class="nick-status failed">직접 입력 필요</span>
            </div>
          </div>
          <div class="form-row" style="margin-top:6px">
            <input v-model="newMember.name" placeholder="닉네임 (자동조회 또는 직접 입력)" />
            <label class="new-badge-label">
              <input type="checkbox" v-model="newMember.is_new" />
              <span>신입</span>
            </label>
            <button class="btn-add" @click="addMember" :disabled="adding">
              {{ adding ? '수집중...' : '+ 추가' }}
            </button>
          </div>

          <!-- 낙수 임포트 -->
          <div class="naksoo-import-box">
            <div class="naksoo-title">
              <span>⚡ naksoo.vercel.app 전체 임포트</span>
              <span class="naksoo-badge">크루 7개 · 멤버 84명</span>
            </div>
            <div class="naksoo-desc">크루와 멤버를 한번에 가져옵니다. 이미 있는 크루/멤버는 건너뜁니다.</div>
            <button class="btn-naksoo" @click="doImportNaksoo" :disabled="importing">
              {{ importing ? `임포트 중... (닉네임 수집중)` : '🚀 전체 임포트 시작' }}
            </button>
            <div class="naksoo-result" v-if="importResult">
              ✅ 크루 +{{ importResult.crews_added }} · 멤버 +{{ importResult.members_added }}
              <span v-if="importResult.members_skipped > 0">({{ importResult.members_skipped }}명 중복 건너뜀)</span>
            </div>
          </div>

          <!-- 낙수 동기화 -->
          <div class="sync-box">
            <div class="sync-header">
              <div>
                <div class="sync-title">🔄 낙수표 동기화</div>
                <div class="sync-desc">naksoo.vercel.app과 비교해서 추가/삭제/이동 확인</div>
              </div>
              <button class="btn-sync-check" @click="checkSync" :disabled="syncing">
                {{ syncing ? '확인중...' : '변경사항 확인' }}
              </button>
            </div>

            <!-- diff 결과 -->
            <div v-if="syncDiff" class="sync-diff">
              <div v-if="syncDiff.total === 0" class="sync-none">✅ 변경사항 없음 — 낙수표와 동일해요</div>
              <template v-else>
                <!-- 추가 -->
                <div v-if="syncDiff.added.length > 0" class="diff-section">
                  <div class="diff-label add">➕ 추가 {{ syncDiff.added.length }}명</div>
                  <div v-for="m in syncDiff.added" :key="m.soop_id" class="diff-row">
                    <input type="checkbox" v-model="syncSelected.added" :value="m.soop_id" />
                    <img :src="m.profile_img" class="diff-thumb" @error="e=>e.target.style.display='none'" />
                    <span class="diff-crew">{{ m.crew_name }}</span>
                    <span class="diff-name">{{ m.name }}</span>
                    <span class="diff-id">{{ m.soop_id }}</span>
                  </div>
                </div>
                <!-- 삭제 -->
                <div v-if="syncDiff.removed.length > 0" class="diff-section">
                  <div class="diff-label remove">➖ 삭제 {{ syncDiff.removed.length }}명</div>
                  <div v-for="m in syncDiff.removed" :key="m.soop_id" class="diff-row">
                    <input type="checkbox" v-model="syncSelected.removed" :value="m.soop_id" />
                    <span class="diff-crew">{{ m.crew_name }}</span>
                    <span class="diff-name">{{ m.name }}</span>
                    <span class="diff-id">{{ m.soop_id }}</span>
                  </div>
                </div>
                <!-- 이동 -->
                <div v-if="syncDiff.moved.length > 0" class="diff-section">
                  <div class="diff-label move">🔀 크루이동 {{ syncDiff.moved.length }}명</div>
                  <div v-for="m in syncDiff.moved" :key="m.soop_id" class="diff-row">
                    <input type="checkbox" v-model="syncSelected.moved" :value="m.soop_id" />
                    <span class="diff-name">{{ m.name }}</span>
                    <span class="diff-arrow">{{ m.from_crew }} → {{ m.to_crew }}</span>
                  </div>
                </div>
                <button class="btn-sync-apply" @click="applySync" :disabled="applying">
                  {{ applying ? '적용중...' : '✅ 선택한 변경사항 적용' }}
                </button>
              </template>
            </div>
          </div>

          <!-- 풍투 주소 다량 입력 -->
          <div class="section-title" style="margin-top:20px">🚀 풍투 주소로 한번에 추가</div>
          <div class="form-row">
            <select v-model.number="bulkCrewId">
              <option value="">크루 선택</option>
              <option v-for="c in crews" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <textarea
            v-model="bulkInput"
            class="bulk-textarea"
            placeholder="풍투데이 주소를 여러 줄로 붙여넣기&#10;예시:&#10;https://poong.today/broadcast/y1026&#10;https://poong.today/broadcast/yuambo&#10;&#10;또는 SOOP ID만&#10;y1026&#10;yuambo"
            rows="6"
          />
          <div class="bulk-preview" v-if="bulkParsed.length > 0">
            <div class="bulk-preview-title">파싱 결과 {{ bulkParsed.length }}명:</div>
            <div v-for="(p, i) in bulkParsed" :key="i" class="bulk-item">
              <span class="bulk-id">{{ p }}</span>
            </div>
          </div>
          <div class="form-row" style="margin-top:8px">
            <button class="btn-add" @click="addBulk" :disabled="bulking || !bulkCrewId || bulkParsed.length===0">
              {{ bulking ? `수집중... (${bulkDone}/${bulkParsed.length})` : `✅ ${bulkParsed.length}명 한번에 추가` }}
            </button>
          </div>
          <div class="hint">💡 SOOP ID가 자동으로 파싱됩니다. 닉네임은 나중에 수정하거나 SOOP ID로 표시됩니다.</div>

          <div class="section-title" style="margin-top:22px">멤버 목록 ({{ members.length }}명)</div>
          <div class="filter-bar">
            <button v-for="c in [{id:0,name:'전체'}, ...crews]" :key="c.id"
              :class="['filter-btn', filterCrew===c.id&&'active']" @click="filterCrew=c.id">{{ c.name }}</button>
          </div>
          <div class="item-list">
            <div v-for="m in filteredMembers" :key="m.id" class="item-row">
              <div class="color-dot" :style="{background: m.crew_color}" />
              <div class="member-info">
                <div class="item-name-row">
                  <span class="item-name">{{ m.name }}</span>
                  <span v-if="m.is_new" class="new-badge">NEW</span>
                </div>
                <span class="item-sub">{{ m.soop_id }} · {{ m.crew_name }}</span>
              </div>
              <button class="btn-new" @click="toggleNew(m)" :title="m.is_new ? '신입 해제' : '신입 설정'">
                {{ m.is_new ? '⭐' : '☆' }}
              </button>
              <button class="btn-del" @click="removeMember(m)">삭제</button>
            </div>
            <div v-if="filteredMembers.length===0" class="empty">멤버가 없습니다</div>
          </div>
        </div>

        <!-- 백업 탭 -->
        <div v-if="tab==='backup'">
          <!-- 비밀번호 변경 -->
          <div class="section-title">🔑 관리자 비밀번호 변경</div>
          <div class="form-row">
            <input v-model="newPw" type="password" placeholder="새 비밀번호 (4자 이상)" />
            <input v-model="newPwConfirm" type="password" placeholder="비밀번호 확인" />
            <button class="btn-add" @click="changePassword" :disabled="changingPw">
              {{ changingPw ? '변경중...' : '변경' }}
            </button>
          </div>
          <div v-if="pwMsg" :style="{fontSize:'12px', marginBottom:'16px', color: pwMsg.ok ? '#4cd964' : '#ff4d4d'}">
            {{ pwMsg.ok ? '✅ ' + pwMsg.text : '❌ ' + pwMsg.text }}
          </div>

          <!-- 낙수에 없는 크루 삭제 -->
          <div class="section-title">🗑️ 낙수표에 없는 크루</div>
          <div class="backup-desc">낙수표에 없는 크루를 삭제해요 (문의/요청 등)</div>
          <div v-if="unknownCrews.length === 0" class="empty" style="padding:10px">✅ 없음</div>
          <div v-for="c in unknownCrews" :key="c.id" class="backup-row">
            <span class="backup-time" :style="{color: c.color}">{{ c.name }}</span>
            <button class="btn-restore" style="color:#ff4d4d;border-color:#ff4d4d" @click="deleteUnknownCrew(c.id)">삭제</button>
          </div>

          <div class="section-title" style="margin-top:20px">💾 DB 백업 목록</div>
          <div class="backup-desc">낙수동기화 실행 시 자동으로 백업이 생성돼요 (최대 5개 보관)</div>
          <div v-if="backups.length === 0" class="empty">백업 없음</div>
          <div v-for="b in backups" :key="b.name" class="backup-row">
            <span class="backup-time">{{ b.time }}</span>
            <button class="btn-restore" @click="restoreBackup(b.name)" :disabled="restoring">
              {{ restoring === b.name ? '복원중...' : '복원' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../composables/useApi.js'

const emit = defineEmits(['close', 'updated'])

const tab = ref('crews')
const crews = ref([])
const members = ref([])
const adding = ref(false)
const filterCrew = ref(0)
const editingCrew = ref(null)
const editingMember = ref(null)

// 다량 입력
const bulkInput = ref('')
const importing = ref(false)
const importResult = ref(null)
const syncing = ref(false)
const applying = ref(false)
const syncDiff = ref(null)
const syncSelected = ref({ added: [], removed: [], moved: [] })
const bulkCrewId = ref('')
const bulking = ref(false)
const bulkDone = ref(0)

const bulkParsed = computed(() => {
  if (!bulkInput.value.trim()) return []
  return bulkInput.value
    .split('\n')
    .map(line => {
      line = line.trim()
      if (!line) return null
      // URL에서 SOOP ID 추출
      const urlMatch = line.match(/poong\.today\/broadcast\/([^/?#\s]+)/)
      if (urlMatch) return urlMatch[1]
      // SOOP ID 직접 입력
      if (/^[a-zA-Z0-9_]+$/.test(line)) return line
      return null
    })
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) // 중복 제거
})

const CREW_COLORS = [
  '#c84bff','#4a9eff','#ff4d7d','#f5a623','#4cd964',
  '#ff6b35','#00d4ff','#a78bfa','#f43f5e','#34d399',
]
function nextAutoColor() {
  const used = crews.value.map(c => c.color)
  return CREW_COLORS.find(c => !used.includes(c)) || CREW_COLORS[crews.value.length % CREW_COLORS.length]
}

const newCrew = ref({ name: '', color: '#c84bff', sort_order: 0, logo_url: '' })
const newMember = ref({ crew_id: '', soop_id: '', name: '', sort_order: 0, is_new: false })
const nickLooking = ref(false)
const nickFailed = ref(false)

async function lookupNickname() {
  const id = newMember.value.soop_id.trim()
  if (!id) return
  nickLooking.value = true
  nickFailed.value = false
  try {
    const res = await fetch(`/api/nickname/${id}`)
    if (res.ok) {
      const data = await res.json()
      newMember.value.name = data.nickname
    } else {
      nickFailed.value = true
    }
  } catch(e) {
    nickFailed.value = true
  }
  nickLooking.value = false
}

const filteredMembers = computed(() =>
  filterCrew.value ? members.value.filter(m => m.crew_id === filterCrew.value) : members.value
)

async function load() {
  try {
    crews.value = await api.getCrews()
    members.value = await api.getMembers()
    newCrew.value.color = nextAutoColor()
  } catch(e) { alert('로드 실패: ' + e.message) }
}

function startEdit(crew) { editingCrew.value = { ...crew } }

function handleLogoFile(e) {
  const file = e.target.files[0]; if (!file) return
  const r = new FileReader()
  r.onload = ev => { newCrew.value.logo_url = ev.target.result }
  r.readAsDataURL(file)
}
function handleEditLogoFile(e) {
  const file = e.target.files[0]; if (!file) return
  const r = new FileReader()
  r.onload = ev => { editingCrew.value.logo_url = ev.target.result }
  r.readAsDataURL(file)
}

async function saveCrew() {
  if (!editingCrew.value.name.trim()) return alert('크루명을 입력하세요')
  try {
    await api.updateCrew(editingCrew.value.id, {
      name: editingCrew.value.name,
      color: editingCrew.value.color,
      sort_order: editingCrew.value.sort_order,
      logo_url: editingCrew.value.logo_url || ''
    })
    editingCrew.value = null
    await load(); emit('updated')
  } catch(e) { alert(e.message) }
}

async function addCrew() {
  if (!newCrew.value.name.trim()) return alert('크루명을 입력하세요')
  adding.value = true
  try {
    await api.createCrew({ ...newCrew.value })
    newCrew.value = { name: '', color: nextAutoColor(), sort_order: 0, logo_url: '' }
    await load(); emit('updated')
  } catch(e) { alert(e.message) }
  adding.value = false
}

async function removeCrew(crew) {
  if (!confirm(`"${crew.name}" 크루를 삭제할까요?\n소속 멤버도 비활성화됩니다.`)) return
  try {
    await api.deleteCrew(crew.id)
    await load(); emit('updated')
  } catch(e) { alert('삭제 실패: ' + e.message) }
}

async function addMember() {
  if (!newMember.value.crew_id) return alert('크루를 선택하세요')
  if (!newMember.value.soop_id.trim()) return alert('SOOP ID를 입력하세요')

  // 닉네임 없으면 자동 조회
  if (!newMember.value.name.trim() || newMember.value.name === newMember.value.soop_id) {
    await lookupNickname()
  }

  adding.value = true
  try {
    await api.createMember({ ...newMember.value })
    newMember.value = { crew_id: newMember.value.crew_id, soop_id: '', name: '', sort_order: 0, is_new: false }
    nickFailed.value = false
    await load(); emit('updated')
  } catch(e) { alert(e.message) }
  adding.value = false
}

async function addBulk() {
  if (!bulkCrewId.value) return alert('크루를 선택하세요')
  if (bulkParsed.value.length === 0) return alert('추가할 멤버가 없어요')
  bulking.value = true
  bulkDone.value = 0
  for (const soopId of bulkParsed.value) {
    try {
      await api.createMember({
        crew_id: bulkCrewId.value,
        soop_id: soopId,
        name: soopId, // 일단 SOOP ID로 등록
        sort_order: 0,
        is_new: false
      })
      bulkDone.value++
    } catch(e) {
      console.warn(`${soopId} 등록 실패:`, e.message)
      bulkDone.value++
    }
    await new Promise(r => setTimeout(r, 500))
  }
  bulkInput.value = ''
  bulking.value = false
  await load(); emit('updated')
  alert(`${bulkDone.value}명 등록 완료! 닉네임은 멤버 목록에서 직접 수정하세요.`)
}

async function removeMember(m) {
  if (!confirm(`"${m.name}" 멤버를 삭제할까요?`)) return
  try {
    await api.deleteMember(m.id)
    await load(); emit('updated')
  } catch(e) { alert(e.message) }
}

function startEditMember(m) {
  editingMember.value = { ...m }
}

async function saveMember() {
  if (!editingMember.value.name.trim()) return alert('닉네임을 입력하세요')
  try {
    await api.updateMember(editingMember.value.id, {
      name: editingMember.value.name,
      crew_id: editingMember.value.crew_id,
      sort_order: editingMember.value.sort_order ?? 0,
      is_new: editingMember.value.is_new ?? 0,
      profile_img: editingMember.value.profile_img || ''
    })
    editingMember.value = null
    await load(); emit('updated')
  } catch(e) { alert(e.message) }
}

async function toggleNew(m) {
  try {
    await api.updateMember(m.id, { name: m.name, crew_id: m.crew_id, sort_order: m.sort_order, is_new: !m.is_new })
    await load(); emit('updated')
  } catch(e) { alert(e.message) }
}

async function checkSync() {
  syncing.value = true
  syncDiff.value = null
  try {
    const diff = await api.syncDiff()
    syncDiff.value = diff
    // 전체 선택 기본값
    syncSelected.value = {
      added: diff.added.map(m => m.soop_id),
      removed: diff.removed.map(m => m.soop_id),
      moved: diff.moved.map(m => m.soop_id)
    }
  } catch(e) { alert('확인 실패: ' + e.message) }
  syncing.value = false
}

async function applySync() {
  const selectedAdded = syncDiff.value.added.filter(m => syncSelected.value.added.includes(m.soop_id))
  const selectedRemoved = syncDiff.value.removed.filter(m => syncSelected.value.removed.includes(m.soop_id))
  const selectedMoved = syncDiff.value.moved.filter(m => syncSelected.value.moved.includes(m.soop_id))
  const total = selectedAdded.length + selectedRemoved.length + selectedMoved.length
  if (total === 0) return alert('선택된 항목이 없어요')
  if (!confirm(`추가 ${selectedAdded.length}명 / 삭제 ${selectedRemoved.length}명 / 이동 ${selectedMoved.length}명\n적용할까요?`)) return
  applying.value = true
  try {
    await api.syncApply({ added: selectedAdded, removed: selectedRemoved, moved: selectedMoved })
    syncDiff.value = null
    await load(); emit('updated')
    alert('동기화 완료!')
  } catch(e) { alert('적용 실패: ' + e.message) }
  applying.value = false
}

async function doImportNaksoo() {
  if (!confirm('naksoo.vercel.app 데이터를 임포트합니다.\n크루 7개, 멤버 84명을 수집합니다.\n(1~2분 소요)\n\n계속하시겠습니까?')) return
  importing.value = true
  importResult.value = null
  try {
    const res = await api.importNaksoo()
    importResult.value = res
    await load()
    emit('updated')
  } catch(e) { alert('임포트 실패: ' + e.message) }
  importing.value = false
}

const newPw = ref('')
const newPwConfirm = ref('')
const changingPw = ref(false)
const pwMsg = ref(null)

async function changePassword() {
  pwMsg.value = null
  if (newPw.value.length < 4) return pwMsg.value = { ok: false, text: '4자 이상 입력하세요' }
  if (newPw.value !== newPwConfirm.value) return pwMsg.value = { ok: false, text: '비밀번호가 일치하지 않아요' }
  changingPw.value = true
  try {
    await api.changePassword(newPw.value)
    pwMsg.value = { ok: true, text: '변경 완료! 다음 로그인부터 적용돼요.' }
    newPw.value = ''
    newPwConfirm.value = ''
  } catch(e) { pwMsg.value = { ok: false, text: e.message } }
  changingPw.value = false
}

const backups = ref([])
const restoring = ref(null)
const unknownCrews = ref([])

async function loadBackups() {
  try {
    const [bRes, uRes] = await Promise.all([api.getBackups(), api.getUnknownCrews()])
    backups.value = bRes.backups || []
    unknownCrews.value = uRes.crews || []
  } catch(e) { backups.value = [] }
}

async function deleteUnknownCrew(id) {
  if (!confirm('이 크루와 소속 멤버를 삭제할까요?')) return
  try {
    await api.deleteUnknownCrew(id)
    unknownCrews.value = unknownCrews.value.filter(c => c.id !== id)
    await load(); emit('updated')
  } catch(e) { alert('삭제 실패: ' + e.message) }
}

async function restoreBackup(name) {
  if (!confirm(`${name} 백업으로 복원할까요?\n복원 후 서버를 재시작해야 해요.`)) return
  restoring.value = name
  try {
    const res = await api.restoreBackup(name)
    alert(res.message)
  } catch(e) { alert('복원 실패: ' + e.message) }
  restoring.value = null
}

onMounted(load)
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%; max-width: 580px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}
.modal-header h2 { font-size: 15px; font-weight: 800; color: var(--text); }
.close-btn { font-size: 16px; color: var(--text2); padding: 4px 8px; cursor: pointer; border-radius: 6px; transition: all 0.15s; background: none; border: none; }
.close-btn:hover { color: var(--text); background: var(--border); }
.modal-body { padding: 14px 18px; overflow-y: auto; flex: 1; }

.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tab { padding: 7px 16px; border-radius: 8px; color: var(--text2); font-weight: 700; font-size: 13px; transition: all 0.15s; background: none; border: none; cursor: pointer; font-family: inherit; }
.tab:hover { color: var(--text); background: var(--border2); }
.tab.active { background: var(--border); color: var(--text); border: 1px solid var(--input-border); }

.section-title { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; }

.form-row { display: flex; gap: 8px; align-items: center; }
.form-row input, .form-row select, .form-row textarea {
  flex: 1; background: var(--input-bg); border: 1px solid var(--input-border);
  border-radius: 8px; padding: 8px 10px; font-size: 13px; color: var(--text);
  font-family: inherit; outline: none; transition: border-color 0.15s; min-width: 0;
}
.form-row input:focus, .form-row select:focus { border-color: #4a9eff; }
.form-row input::placeholder { color: var(--text4); }

.color-wrap { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.color-input { width: 38px; height: 36px; padding: 2px; border-radius: 7px; cursor: pointer; border: 1px solid var(--input-border); background: transparent; }
.color-label { font-size: 11px; color: var(--text2); white-space: nowrap; }

.logo-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; margin-bottom: 4px; }
.upload-btn { padding: 7px 12px; border-radius: 8px; background: var(--border); border: 1px solid var(--input-border); color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
.upload-btn:hover { background: var(--input-border); color: var(--text); }
.logo-preview-wrap { display: flex; align-items: center; gap: 6px; }
.logo-preview { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); }
.btn-x { width: 20px; height: 20px; border-radius: 50%; background: rgba(255,80,80,0.2); color: #ff6b6b; border: none; cursor: pointer; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

.btn-add { padding: 8px 14px; border-radius: 8px; background: #4a9eff; color: #fff; border: none; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: inherit; transition: background 0.15s; flex-shrink: 0; }
.btn-add:hover:not(:disabled) { background: #3a8ef0; }
.btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

.new-badge-label { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text2); white-space: nowrap; flex-shrink: 0; cursor: pointer; }
.new-badge-label input { width: auto; flex: none; }

/* 다량 입력 */
.bulk-textarea {
  width: 100%; margin-top: 8px;
  background: var(--input-bg); border: 1px solid var(--input-border);
  border-radius: 8px; padding: 10px; font-size: 12px; color: var(--text);
  font-family: monospace; resize: vertical; outline: none; line-height: 1.6;
  transition: border-color 0.15s;
}
.bulk-textarea:focus { border-color: #4a9eff; }
.bulk-preview { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
.bulk-preview-title { width: 100%; font-size: 11px; color: var(--text2); margin-bottom: 4px; }
.bulk-item { background: rgba(74,158,255,0.12); border: 1px solid rgba(74,158,255,0.25); border-radius: 6px; padding: 3px 8px; }
.bulk-id { font-size: 11px; color: #4a9eff; font-family: monospace; }

.soop-id-wrap { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.soop-id-wrap input { width: 100%; }
.nick-status { font-size: 11px; font-weight: 600; padding-left: 2px; }
.nick-status.loading { color: var(--text3); }
.nick-status.found { color: #4cd964; }
.nick-status.failed { color: #f5a623; }

.hint { font-size: 11px; color: var(--text3); margin-top: 7px; }

.filter-bar { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
.filter-btn { padding: 4px 10px; border-radius: 20px; font-size: 11px; color: var(--text2); background: var(--border2); border: 1px solid var(--border); cursor: pointer; font-family: inherit; transition: all 0.15s; }
.filter-btn.active { color: var(--text); border-color: var(--text4); background: var(--input-border); }

.item-list { display: flex; flex-direction: column; gap: 4px; }
.item-row { display: flex; align-items: center; gap: 9px; padding: 8px 10px; background: var(--item-bg); border: 1px solid var(--item-border); border-radius: 9px; transition: background 0.1s; }
.item-row:hover { background: var(--border2); }

.item-logo { width: 28px; height: 28px; border-radius: 7px; object-fit: contain; flex-shrink: 0; }
.item-logo-placeholder { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; flex-shrink: 0; }
.color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.member-info { flex: 1; min-width: 0; }
.item-name-row { display: flex; align-items: center; gap: 5px; }
.item-name { font-weight: 700; font-size: 13px; color: var(--text); }
.new-badge { font-size: 9px; font-weight: 800; color: #fff; background: #ff4d7d; padding: 1px 5px; border-radius: 4px; letter-spacing: 0.3px; }
.item-sub { font-size: 11px; color: var(--text3); }

.btn-new { padding: 4px 8px; border-radius: 6px; font-size: 13px; background: transparent; border: 1px solid var(--border); cursor: pointer; flex-shrink: 0; transition: all 0.15s; }
.btn-new:hover { background: var(--border); }
.btn-del { padding: 5px 10px; border-radius: 7px; background: rgba(255,80,80,0.1); color: #ff6b6b; border: 1px solid rgba(255,80,80,0.2); font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; flex-shrink: 0; }
.btn-del:hover { background: rgba(255,80,80,0.2); }
.btn-edit { padding: 5px 10px; border-radius: 7px; background: rgba(74,158,255,0.1); color: #4a9eff; border: 1px solid rgba(74,158,255,0.2); font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; flex-shrink: 0; }
.btn-edit:hover { background: rgba(74,158,255,0.2); }

.crew-item { flex-wrap: wrap; }
.edit-block { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.edit-btns { display: flex; gap: 6px; justify-content: flex-end; margin-top: 2px; }
.btn-save { padding: 6px 14px; border-radius: 7px; background: #4a9eff; color: #fff; border: none; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; }
.btn-save:hover { background: #3a8ef0; }
.btn-cancel { padding: 6px 14px; border-radius: 7px; background: var(--border); color: var(--text2); border: 1px solid var(--input-border); font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.btn-cancel:hover { color: var(--text); }
.upload-btn-sm { padding: 7px 10px; border-radius: 8px; background: var(--border); border: 1px solid var(--input-border); color: var(--text2); font-size: 13px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.empty { text-align: center; color: var(--text4); padding: 20px; font-size: 13px; }
.naksoo-import-box {
  margin-top: 20px;
  background: color-mix(in srgb, #4d96ff 8%, var(--bg3));
  border: 1.5px solid color-mix(in srgb, #4d96ff 30%, transparent);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.naksoo-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--text); }
.naksoo-badge { font-size: 10px; font-weight: 600; color: #4d96ff; background: rgba(77,150,255,0.12); border: 1px solid rgba(77,150,255,0.25); padding: 2px 8px; border-radius: 20px; }
.naksoo-desc { font-size: 11px; color: var(--text3); }
.btn-naksoo { padding: 9px 16px; border-radius: 8px; border: none; background: #4d96ff; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
.btn-naksoo:hover:not(:disabled) { opacity: 0.85; }
.btn-naksoo:disabled { opacity: 0.5; cursor: not-allowed; }
.naksoo-result { font-size: 12px; font-weight: 600; color: #4cd964; }
.sync-box { margin-top: 16px; background: color-mix(in srgb, #6bcb77 8%, var(--bg3)); border: 1.5px solid color-mix(in srgb, #6bcb77 25%, transparent); border-radius: 12px; padding: 14px 16px; }
.sync-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sync-title { font-size: 13px; font-weight: 700; color: var(--text); }
.sync-desc { font-size: 11px; color: var(--text3); margin-top: 2px; }
.btn-sync-check { flex-shrink: 0; padding: 7px 14px; border-radius: 8px; border: none; background: #6bcb77; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.btn-sync-check:disabled { opacity: 0.5; cursor: not-allowed; }
.sync-diff { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.sync-none { font-size: 12px; color: #6bcb77; font-weight: 600; }
.diff-section { display: flex; flex-direction: column; gap: 4px; }
.diff-label { font-size: 11px; font-weight: 700; padding: 2px 0; }
.diff-label.add { color: #6bcb77; }
.diff-label.remove { color: #ff4d4d; }
.diff-label.move { color: #f5a623; }
.diff-row { display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: var(--bg3); border-radius: 6px; font-size: 11px; }
.diff-thumb { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
.diff-crew { color: var(--text3); font-size: 10px; flex-shrink: 0; }
.diff-name { font-weight: 600; color: var(--text); }
.diff-id { color: var(--text4); font-size: 10px; margin-left: auto; }
.diff-arrow { color: var(--text3); font-size: 10px; }
.btn-sync-apply { align-self: flex-end; padding: 8px 20px; border-radius: 8px; border: none; background: var(--text); color: var(--bg); font-size: 12px; font-weight: 700; cursor: pointer; }
.btn-sync-apply:disabled { opacity: 0.5; }
.member-item { flex-wrap: wrap; }
.member-thumb { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.backup-desc { font-size: 11px; color: var(--text3); margin-bottom: 10px; }
.backup-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg3); border-radius: 8px; margin-bottom: 6px; }
.backup-time { font-size: 12px; color: var(--text2); font-family: monospace; }
.btn-restore { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); background: none; color: var(--text3); font-size: 11px; cursor: pointer; }
.btn-restore:hover:not(:disabled) { color: var(--text); border-color: var(--text3); }
.btn-restore:disabled { opacity: 0.5; }
</style>