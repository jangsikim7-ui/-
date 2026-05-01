# poong-synergy 세팅 가이드

엑셀크루 별풍선 시너지 대시보드. poongf와 동일한 스택(Vue 3 + Express + SQLite).

---

## 전체 흐름

```
1. Node.js 설치 (이미 있으면 skip)
2. 프로젝트 다운로드
3. npm install
4. DB 초기화 (npm run seed)
5. 빌드 + 서버 실행 (npm start)
6. 브라우저에서 크루/멤버 추가
7. (선택) ngrok으로 외부 접속
```

---

## 1. 프로젝트 다운로드

**Git 클론:**
```bash
git clone https://github.com/YOUR_REPO/poong-synergy.git
cd poong-synergy
```

**또는 ZIP 다운로드 후 압축 풀기**

---

## 2. 의존성 설치

```bash
npm install
```

> better-sqlite3 에러 시:
> ```bash
> npm install --global windows-build-tools
> ```

---

## 3. DB 초기화

최초 1회만:
```bash
npm run seed
```

---

## 4. 실행

### 프로덕션 (추천)
```bash
npm start
```
→ http://localhost:3002 접속

### 개발 모드
```bash
npm run dev:all
```
→ 프론트: http://localhost:5173  
→ 백엔드: http://localhost:3001

---

## 5. 크루 & 멤버 추가

1. 브라우저에서 http://localhost:3001 접속
2. 우측 상단 **⚙️ 관리** 버튼 클릭
3. **크루 관리** 탭에서 크루 추가 (이름 + 색상)
4. **멤버 관리** 탭에서 멤버 추가
   - 크루 선택
   - 닉네임 입력 (예: 철구)
   - SOOP ID 입력 (예: y1026) ← poong.today URL에서 확인
5. 추가하면 자동으로 풍투데이에서 현재 월 데이터 즉시 수집

---

## 6. SOOP ID 확인 방법

poong.today에서 BJ 페이지 URL 마지막 부분:
```
https://poong.today/broadcast/y1026  →  SOOP ID: y1026
https://poong.today/broadcast/abc123 →  SOOP ID: abc123
```

---

## 7. 자동 수집

서버가 켜져 있으면 **매 정각(1시간마다)** 자동으로 모든 멤버의 별풍선 수를 수집합니다.

수동으로 즉시 수집하려면 헤더의 **🔄 지금 수집** 버튼 클릭.

---

## 8. ngrok 외부 접속 (선택)

poongf 가이드와 동일:
```bash
ngrok.exe http 3001 --url=YOUR_DOMAIN.ngrok-free.dev
```

---

## 9. 스크립트 정리

| 명령어 | 설명 |
|--------|------|
| `npm install` | 의존성 설치 |
| `npm run seed` | DB 초기화 (최초 1회) |
| `npm start` | 빌드 + 서버 실행 |
| `npm run server` | 서버만 실행 |
| `npm run dev:all` | 개발 모드 |

---

## 10. 폴더 구조

```
poong-synergy/
├── server/
│   ├── index.js          # Express 서버 + cron
│   ├── data.db           # SQLite DB (자동 생성)
│   ├── db/
│   │   ├── schema.sql
│   │   ├── connection.js
│   │   └── seed.js
│   └── routes/
│       ├── api.js        # REST API
│       └── collector.js  # 풍투데이 수집기
├── src/
│   ├── App.vue           # 메인 대시보드
│   ├── components/
│   │   ├── CrewCard.vue  # 크루 카드
│   │   └── AdminModal.vue # 관리 모달
│   └── composables/
│       └── useApi.js
├── package.json
└── vite.config.js
```

---

## 11. 문제 해결

### "별풍선이 0으로 표시돼요"
- SOOP ID가 올바른지 확인 (poong.today URL 기준)
- 🔄 지금 수집 버튼 눌러보기
- 해당 BJ가 이번 달 방송을 안 했으면 0이 정상

### "포트 3001 이미 사용중"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID {PID번호} /F
```

### "DB 초기화 다시 하고 싶다"
```bash
del server\data.db
npm run seed
```
