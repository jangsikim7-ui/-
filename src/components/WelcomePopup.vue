<template>
  <div v-if="showWelcomePopup" class="popup-overlay" @click.self="closePopup">
    <div class="popup-box">
      <button class="popup-x" @click="closePopup">✕</button>

      <span class="popup-pill">⚡ 엑셀크루 시너지표</span>
      <p class="popup-ttl">어떤 기능들이<br>있는지 알아봐요</p>
      <p class="popup-sub">크루별 BJ 데이터를 다양한 방식으로 확인하세요</p>

      <!-- 크루 그룹 -->
      <div class="sec-lbl">크루 그룹</div>
      <div class="crew-group">
        <div class="crew-card crew-excel">
          <div class="crew-icon-wrap">👥</div>
          <div class="crew-info">
            <div class="crew-name">엑셀크루</div>
            <span class="crew-tag">EXCEL CREW</span>
          </div>
          <span class="crew-arrow">›</span>
        </div>
        <div class="crew-card crew-bora">
          <div class="crew-icon-wrap">👑</div>
          <div class="crew-info">
            <div class="crew-name">보라엑셀크루</div>
            <span class="crew-tag">BORA EXCEL CREW</span>
          </div>
          <span class="crew-arrow">›</span>
        </div>
      </div>

      <!-- 주요 기능 -->
      <div class="sec-lbl">주요 기능</div>
      <div class="feat-list">
        <div class="feat-item">
          <span class="feat-ico">🎈</span>
          <div>
            <div class="feat-name">별풍선 순위</div>
            <div class="feat-desc">크루별 월간 별풍선 현황 비교</div>
          </div>
        </div>
        <div class="feat-item">
          <span class="feat-ico">👁️</span>
          <div>
            <div class="feat-name">뷰어십 순위</div>
            <div class="feat-desc">월간 누적 시청자 수 비교</div>
          </div>
        </div>
        <div class="feat-item">
          <span class="feat-ico">⚔️</span>
          <div>
            <div class="feat-name">크루대결</div>
            <div class="feat-desc">두 크루를 직접 맞대결로 비교</div>
          </div>
        </div>
        <div class="feat-item feat-gold">
          <span class="feat-ico">👑</span>
          <div>
            <div class="feat-name feat-name-gold">크루 매출풍</div>
            <div class="feat-desc">크루수장 월간 별풍선 현황</div>
          </div>
        </div>
        <div class="feat-item feat-honor">
          <span class="feat-ico">🏆</span>
          <div>
            <div class="feat-name feat-name-honor">이달의 명예</div>
            <div class="feat-desc">크루 평균·수장 별풍선·개인 TOP 10 순위 한눈에</div>
          </div>
        </div>
        <div class="feat-item feat-blue">
          <span class="feat-ico">🏅</span>
          <div>
            <div class="feat-name feat-name-blue">이달의 후원자</div>
            <div class="feat-desc">BJ 이름 클릭 시 TOP 10 후원자 확인</div>
          </div>
        </div>
        <!-- 문의하기 강조 -->
        <div class="feat-item feat-contact">
          <span class="feat-ico">📩</span>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;">
              <div class="feat-name feat-name-contact">문의하기</div>
              <span class="contact-badge">추천</span>
            </div>
            <div class="feat-desc feat-desc-contact">데이터 오류·수정 요청은 여기로 바로 보내주세요!</div>
          </div>
          <span class="contact-arr">›</span>
        </div>
      </div>

      <!-- 하단 정보 -->
      <div class="bottom-row">
        <div class="bottom-box">
          <div class="bottom-label">테마</div>
          <div class="bottom-val">🌙 다크 / ☀️ 라이트</div>
        </div>
        <div class="auto-box">
          <span class="dot"></span>
          <span class="auto-txt"><strong>1시간</strong>마다 자동 갱신</span>
        </div>
      </div>

      <button class="popup-btn" @click="closePopup">✓ 확인했어요!</button>
      <div class="popup-sep"></div>
      <div class="popup-skip" @click="skipToday = !skipToday">
        <div class="popup-chk" :class="{ on: skipToday }">✓</div>
        <span class="popup-sk-lbl">오늘 하루 안 보기</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showWelcomePopup = ref(false)
