# Connect Four BY KEVIN

2명의 플레이어가 실시간으로 함께 플레이할 수 있는 온라인 Connect Four (사목 게임) 게임입니다.
Kevin이 제작한 프리미엄 온라인 보드 게임입니다.

🎮 **[지금 플레이하기](https://crossomok-production.up.railway.app/)**

## 주요 기능

### 기본 게임 기능
- ✅ **7x6 게임 보드**: 클래식 Connect Four 크기
- ✅ **실시간 멀티플레이어**: Socket.io를 활용한 실시간 대전
- ✅ **방 생성 및 입장**: 고유한 방 ID로 친구 초대
- ✅ **게스트 로그인**: 별도 회원가입 없이 닉네임만으로 플레이
- ✅ **닉네임 변경**: 언제든지 닉네임 수정 가능
- ✅ **4개 연결 승리**: 가로/세로/대각선 4개 연결 시 승리
- ✅ **중력 시스템**: 돌이 자연스럽게 아래로 떨어짐
- ✅ **게임 재시작**: 같은 방에서 바로 재시작 가능

### 고급 기능
- 🎯 **선공 결정 룰렛**: 게임 시작 시 랜덤하게 선공 결정 (3초 애니메이션)
- ⏱️ **턴 타이머**: 10초/20초/30초 중 선택 가능한 턴 제한 시간
  - 시간 초과 시 자동 패배
  - 실시간 카운트다운 표시
- 📋 **방 목록**: 현재 생성된 모든 방 확인 및 원클릭 입장
  - 실시간 방 정보 업데이트
  - 방장 닉네임, 인원 수, 턴 제한 시간 표시
  - 대기 중인 방만 입장 가능

### UI/UX (VER 2.0 업데이트)
- 🎯 **2클릭 확인 시스템**: 실수 방지를 위한 착수 확인 (첫 클릭: 선택, 두 번째 클릭: 확정)
- 🏆 **승리 수 하이라이트**: 승리한 4개 돌에 초록색 링 애니메이션
- 📍 **마지막 수 표시**: 가장 최근 착수된 돌에 밝은 청록색(cyan) 테두리 + 깜빡이는 애니메이션으로 명확하게 표시
- ⬇️ **턴 인디케이터 화살표**: 내 차례일 때 큰 화살표로 명확하게 안내
- 🎊 **승리/패배 배너**: 게임 종료 시 상단에 큰 그라디언트 배너 표시
- 🔄 **상호 재대결 확인**: 양쪽 플레이어 모두 동의해야 재시작
- 🔄 **완벽한 게임 상태 리셋**: 재대결/방 나가기 시 모든 게임 상태 초기화
- 🎡 **돌림판 누적 회전**: 재대결 시에도 돌림판이 정상 작동
- 📱 **아이폰 최적화**: 작은 화면에 맞춘 컴팩트한 레이아웃 (380px 게임 보드)
- ✨ **향상된 클릭 가이드**: 명확한 호버 효과와 화살표 표시
- 🎨 **애니메이션**: 부드러운 돌 떨어짐 효과
- 📱 **반응형 디자인**: 모바일/태블릿/PC 모든 화면 크기 지원
- ⚡ **실시간 상태 표시**: 연결 상태, 턴 표시, 타이머
- 🎪 **브랜딩 업데이트**: "Connect Four BY KEVIN" 브랜딩 적용
- 📝 **게임 설명 추가**: 메인 화면에 "4개의 돌을 연속으로 놓아 승리하세요!" 설명 표시
- ⬅️ **간결한 네비게이션**: 뒤로가기 버튼을 화살표 아이콘(←)으로 최적화
- 🎯 **UI 정리**: 불필요한 방 ID 복사 버튼 제거로 깔끔한 레이아웃 구현

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Socket.io (Custom Server)
- **배포**: Railway (WebSocket 지원)
- **저장소**: 메모리 기반 (DB 불필요)

## 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버가 http://localhost:4077 에서 실행됩니다.

### 3. 프로덕션 서버

게임을 바로 플레이하려면 https://crossomok-production.up.railway.app/ 에 접속하세요.

### 4. 게임 플레이

#### 방법 1: 새 게임 만들기
1. 브라우저에서 https://crossomok-production.up.railway.app/ 접속
2. 닉네임 입력
3. "새 게임 만들기" 버튼 클릭
4. 턴 제한 시간 선택 (10초/20초/30초)
5. 생성된 방 ID를 친구에게 공유
6. 친구가 입장하면 자동으로 선공 결정 룰렛 시작
7. 게임 시작!

#### 방법 2: 방 목록에서 입장
1. "방 목록 보기" 버튼 클릭
2. 원하는 방 선택하여 입장
3. 자동으로 선공 결정 룰렛 시작
4. 게임 시작!

#### 방법 3: 방 ID로 직접 입장
1. 친구로부터 받은 방 ID 입력
2. "게임 참가" 버튼 클릭
3. 자동으로 선공 결정 룰렛 시작
4. 게임 시작!

## 게임 규칙

- 두 플레이어가 번갈아가며 열(column)을 선택하여 돌을 떨어뜨립니다
- 돌은 중력에 따라 가장 아래 빈 칸으로 떨어집니다
- 가로, 세로, 대각선으로 **4개를 먼저 연결**하면 승리
- 제한 시간 내에 수를 두지 않으면 **자동 패배**
- 보드가 가득 차면 무승부
- 게임 종료 후 같은 방에서 재시작 가능 (선공 다시 결정)

## 프로젝트 구조

```
Connect-Four/
├── app/
│   ├── layout.tsx          # 레이아웃
│   ├── page.tsx            # 메인 게임 페이지 (모든 게임 로직)
│   └── globals.css         # 글로벌 스타일
├── components/
│   ├── GameBoard.tsx       # 게임 보드 컴포넌트
│   └── SpinWheel.tsx       # 선공 결정 룰렛 컴포넌트
├── lib/
│   ├── socket.ts           # Socket.io 클라이언트 (재연결 로직 포함)
│   └── types.ts            # TypeScript 타입 정의
├── server.js               # Socket.io 서버 (게임 로직, 타이머 관리)
├── package.json
├── railway.json            # Railway 배포 설정
└── tsconfig.json
```

## Railway 배포

이 프로젝트는 Socket.io의 지속적인 WebSocket 연결을 위해 Railway에 배포됩니다.

### 배포 설정
- **Port**: 환경변수 `PORT` 사용 (Railway 자동 할당)
- **Start 명령어**: `node server.js`
- **Health Check**: `/health` 엔드포인트

### 환경변수
```
NEXT_PUBLIC_SOCKET_URL=https://crossomok-production.up.railway.app
```

## 🚨 배포 트러블슈팅

### 문제: 코드 수정 후 Railway 재배포해도 변경사항이 반영되지 않음

#### 원인
1. **Railway 빌드 캐시 문제**: Railway가 이전 빌드 캐시를 사용하여 새로운 코드를 빌드하지 않음
2. **railway.json에 buildCommand 누락**: 명시적인 빌드 명령어가 없어서 Next.js 빌드가 생략될 수 있음
3. **브라우저 캐시**: 클라이언트 측 캐시로 인해 이전 버전이 표시됨

#### 해결 방법

##### 1. railway.json 설정 확인 (필수)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"  // 이 줄 필수!
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

##### 2. TypeScript 빌드 에러 해결
코드 수정 시 TypeScript 타입 체크를 통과해야 함:
```bash
# 로컬에서 빌드 테스트 (선택사항)
npm run build
```

**주의사항:**
- `setShowWinModal` 같은 제거된 state를 이벤트 핸들러에서도 제거했는지 확인
- `socket.id`는 `string | undefined` 타입이므로 null 체크 필수:
  ```typescript
  if (!socket || !socket.id) return;
  // 또는 타입 단언
  socket.id as string
  ```

##### 3. Railway 캐시 강제 클리어
캐시 문제로 빌드가 안 되면:

```bash
# 방법 1: 빈 커밋으로 강제 재빌드
git commit --allow-empty -m "Force rebuild to clear Railway cache"
git push
```

```bash
# 방법 2: Railway 대시보드에서
# Settings → Clear Build Cache → Redeploy
```

##### 4. 배포 확인 방법
- 버전 표시 추가: UI에 `VER.2.0` 같은 버전 배지 표시
- Railway Build Logs 확인: `npm run build` 실행되었는지 확인
- Deploy Logs 확인: 서버가 제대로 시작되었는지 확인

##### 5. 브라우저 캐시 클리어
배포 완료 후:
- **PC**: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
- **아이폰**: 설정 → Safari → 방문 기록 및 웹사이트 데이터 지우기
- **개발자 도구**: Network 탭 → "Disable cache" 체크 → 새로고침

#### 체크리스트
- [ ] railway.json에 buildCommand 있는지 확인
- [ ] TypeScript 에러 없는지 확인 (특히 제거된 state 사용)
- [ ] 커밋 & 푸시 완료
- [ ] Railway 빌드 로그에서 `npm run build` 실행 확인
- [ ] 필요시 빈 커밋으로 강제 재빌드
- [ ] 브라우저 캐시 클리어 후 확인
- [ ] 버전 배지로 새 버전 배포 확인

## Socket.io 이벤트

### 클라이언트 → 서버
- `createRoom`: 새 방 생성
- `joinRoom`: 방 입장
- `spinWheel`: 돌림판 시작
- `makeMove`: 수 두기
- `requestRematch`: 재대결 요청 (VER 2.0)
- `updateNickname`: 닉네임 변경
- `getRoomList`: 방 목록 요청

### 서버 → 클라이언트
- `roomCreated`: 방 생성 완료
- `gameState`: 게임 상태 업데이트
- `moveMade`: 수 두기 완료 (lastMove, winningPositions 포함)
- `gameOver`: 게임 종료 (winningPositions 포함)
- `rematchRequested`: 재대결 요청 상태 업데이트 (VER 2.0)
- `gameReset`: 게임 리셋 완료
- `wheelSpinning`: 룰렛 시작
- `timeUpdate`: 타이머 업데이트
- `timeOver`: 시간 초과
- `playerDisconnected`: 플레이어 연결 끊김
- `roomList`: 방 목록
- `roomListUpdated`: 방 목록 업데이트
- `error`: 에러 메시지

## 에러 핸들링

- Socket.io 재연결 로직 (최대 5회 시도)
- 중복 클릭 방지
- 입력 검증 (서버 사이드)
- 자동 에러 메시지 제거 (3초)
- 연결 상태 표시

## 🛠️ 개발 원칙 및 디버깅 가이드

### UI 기능이 작동하지 않을 때 체크리스트

**반드시 이 순서로 확인하여 근본 원인을 찾을 것:**

1. **데이터부터 확인**
   - `console.log()`로 실제 데이터가 전달되는지 확인
   - 데이터 구조가 예상과 일치하는지 확인
   - undefined/null 값이 없는지 확인

2. **서버-클라이언트 데이터 일치 확인** ⚠️ **가장 중요**
   - 서버가 보내는 프로퍼티 이름 확인 (예: `column` vs `col`)
   - 클라이언트가 읽는 프로퍼티 이름 확인
   - TypeScript 타입 정의와 실제 코드 일치 확인
   - **실제 사례**: 서버에서 `{ row, column }` 전송 → 클라이언트에서 `lastMove.col` 확인 → 항상 false

3. **TypeScript 타입과 실제 코드 일치 확인**
   - 타입 정의만 수정하고 실제 구현은 변경 안 했는지 확인
   - 제거된 state/props를 다른 곳에서 여전히 사용하는지 확인

4. **CSS/스타일 문제는 마지막에**
   - 데이터가 정상이고 조건문도 true인데 안 보이는 경우에만 CSS 확인
   - 같은 CSS 방법으로 여러 번 실패하면 → 완전히 다른 접근 방법 사용
   - 예: ring → border → 별도 오버레이 레이어

### 실수하지 말아야 할 것

❌ **하지 말 것:**
- 증상만 보고 CSS만 계속 수정
- 같은 방법으로 10번 시도
- 데이터 확인 없이 UI만 수정

✅ **해야 할 것:**
- 근본 원인 찾기 (데이터 → 로직 → UI 순서)
- 같은 방법으로 2-3번 실패하면 접근 방법 변경
- 서버-클라이언트 간 프로퍼티 이름 항상 검증

## 📌 개발 체크포인트

### VER 2.0.1 버그 수정 (2026-01-10)
- ✅ **마지막 착수 표시 수정**: 서버-클라이언트 프로퍼티 불일치 해결
  - 문제: 서버는 `{ row, column }` 전송, 클라이언트는 `lastMove.col` 확인
  - 해결: 서버를 `{ row, col }` 로 통일
  - UI: 청록색 테두리 + 깜빡임 애니메이션 (별도 오버레이 레이어 방식)
- ✅ **돌림판 회전 버그 수정 (최종)**: 두 번째 재대결부터 회전 안 보이는 문제 해결
  - **문제**: 첫 번째 스핀(0°→1800°)은 정상, 두 번째부터(1800°→3600°) 정지된 것처럼 보임
  - **원인**: rotation 값이 계속 누적(0→1800→3600→5400...)되어 CSS transition은 작동하지만 시각적으로 회전이 안 보임
  - **해결**: 매 스핀마다 rotation을 0으로 리셋 후 목표값 설정
    1. `setIsAnimating(false)` + `setRotation(0)` (transition 끄고 리셋)
    2. `requestAnimationFrame` 두 번 사용하여 DOM 업데이트 동기화
    3. `setIsAnimating(true)` + `setRotation(1800 or 1980)` (transition 켜고 회전)
  - **결과**: 재대결할 때마다 항상 0도에서 시작하여 육안으로 명확하게 회전하는 애니메이션 표시
- ✅ **게임 상태 초기화 버그 수정**: 재대결/방 나가기 시 완전한 상태 리셋
  - `remainingTime`, `selectedTurnTime` 서버와 동기화
  - `isSpinning`, `firstPlayer`, `isMoving` 상태 초기화
- ✅ **개발 원칙 문서화**: README에 디버깅 가이드 및 실수 방지 원칙 추가

### VER 2.0 완료 (2026-01-09)
- ✅ **브랜딩 업데이트**: "Connect Four BY KEVIN" 브랜드 적용
- ✅ **UI/UX 개선**:
  - 메인 타이틀 폰트 크기 최적화
  - 게임 설명 텍스트 추가
  - 뒤로가기 버튼 아이콘화 (←)
  - 불필요한 방 ID 복사 버튼 제거
- ✅ **프로젝트 구조 정리**:
  - 폴더명 변경: `c_omok` → `Connect-Four`
  - GitHub 레포지토리명 변경: `cross_omok` → `Connect-Four`
- ✅ **Railway 배포**: 자동 배포 설정 및 운영 중
- ✅ **README 최신화**: 모든 변경사항 문서화 완료

### VER 2.0 주요 기능 (이전 완료)
- ✅ 2클릭 확인 시스템
- ✅ 승리 수 하이라이트
- ✅ 마지막 수 표시
- ✅ 턴 인디케이터 화살표
- ✅ 승리/패배 배너
- ✅ 상호 재대결 확인
- ✅ 아이폰 최적화
- ✅ 방 목록 기능
- ✅ 턴 타이머 (10/20/30초)
- ✅ 선공 결정 룰렛

### VER 1.0 기본 기능
- ✅ 실시간 멀티플레이어
- ✅ Socket.io WebSocket 연결
- ✅ 게임 로직 구현
- ✅ 반응형 디자인
- ✅ Railway 배포

### 향후 계획

#### 데이터베이스 설계 (완료 ✅)
- ✅ Supabase PostgreSQL 데이터베이스 스키마 설계 완료
- ✅ 7개 테이블 + 자동화 트리거 시스템 구축
- ✅ 40개 칭호 데이터 생성 완료
- ✅ 10개 마이그레이션 파일 작성
- ✅ RLS (Row Level Security) 정책 설정
- ✅ 자동 통계 집계 시스템 구현
- 📄 상세 설계 문서: `.taskmaster/docs/database-design.md`
- 📄 설정 가이드: `.taskmaster/docs/SUPABASE_SETUP.md`

#### 다음 구현 단계
- 🔲 구글 로그인 기능 (NextAuth.js + Supabase)
- 🔲 게임 결과 저장 API 구현
- 🔲 리더보드 UI 개발 (실시간 순위)
- 🔲 칭호 시스템 UI (40개 칭호 표시/획득)
- 🔲 게임 모드 선택 (AI 연습/랭킹, 플레이어 랭킹)
- 🔲 프로필 페이지 (통계, 전적, 연승 기록)
- 🔲 무르기 버튼 (연습 모드 전용)


## 개발자

**Connect Four BY KEVIN**
Created with Next.js, Socket.io, and TypeScript by Kevin
