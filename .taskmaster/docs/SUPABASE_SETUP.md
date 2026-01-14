# Supabase 데이터베이스 설정 가이드

## 📋 개요
Connect-Four 게임의 사용자 인증, 게임 통계, 리더보드, 칭호 시스템을 위한 Supabase PostgreSQL 데이터베이스 설정 가이드입니다.

---

## 🚀 설정 순서

### 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `connect-four` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (안전하게 보관!)
   - **Region**: `Northeast Asia (Seoul)` (한국 사용자 대상)
   - **Pricing Plan**: Free tier (시작용)
4. "Create new project" 클릭 (생성 완료까지 약 2분 소요)

---

### 2. 프로젝트 환경 변수 설정

프로젝트가 생성되면 **Settings > API** 메뉴에서 다음 정보 확인:

```env
# .env.local 파일에 추가
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ 중요**: `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출하지 마세요!

---

### 3. 데이터베이스 마이그레이션 실행

#### 방법 1: Supabase SQL Editor 사용 (추천)

1. Supabase Dashboard에서 **SQL Editor** 메뉴 선택
2. "New query" 클릭
3. 다음 순서대로 마이그레이션 파일 내용을 복사하여 실행:

```
✅ 순서대로 실행하세요:

1. supabase/migrations/20260114000001_create_users_table.sql
2. supabase/migrations/20260114000002_create_game_modes_table.sql
3. supabase/migrations/20260114000003_create_titles_table.sql
4. supabase/migrations/20260114000004_add_titles_foreign_key.sql
5. supabase/migrations/20260114000005_create_game_results_table.sql
6. supabase/migrations/20260114000006_create_user_statistics_table.sql
7. supabase/migrations/20260114000007_create_user_titles_table.sql
8. supabase/migrations/20260114000008_create_leaderboard_cache_table.sql
9. supabase/migrations/20260114000009_create_triggers.sql
10. supabase/migrations/20260114000010_insert_titles_data.sql
```

각 파일을 실행한 후 "Run" 버튼 클릭 → 성공 메시지 확인

#### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치 (처음 한 번만)
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

---

### 4. 테이블 생성 확인

**Table Editor** 메뉴에서 다음 테이블들이 생성되었는지 확인:

- ✅ `users` - 사용자 정보
- ✅ `game_modes` - 게임 모드 (3개 데이터)
- ✅ `titles` - 칭호 (40개 데이터)
- ✅ `game_results` - 게임 결과
- ✅ `user_statistics` - 사용자 통계
- ✅ `user_titles` - 사용자 획득 칭호
- ✅ `leaderboard_cache` - 리더보드 캐시

---

### 5. Row Level Security (RLS) 확인

각 테이블에 RLS가 활성화되어 있는지 확인:

```sql
-- SQL Editor에서 실행하여 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

모든 테이블에서 `rowsecurity = true` 확인

---

### 6. Google OAuth 설정

#### 6.1 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services > Credentials** 메뉴
4. **Create Credentials > OAuth 2.0 Client ID** 선택
5. Application type: **Web application**
6. Authorized redirect URIs 추가:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
7. Client ID와 Client Secret 복사

#### 6.2 Supabase에 Google Provider 설정

1. Supabase Dashboard > **Authentication > Providers**
2. **Google** 클릭
3. "Enable Google Provider" 토글 ON
4. Google Client ID 입력
5. Google Client Secret 입력
6. "Save" 클릭

---

## 🔧 유틸리티 함수

### 리더보드 캐시 새로고침

리더보드는 자동으로 업데이트되지 않으므로 주기적으로 새로고침 필요:

```sql
-- SQL Editor에서 실행
SELECT refresh_leaderboard_cache();
```

**권장**: 5분마다 자동 실행하도록 설정 (cron job 또는 Edge Function)

---

### 사용자 칭호 수동 체크

```sql
-- 특정 사용자의 칭호 획득 조건 체크
SELECT check_and_award_titles('user-uuid-here');
```

**참고**: 게임 결과 저장 시 자동으로 실행됨

---

## 📊 데이터 확인 쿼리

### 게임 모드 확인
```sql
SELECT * FROM game_modes;
```

### 칭호 목록 확인
```sql
SELECT display_name, category, rarity, description
FROM titles
ORDER BY display_order;
```

### 사용자 통계 확인
```sql
SELECT
  u.display_name,
  gm.display_name as mode_name,
  us.total_games,
  us.wins,
  us.win_rate,
  us.current_streak,
  us.best_win_streak
FROM user_statistics us
JOIN users u ON us.user_id = u.id
JOIN game_modes gm ON us.game_mode_id = gm.id
ORDER BY us.win_rate DESC;
```

### 리더보드 TOP 10 확인
```sql
SELECT
  rank,
  display_name,
  current_title_name,
  total_games,
  wins,
  win_rate
FROM leaderboard_cache
WHERE game_mode_id = 2  -- ai-ranked
ORDER BY rank ASC
LIMIT 10;
```

---

## 🔐 보안 체크리스트

- [ ] RLS가 모든 테이블에 활성화됨
- [ ] Service Role Key는 서버 사이드에서만 사용
- [ ] Anon Key는 클라이언트에서 사용
- [ ] Google OAuth 설정 완료
- [ ] 환경 변수가 `.env.local`에 저장되고 `.gitignore`에 추가됨
- [ ] 프로덕션 배포 시 환경 변수 설정 (Vercel/Railway 등)

---

## 🧪 테스트 데이터 생성 (선택사항)

개발 중 테스트를 위해 더미 데이터 생성:

```sql
-- 테스트 사용자 생성 (실제 환경에서는 OAuth로만 생성)
INSERT INTO users (google_id, email, display_name, email_verified)
VALUES
  ('test-google-1', 'test1@example.com', '테스트유저1', true),
  ('test-google-2', 'test2@example.com', '테스트유저2', true);

-- 게임 결과 샘플 데이터
-- (실제로는 게임 종료 시 API에서 자동 생성)
```

---

## ⚠️ 문제 해결

### 마이그레이션 실패 시

1. **에러 메시지 확인**: SQL Editor에서 정확한 에러 확인
2. **순서 확인**: 마이그레이션 파일을 순서대로 실행했는지 확인
3. **롤백**: 테이블 삭제 후 재시도
   ```sql
   DROP TABLE IF EXISTS leaderboard_cache CASCADE;
   DROP TABLE IF EXISTS user_titles CASCADE;
   DROP TABLE IF EXISTS user_statistics CASCADE;
   DROP TABLE IF EXISTS game_results CASCADE;
   DROP TABLE IF EXISTS titles CASCADE;
   DROP TABLE IF EXISTS game_modes CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```

### RLS 정책 문제 시

```sql
-- 모든 RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)

---

**작성일**: 2026-01-14
**업데이트**: 2026-01-14
**버전**: 1.0