const skipToday = ref(false)

function open() {
  const hiddenUntil = localStorage.getItem('popup_hidden_until')
  if (hiddenUntil !== new Date().toDateString()) {
    showWelcomePopup.value = true
  }
}

function closePopup() {
  if (skipToday.value) {
    localStorage.setItem('popup_hidden_until', new Date().toDateString())
  }
  showWelcomePopup.value = false
}

defineExpose({ open })
</script>

<style scoped>
/* ── 오버레이 ── */
.popup-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.65);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 50px; backdrop-filter: blur(6px);
  overflow-y: auto;
}

/* ── 팝업 박스 ── */
.popup-box {
  width: 340px;
  border-radius: 20px;
  padding: 22px 20px 18px;
  position: relative;
  display: flex; flex-direction: column;
  margin-bottom: 40px;
  background: #0e1020;
  border: 0.5px solid #252850;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
[data-theme="light"] .popup-box {
  background: #f4f5fb;
  border-color: #d0d4ee;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
}

/* ── 닫기 버튼 ── */
.popup-x {
  position: absolute; top: 14px; right: 14px;
  width: 26px; height: 26px; border-radius: 50%; border: none;
  font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
  background: #1e2340; color: #6070a0;
  transition: color 0.15s;
}
.popup-x:hover { color: #a0aacc; }
[data-theme="light"] .popup-x { background: #e4e6f8; color: #9090b8; }
[data-theme="light"] .popup-x:hover { color: #5a5a90; }

/* ── 상단 pill / 제목 / 부제 ── */
.popup-pill {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 500;
  padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;
  background: #1e2340; color: #a0aacc; border: 0.5px solid #303560;
}
[data-theme="light"] .popup-pill {
  background: #e4e6f8; color: #5a5a90; border-color: #c0c4e0;
}

.popup-ttl {
  font-size: 17px; font-weight: 700; line-height: 1.35; margin-bottom: 4px;
  color: #e0e8ff;
}
[data-theme="light"] .popup-ttl { color: #1a1a3a; }

.popup-sub {
  font-size: 11px; line-height: 1.5; margin-bottom: 14px;
  padding-bottom: 12px; border-bottom: 0.5px solid #252850;
  color: #6070a0;
}
[data-theme="light"] .popup-sub { color: #7070a0; border-bottom-color: #d0d4ee; }

/* ── 섹션 라벨 ── */
.sec-lbl {
  font-size: 9.5px; font-weight: 600; letter-spacing: .5px;
  text-transform: uppercase; margin-bottom: 7px;
  color: #5060a0;
}
[data-theme="light"] .sec-lbl { color: #9090b8; }

/* ── 크루 카드 ── */
.crew-group { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.crew-card {
  border-radius: 12px; padding: 12px 14px;
  border: 1px solid; position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 12px;
}
.crew-excel {
  background: linear-gradient(120deg, #071828 0%, #0d2545 100%);
  border-color: #3a7acc;
  box-shadow: 0 0 18px rgba(74,158,255,0.12), inset 0 1px 0 rgba(74,158,255,0.15);
}
.crew-bora {
  background: linear-gradient(120deg, #160820 0%, #2a0d42 100%);
  border-color: #9944cc;
  box-shadow: 0 0 18px rgba(160,80,255,0.12), inset 0 1px 0 rgba(200,100,255,0.15);
}
[data-theme="light"] .crew-excel {
  background: linear-gradient(120deg, #d8eeff 0%, #eaf4ff 100%);
  border-color: #1a60dd;
  box-shadow: 0 2px 14px rgba(26,96,221,0.10), inset 0 1px 0 rgba(74,158,255,0.2);
}
[data-theme="light"] .crew-bora {
  background: linear-gradient(120deg, #eedeff 0%, #f7eeff 100%);
  border-color: #8822cc;
  box-shadow: 0 2px 14px rgba(136,34,204,0.10), inset 0 1px 0 rgba(200,100,255,0.2);
}
.crew-icon-wrap {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0; position: relative; z-index: 1;
}
.crew-excel .crew-icon-wrap { background: rgba(74,158,255,0.15); }
.crew-bora  .crew-icon-wrap { background: rgba(200,100,255,0.15); }
[data-theme="light"] .crew-excel .crew-icon-wrap { background: rgba(26,96,221,0.12); }
[data-theme="light"] .crew-bora  .crew-icon-wrap { background: rgba(136,34,204,0.12); }
.crew-info { flex: 1; position: relative; z-index: 1; }
.crew-name { font-size: 13px; font-weight: 700; letter-spacing: -0.2px; }
.crew-excel .crew-name { color: #90c8ff; }
.crew-bora  .crew-name { color: #dd99ff; }
[data-theme="light"] .crew-excel .crew-name { color: #0a3a99; }
[data-theme="light"] .crew-bora  .crew-name { color: #5a0099; }
.crew-tag {
  display: inline-block; font-size: 9px; font-weight: 600;
  border-radius: 5px; padding: 1px 6px; margin-top: 3px;
}
.crew-excel .crew-tag { background: rgba(74,158,255,0.15); color: #60aaff; }
.crew-bora  .crew-tag { background: rgba(200,100,255,0.15); color: #cc77ff; }
[data-theme="light"] .crew-excel .crew-tag { background: rgba(26,96,221,0.12); color: #1a4eb0; }
[data-theme="light"] .crew-bora  .crew-tag { background: rgba(136,34,204,0.12); color: #7722aa; }
.crew-arrow { font-size: 16px; position: relative; z-index: 1; }
.crew-excel .crew-arrow { color: #3a6aaa; }
.crew-bora  .crew-arrow { color: #7733aa; }
[data-theme="light"] .crew-excel .crew-arrow { color: #4a80cc; }
[data-theme="light"] .crew-bora  .crew-arrow { color: #9955cc; }

/* ── 기능 리스트 ── */
.feat-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.feat-item {
  display: flex; align-items: center; gap: 11px;
  border-radius: 9px; padding: 9px 12px; border: 0.5px solid;
  background: #12152a; border-color: #252850;
}
[data-theme="light"] .feat-item { background: #fff; border-color: #d8daf0; }
.feat-ico { font-size: 17px; width: 24px; text-align: center; flex-shrink: 0; }
.feat-name { font-size: 12px; font-weight: 600; margin-bottom: 1px; color: #c0c8ee; }
[data-theme="light"] .feat-name { color: #1a1a3a; }
.feat-desc { font-size: 9.5px; color: #6070a0; }
[data-theme="light"] .feat-desc { color: #7070a0; }

/* 금색 */
.feat-gold { background: rgba(255,196,0,0.07) !important; border-color: rgba(255,196,0,0.2) !important; }
.feat-name-gold { color: #f5c842 !important; }
[data-theme="light"] .feat-gold { background: rgba(255,196,0,0.06) !important; border-color: rgba(200,140,0,0.25) !important; }
[data-theme="light"] .feat-name-gold { color: #a06800 !important; }

/* 이달의명예 골드 */
.feat-honor { background: rgba(201,150,10,0.08) !important; border-color: rgba(201,150,10,0.28) !important; }
.feat-name-honor { color: #f5c842 !important; }
[data-theme="light"] .feat-honor { background: rgba(201,150,10,0.06) !important; border-color: rgba(180,130,0,0.28) !important; }
[data-theme="light"] .feat-name-honor { color: #8a6400 !important; }

/* 파란색 */
.feat-blue { background: rgba(74,158,255,0.07) !important; border-color: rgba(74,158,255,0.2) !important; }
.feat-name-blue { color: #60b4ff !important; }
[data-theme="light"] .feat-blue { background: rgba(74,158,255,0.06) !important; border-color: rgba(74,158,255,0.25) !important; }
[data-theme="light"] .feat-name-blue { color: #1a5fbb !important; }

/* 문의하기 강조 */
.feat-contact {
  background: linear-gradient(135deg, rgba(74,158,255,0.10), rgba(107,95,255,0.10)) !important;
  border: 1.5px solid rgba(107,95,255,0.55) !important;
}
[data-theme="light"] .feat-contact {
  background: linear-gradient(135deg, rgba(74,158,255,0.08), rgba(107,95,255,0.08)) !important;
  border-color: rgba(107,95,255,0.35) !important;
}
.feat-name-contact { color: #a0c8ff !important; }
[data-theme="light"] .feat-name-contact { color: #2244bb !important; }
.feat-desc-contact { color: #7090c0 !important; }
[data-theme="light"] .feat-desc-contact { color: #5060a0 !important; }
.contact-badge {
  font-size: 9px; font-weight: 700;
  background: #6b5fff; color: #fff;
  border-radius: 5px; padding: 1px 6px;
}
.contact-arr { font-size: 14px; color: #6b5fff; }

/* ── 하단 정보 ── */
.bottom-row { display: flex; gap: 6px; margin-bottom: 12px; }
.bottom-box {
  flex: 1; border-radius: 8px; padding: 7px 10px;
  border: 0.5px solid; text-align: center;
  background: #12152a; border-color: #252850;
}
[data-theme="light"] .bottom-box { background: #fff; border-color: #d8daf0; }
.bottom-label { font-size: 9.5px; margin-bottom: 2px; color: #6070a0; }
[data-theme="light"] .bottom-label { color: #9090b8; }
.bottom-val { font-size: 11px; font-weight: 500; color: #c0c8ee; }
[data-theme="light"] .bottom-val { color: #1a1a3a; }
.auto-box {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 6px; border-radius: 8px; padding: 7px 10px;
  border: 0.5px solid;
  background: #12152a; border-color: #252850;
}
[data-theme="light"] .auto-box { background: #fff; border-color: #d8daf0; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #1D9E75; flex-shrink: 0; }
.auto-txt { font-size: 10.5px; color: #6070a0; }
[data-theme="light"] .auto-txt { color: #7070a0; }
.auto-txt strong { color: #c0c8ee; }
[data-theme="light"] .auto-txt strong { color: #1a1a3a; }

/* ── 확인 버튼 ── */
.popup-btn {
  width: 100%; padding: 13px; border-radius: 12px;
  font-size: 14px; font-weight: 700; border: none; cursor: pointer;
  font-family: inherit; letter-spacing: -0.2px; margin-bottom: 10px;
  background: linear-gradient(135deg, #7c74e8, #5a52c8);
  color: #fff;
  box-shadow: 0 4px 16px rgba(124,116,232,0.35);
  transition: opacity 0.15s, transform 0.15s;
}
.popup-btn:hover { opacity: 0.88; transform: translateY(-1px); }
[data-theme="light"] .popup-btn {
  background: linear-gradient(135deg, #6b5fff, #5248d0);
  box-shadow: 0 4px 16px rgba(107,95,255,0.28);
}

/* ── 구분선 / 오늘 하루 안보기 ── */
.popup-sep { height: 0.5px; background: #252850; margin-bottom: 10px; }
[data-theme="light"] .popup-sep { background: #d8daf0; }
.popup-skip {
  display: flex; align-items: center; justify-content: center;
  gap: 7px; cursor: pointer; user-select: none;
}
.popup-chk {
  width: 15px; height: 15px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: transparent;
  border: 1.5px solid #5060a0; transition: all 0.15s;
}
.popup-chk.on { background: #7c74e8; border-color: #7c74e8; color: #fff; }
[data-theme="light"] .popup-chk { border-color: #b0b0d0; }
[data-theme="light"] .popup-chk.on { background: #6b5fff; border-color: #6b5fff; }
.popup-sk-lbl { font-size: 10.5px; font-weight: 500; color: #6070a0; }
[data-theme="light"] .popup-sk-lbl { color: #9090b8; }

/* ── 모바일 ── */
@media (max-width: 600px) {
  .popup-overlay { padding-top: 16px; }
  .popup-box { width: 90vw; padding: 18px 16px 16px; }
}
</style>