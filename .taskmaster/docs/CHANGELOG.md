# Connect-Four 개발 변경 이력

최종 업데이트: 2026-01-16

---

## 2026-01-16 세션 작업 내역

### 1. 로그인 상태 유지 문제 해결

**문제**: 로그인 후 페이지 새로고침하면 로그아웃됨

**원인**: OAuth 콜백이 서버에서 처리되면서 쿠키를 설정했지만, 클라이언트 Supabase는 localStorage를 사용하여 세션 동기화 안됨

**해결**:
- `@supabase/ssr` 패키지 설치
- 쿠키 기반 세션 관리로 통일

**변경 파일**:
- `package.json` - @supabase/ssr 추가
- `lib/supabase.ts` - `createBrowserClient` 사용으로 변경
- `lib/supabase-server.ts` (신규) - 서버용 클라이언트
- `middleware.ts` (신규) - 세션 자동 갱신
- `app/auth/callback/route.ts` - @supabase/ssr 사용
- `contexts/AuthContext.tsx` - `getUser()` 사용, 이벤트 처리 개선

**커밋**: `12fa947`

---

### 2. 페이지 네비게이션 무한 로딩 문제

**문제**: 랭킹탭 → 프로필탭 → 랭킹탭 이동 시 로딩이 멈추지 않음

**원인**: 비동기 요청 완료 전 컴포넌트 unmount 시 상태 업데이트 시도

**해결**:
- `mountedRef` 추가하여 unmount 후 상태 업데이트 방지

**변경 파일**:
- `app/ranking/page.tsx`
- `app/profile/page.tsx`

**커밋**: `9c25fad`

---

### 3. 중복 사용자 생성 방지

**문제**: 같은 이메일로 여러 사용자가 생성됨 (랭킹에 동일인 중복 표시)

**원인**: 사용자 조회 시 ID로만 체크, 이메일 체크 없음

**해결**:
- ID로 먼저 조회
- 없으면 이메일로도 조회 (중복 방지)
- 이메일로 기존 사용자 발견 시 ID만 업데이트

**변경 파일**:
- `contexts/AuthContext.tsx` - `fetchOrCreateDbUser` 함수 수정

**커밋**: `4914022`

---

### 4. 연승 표시 오류 수정

**문제**: 1패 했는데 "1연승" 표시됨

**원인**: `current_streak`만 확인하고 `current_streak_type` 확인 안함

**해결**:
- `currentStreakType === 'win'` 조건 추가
- 패배/무승부 연속일 때는 연승 표시 안함

**변경 파일**:
- `app/profile/page.tsx`

**커밋**: `6604f92`

---

### 5. PvP 게임 결과 DB 저장 문제

**문제**: 사람 VS 사람 대전에서 경기 종료해도 DB에 저장 안됨

**원인**: 로그인 상태가 유지되지 않아서 `isLoggedIn`이 false

**해결**:
- 로그인 상태 유지 문제 해결로 자동 해결
- `updateGameStats` 함수에 인증 확인 및 상세 로깅 추가

**변경 파일**:
- `lib/supabase.ts` - updateGameStats 함수 개선
- `app/page.tsx` - gameOver, timeOver 이벤트에 디버깅 로그 추가

**커밋**: `12fa947`

---

## DB 관리 쿼리

### 통계 및 중복 사용자 초기화

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 1. 통계 테이블 초기화
TRUNCATE TABLE user_statistics;

-- 2. 획득 칭호 초기화
TRUNCATE TABLE user_titles;

-- 3. 중복 users 확인
SELECT email, COUNT(*) as cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. 중복 users 삭제 (가장 오래된 것만 유지)
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
    FROM users
  ) t WHERE rn > 1
);

-- 5. 남은 users 확인
SELECT id, email, display_name, created_at FROM users ORDER BY created_at;
```

---

## 현재 아키텍처

### 인증 흐름
```
사용자 로그인
  ↓
Supabase Auth (이메일/Google OAuth)
  ↓
@supabase/ssr 쿠키 기반 세션 관리
  ↓
middleware.ts (세션 자동 갱신)
  ↓
AuthContext.tsx (사용자 상태 관리)
  ↓
fetchOrCreateDbUser (ID/이메일 중복 체크)
```

### 게임 결과 저장 흐름
```
게임 종료 (Socket.io: gameOver / timeOver)
  ↓
page.tsx 이벤트 핸들러
  ↓
userRef.current / isLoggedInRef.current 확인
  ↓
gameResultProcessedRef 중복 저장 방지
  ↓
updateGameStats(userId, gameModeKey, result)
  ↓
supabase.auth.getUser() 인증 확인
  ↓
user_statistics 테이블 INSERT/UPDATE
```

### 랭킹 조회 흐름
```
랭킹 페이지 로드
  ↓
user_statistics + users 실시간 조인
  ↓
win_rate 기준 정렬, 상위 50명
  ↓
(leaderboard_cache는 현재 미사용)
```

---

## 주요 파일 역할

| 파일 | 역할 |
|------|------|
| `lib/supabase.ts` | 브라우저용 Supabase 클라이언트, DB 타입, updateGameStats |
| `lib/supabase-server.ts` | 서버용 Supabase 클라이언트 |
| `middleware.ts` | 세션 자동 갱신 |
| `contexts/AuthContext.tsx` | 인증 상태 관리, 로그인/로그아웃 |
| `app/auth/callback/route.ts` | OAuth 콜백 처리 |
| `app/page.tsx` | 메인 게임 페이지, Socket.io 이벤트 |
| `app/ranking/page.tsx` | 랭킹 페이지 |
| `app/profile/page.tsx` | 프로필 페이지 |
| `app/achievements/page.tsx` | 업적 페이지 |

---

## 다음 작업 시 참고사항

1. **로그인 관련 수정 시**: `AuthContext.tsx`의 `fetchOrCreateDbUser` 확인
2. **게임 결과 저장 관련**: `page.tsx`의 gameOver/timeOver 핸들러 확인
3. **랭킹 관련**: `ranking/page.tsx` - 현재 실시간 조인 사용
4. **DB 스키마 변경 시**: `supabase/migrations/` 폴더에 마이그레이션 파일 추가
5. **세션 문제 발생 시**: `middleware.ts`, `@supabase/ssr` 설정 확인

---

## Git 커밋 히스토리 (최신순)

```
6604f92 Fix streak display to only show win streaks
4914022 Prevent duplicate users by checking email before creating
9c25fad Fix page navigation causing infinite loading
12fa947 Fix session persistence and PvP game result saving
4b36c24 Fix login not working after modal closes
937f4c8 Fix login modal stuck on loading state
0187dd3 Fix achievements page condition_json mapping
d38d13b Fix DB integration for stats, profile, achievements, and ranking
9faa626 Fix game mode keys to match existing DB schema
```
