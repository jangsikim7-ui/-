<template>
  <div class="fan-overlay" @click.self="$emit('close')">
    <div class="fan-modal">
      <!-- 헤더 -->
      <div class="fan-header">
        <div class="fan-bj">
          <img :src="cdnUrl(member.soop_id)" class="fan-bj-img" @error="e=>e.target.style.display='none'" />
          <div>
            <div class="fan-bj-name">{{ member.name }}</div>
            <div class="fan-bj-sub">이달의 후원자 TOP 10</div>
          </div>
        </div>
        <button class="fan-close" @click="$emit('close')">✕</button>
      </div>

      <!-- 로딩 -->
      <div v-if="loading" class="fan-loading">
        <div class="spin">⟳</div> 불러오는 중...
      </div>

      <!-- 에러 -->
      <div v-else-if="error" class="fan-error">{{ error }}</div>

      <!-- 팬 목록 -->
      <div v-else class="fan-list">
        <div class="fan-list-head">
          <span>순위</span>
          <span></span>
          <span>닉네임</span>
          <span class="r">선물횟수</span>
          <span class="r">별풍선</span>
        </div>
        <div v-for="fan in fans" :key="fan.rank" class="fan-row" :class="'r'+fan.rank">
          <div class="fan-rank">
            <span v-if="fan.rank === 1">🥇</span>
            <span v-else-if="fan.rank === 2">🥈</span>
            <span v-else-if="fan.rank === 3">🥉</span>
            <span v-else class="fan-rank-num">{{ fan.rank }}</span>
          </div>
          <img :src="fan.profile_img" class="fan-img" @error="e=>e.target.style.display='none'" />
          <div class="fan-name">{{ fan.name }}</div>
          <div class="fan-count r">{{ fan.count.toLocaleString('ko-KR') }}회</div>
          <div class="fan-balloons r">{{ fan.balloons.toLocaleString('ko-KR') }}</div>
        </div>

        <div v-if="fans.length === 0" class="fan-empty">후원자 데이터가 없어요</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../composables/useApi.js'

const props = defineProps({ member: Object, year: Number, month: Number })
const emit = defineEmits(['close'])

const loading = ref(true)
const error = ref('')
const fans = ref([])

function cdnUrl(soopId) {
  const prefix = soopId.slice(0, 2).toLowerCase()
  return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${soopId}/${soopId}.jpg`
}

onMounted(async () => {
  try {
    const data = await api.getFanRanking(props.member.soop_id, props.year, props.month)
    fans.value = data.fans || []
  } catch(e) {
    error.value = '불러오기 실패: ' + e.message
  }
  loading.value = false
})
</script>

<style scoped>
.fan-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.fan-modal {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 380px;
  max-width: 95vw;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  animation: slideUp 0.2s ease;
  overflow: hidden;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

.fan-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg4);
}
.fan-bj { display: flex; align-items: center; gap: 10px; }
.fan-bj-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
.fan-bj-name { font-size: 15px; font-weight: 800; color: var(--text); }
.fan-bj-sub { font-size: 11px; color: var(--text3); margin-top: 1px; }
.fan-close { background: none; border: none; color: var(--text3); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.fan-close:hover { background: var(--bg3); color: var(--text); }

.fan-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 40px; color: var(--text3); font-size: 13px; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg) } }

.fan-error { padding: 30px; text-align: center; color: #ff4d4d; font-size: 13px; }

.fan-list { padding: 8px 0 12px; }
.fan-list-head {
  display: grid; grid-template-columns: 32px 28px 1fr 60px 80px;
  padding: 4px 12px 8px;
  font-size: 10px; font-weight: 600; color: var(--text4);
  text-transform: uppercase; letter-spacing: 0.3px;
  border-bottom: 1px solid var(--border2);
  margin-bottom: 4px;
}
.fan-list-head .r, .fan-balloons, .fan-count { text-align: right; }

.fan-row {
  display: grid; grid-template-columns: 32px 28px 1fr 60px 80px;
  align-items: center; padding: 7px 12px;
  gap: 6px; transition: background 0.1s;
}
.fan-row:hover { background: var(--member-hover); }
.fan-row.r1 { background: rgba(255,200,50,0.06); }
.fan-row.r2 { background: rgba(180,180,200,0.04); }
.fan-row.r3 { background: rgba(180,120,60,0.04); }

.fan-rank { display: flex; align-items: center; justify-content: center; font-size: 14px; }
.fan-rank-num { font-size: 11px; font-weight: 700; color: var(--text4); }
.fan-img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); }
.fan-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fan-count { font-size: 11px; color: var(--text3); text-align: right; }
.fan-balloons { font-size: 12px; font-weight: 700; color: #f5a623; text-align: right; letter-spacing: -0.3px; }

.fan-empty { text-align: center; color: var(--text4); padding: 30px; font-size: 13px; }
</style>
