# Connect-Four Supabase Database Design
## 전문가 수준 데이터베이스 설계 문서

> **목표**: 에러 없는 안정적인 데이터베이스 구조 설계
> **DB**: Supabase (PostgreSQL 15+)
> **설계 원칙**: 정규화, 데이터 무결성, 성능 최적화, 확장성

---

## 📊 데이터베이스 아키텍처 개요

### 핵심 설계 원칙
1. **제3정규형(3NF) 준수** - 데이터 중복 최소화
2. **참조 무결성** - 모든 외래 키에 적절한 제약 조건
3. **인덱싱 전략** - 쿼리 성능 최적화
4. **타임스탬프 추적** - 모든 테이블에 created_at, updated_at
5. **소프트 삭제** - 중요 데이터는 deleted_at으로 표시
6. **트리거 활용** - 자동 통계 업데이트 및 데이터 검증

---

## 🗂️ 테이블 스키마 설계

### 1. users (사용자)
**목적**: 구글 OAuth로 인증된 사용자 정보 저장

```sql
CREATE TABLE users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication (Google OAuth)
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(320) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,

  -- Profile Information
  display_name VARCHAR(100) NOT NULL,
  photo_url TEXT,

  -- Title System
  current_title_id INTEGER,

  -- Account Status
  is_active BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 100)
);

-- Indexes for Performance
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. game_modes (게임 모드 정의)
**목적**: 게임 모드 유형을 정규화하여 관리

```sql
CREATE TABLE game_modes (
  id SERIAL PRIMARY KEY,
  mode_key VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Mode Settings
  has_time_limit BOOLEAN DEFAULT true,
  time_limit_seconds INTEGER,
  allows_undo BOOLEAN DEFAULT false,
  affects_ranking BOOLEAN DEFAULT true,

  -- Opponent Type
  opponent_type VARCHAR(20) NOT NULL CHECK (opponent_type IN ('ai', 'player')),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert Default Game Modes
INSERT INTO game_modes (mode_key, display_name, description, has_time_limit, time_limit_seconds, allows_undo, affects_ranking, opponent_type) VALUES
('ai-practice', 'AI 연습 모드', 'AI와 연습 게임 (무르기 가능, 시간 제한 없음, 랭킹 미반영)', false, NULL, true, false, 'ai'),
('ai-ranked', 'AI 랭킹 모드', 'AI와 랭킹 게임 (30초 시간 제한, 랭킹 반영)', true, 30, false, true, 'ai'),
('player-ranked', '플레이어 랭킹 모드', '다른 플레이어와 랭킹 게임 (30초 시간 제한, 랭킹 반영)', true, 30, false, true, 'player');

-- Index
CREATE INDEX idx_game_modes_key ON game_modes(mode_key);
CREATE INDEX idx_game_modes_active ON game_modes(is_active) WHERE is_active = true;
```

---

### 3. game_results (게임 결과)
**목적**: 모든 게임의 결과를 상세히 기록

```sql
CREATE TABLE game_results (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player Information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Game Details
  game_mode_id INTEGER NOT NULL REFERENCES game_modes(id) ON DELETE RESTRICT,

  -- Result
  result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'draw', 'lose')),

  -- Game Metadata
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  total_moves INTEGER CHECK (total_moves >= 0 AND total_moves <= 42),

  -- Player Stats (for this specific game)
  user_color VARCHAR(10) CHECK (user_color IN ('red', 'yellow')),
  went_first BOOLEAN,

  -- Room Information
  room_id VARCHAR(10),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT check_opponent_logic CHECK (
    (game_mode_id IN (SELECT id FROM game_modes WHERE opponent_type = 'ai') AND opponent_user_id IS NULL)
    OR
    (game_mode_id IN (SELECT id FROM game_modes WHERE opponent_type = 'player') AND opponent_user_id IS NOT NULL)
  )
);

-- Indexes for High-Performance Queries
CREATE INDEX idx_game_results_user_id ON game_results(user_id);
CREATE INDEX idx_game_results_opponent_user_id ON game_results(opponent_user_id) WHERE opponent_user_id IS NOT NULL;
CREATE INDEX idx_game_results_game_mode_id ON game_results(game_mode_id);
CREATE INDEX idx_game_results_created_at ON game_results(created_at DESC);
CREATE INDEX idx_game_results_result ON game_results(result);

-- Composite Index for Statistics Queries
CREATE INDEX idx_game_results_user_mode_result ON game_results(user_id, game_mode_id, result);
CREATE INDEX idx_game_results_user_created ON game_results(user_id, created_at DESC);
```

---

### 4. user_statistics (사용자 통계)
**목적**: 게임 모드별 통계를 실시간으로 집계 (비정규화된 캐시 테이블)

```sql
CREATE TABLE user_statistics (
  -- Composite Primary Key
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode_id INTEGER NOT NULL REFERENCES game_modes(id) ON DELETE CASCADE,

  -- Statistics
  total_games INTEGER DEFAULT 0 CHECK (total_games >= 0),
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  draws INTEGER DEFAULT 0 CHECK (draws >= 0),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0),

  -- Calculated Fields
  win_rate NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN total_games > 0 THEN ROUND((wins::NUMERIC / total_games::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- Streaks
  current_streak INTEGER DEFAULT 0,
  current_streak_type VARCHAR(10) CHECK (current_streak_type IN ('win', 'draw', 'lose', NULL)),
  best_win_streak INTEGER DEFAULT 0 CHECK (best_win_streak >= 0),
  best_win_streak_date TIMESTAMPTZ,

  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  PRIMARY KEY (user_id, game_mode_id),
  CONSTRAINT stats_consistency CHECK (total_games = wins + draws + losses)
);

-- Indexes
CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX idx_user_statistics_win_rate ON user_statistics(win_rate DESC);
CREATE INDEX idx_user_statistics_total_games ON user_statistics(total_games DESC);
CREATE INDEX idx_user_statistics_best_streak ON user_statistics(best_win_streak DESC);

-- Trigger for updated_at
CREATE TRIGGER user_statistics_updated_at
BEFORE UPDATE ON user_statistics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### 5. titles (칭호)
**목적**: 30개 이상의 칭호 데이터 및 획득 조건 정의

```sql
CREATE TABLE titles (
  id SERIAL PRIMARY KEY,

  -- Title Information
  title_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- Category
  category VARCHAR(30) NOT NULL CHECK (category IN ('win_rate', 'ai_wins', 'streak', 'total_games', 'special')),

  -- Rarity
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  -- Acquisition Condition (JSON)
  condition_json JSONB NOT NULL,

  -- Display
  icon_url TEXT,
  color_hex VARCHAR(7),

  -- Order and Status
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT color_hex_format CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$' OR color_hex IS NULL)
);

-- Indexes
CREATE INDEX idx_titles_category ON titles(category);
CREATE INDEX idx_titles_rarity ON titles(rarity);
CREATE INDEX idx_titles_active ON titles(is_active) WHERE is_active = true;
CREATE INDEX idx_titles_display_order ON titles(display_order ASC);

-- GIN Index for JSONB queries
CREATE INDEX idx_titles_condition ON titles USING GIN (condition_json);
```

---

### 6. user_titles (사용자 칭호 획득 기록)
**목적**: 사용자가 획득한 칭호 추적 (다대다 관계)

```sql
CREATE TABLE user_titles (
  -- Composite Primary Key
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,

  -- Acquisition
  acquired_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Notification Status
  notification_sent BOOLEAN DEFAULT false,
  notification_read BOOLEAN DEFAULT false,

  PRIMARY KEY (user_id, title_id)
);

-- Indexes
CREATE INDEX idx_user_titles_user_id ON user_titles(user_id);
CREATE INDEX idx_user_titles_title_id ON user_titles(title_id);
CREATE INDEX idx_user_titles_acquired_at ON user_titles(acquired_at DESC);
CREATE INDEX idx_user_titles_unread ON user_titles(user_id, notification_read) WHERE notification_read = false;

-- Foreign Key for current_title_id in users table
ALTER TABLE users
ADD CONSTRAINT fk_users_current_title
FOREIGN KEY (current_title_id) REFERENCES titles(id) ON DELETE SET NULL;
```

---

### 7. leaderboard_cache (리더보드 캐시)
**목적**: 리더보드 조회 성능 최적화를 위한 materialized view 대체 테이블

```sql
CREATE TABLE leaderboard_cache (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode_id INTEGER NOT NULL REFERENCES game_modes(id) ON DELETE CASCADE,

  -- Rankings
  rank INTEGER NOT NULL,

  -- Stats
  total_games INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  win_rate NUMERIC(5, 2) NOT NULL,

  -- User Info (denormalized for performance)
  display_name VARCHAR(100) NOT NULL,
  photo_url TEXT,
  current_title_name VARCHAR(100),

  -- Refresh Metadata
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE (user_id, game_mode_id)
);

-- Indexes
CREATE INDEX idx_leaderboard_cache_game_mode ON leaderboard_cache(game_mode_id);
CREATE INDEX idx_leaderboard_cache_rank ON leaderboard_cache(game_mode_id, rank ASC);
CREATE INDEX idx_leaderboard_cache_win_rate ON leaderboard_cache(game_mode_id, win_rate DESC);
CREATE INDEX idx_leaderboard_cache_refreshed ON leaderboard_cache(last_refreshed_at DESC);
```

---

## 🔄 자동화 트리거 및 함수

### 게임 결과 저장 시 통계 자동 업데이트

```sql
CREATE OR REPLACE FUNCTION update_user_statistics_on_game_result()
RETURNS TRIGGER AS $$
DECLARE
  v_current_streak INTEGER;
  v_streak_type VARCHAR(10);
BEGIN
  -- Insert or Update user_statistics
  INSERT INTO user_statistics (user_id, game_mode_id, total_games, wins, draws, losses)
  VALUES (
    NEW.user_id,
    NEW.game_mode_id,
    1,
    CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
    CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
    CASE WHEN NEW.result = 'lose' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, game_mode_id)
  DO UPDATE SET
    total_games = user_statistics.total_games + 1,
    wins = user_statistics.wins + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
    draws = user_statistics.draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
    losses = user_statistics.losses + CASE WHEN NEW.result = 'lose' THEN 1 ELSE 0 END,

    -- Update Streak
    current_streak = CASE
      WHEN user_statistics.current_streak_type = NEW.result THEN user_statistics.current_streak + 1
      ELSE 1
    END,
    current_streak_type = NEW.result,

    -- Update Best Win Streak
    best_win_streak = CASE
      WHEN NEW.result = 'win' AND (
        user_statistics.current_streak_type = 'win' AND user_statistics.current_streak + 1 > user_statistics.best_win_streak
      ) THEN user_statistics.current_streak + 1
      WHEN NEW.result = 'win' AND user_statistics.current_streak_type != 'win' AND 1 > user_statistics.best_win_streak THEN 1
      ELSE user_statistics.best_win_streak
    END,
    best_win_streak_date = CASE
      WHEN NEW.result = 'win' AND (
        (user_statistics.current_streak_type = 'win' AND user_statistics.current_streak + 1 > user_statistics.best_win_streak)
        OR (user_statistics.current_streak_type != 'win' AND 1 > user_statistics.best_win_streak)
      ) THEN NOW()
      ELSE user_statistics.best_win_streak_date
    END,

    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_result_update_statistics
AFTER INSERT ON game_results
FOR EACH ROW
EXECUTE FUNCTION update_user_statistics_on_game_result();
```

---

### 칭호 자동 부여 함수

```sql
CREATE OR REPLACE FUNCTION check_and_award_titles(p_user_id UUID, p_game_mode_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_title RECORD;
BEGIN
  -- Get user statistics
  SELECT * INTO v_stats
  FROM user_statistics
  WHERE user_id = p_user_id AND game_mode_id = p_game_mode_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check each active title condition
  FOR v_title IN
    SELECT id, title_key, condition_json
    FROM titles
    WHERE is_active = true
  LOOP
    -- Check if title not already awarded
    IF NOT EXISTS (
      SELECT 1 FROM user_titles WHERE user_id = p_user_id AND title_id = v_title.id
    ) THEN
      -- Evaluate condition (simplified - actual implementation would parse JSON)
      -- Example: {"type": "win_rate", "min": 60}
      -- Example: {"type": "total_games", "min": 100}
      -- Example: {"type": "streak", "min": 5}

      -- Insert if condition met (condition evaluation logic would go here)
      -- This is a placeholder - actual implementation needs JSON condition parsing
      NULL;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_select_own ON users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY users_update_own ON users
FOR UPDATE
USING (auth.uid() = id);

-- Users can read their own game results
CREATE POLICY game_results_select_own ON game_results
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own game results
CREATE POLICY game_results_insert_own ON game_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can read their own statistics
CREATE POLICY user_statistics_select_own ON user_statistics
FOR SELECT
USING (auth.uid() = user_id);

-- Public read for leaderboard
CREATE POLICY leaderboard_cache_select_all ON leaderboard_cache
FOR SELECT
TO authenticated
USING (true);
```

---

## 📈 성능 최적화 전략

### 1. 파티셔닝 (선택사항 - 데이터가 많아질 경우)
```sql
-- game_results를 월별로 파티셔닝 (데이터가 수백만 건 이상일 때)
-- CREATE TABLE game_results_2026_01 PARTITION OF game_results
-- FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 2. 정기적 통계 갱신
```sql
-- Analyze tables regularly for query optimization
ANALYZE users;
ANALYZE game_results;
ANALYZE user_statistics;
```

### 3. 리더보드 캐시 새로고침
```sql
-- Refresh leaderboard cache (run periodically, e.g., every 5 minutes)
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS VOID AS $$
BEGIN
  TRUNCATE TABLE leaderboard_cache;

  INSERT INTO leaderboard_cache (user_id, game_mode_id, rank, total_games, wins, win_rate, display_name, photo_url, current_title_name, last_refreshed_at)
  SELECT
    us.user_id,
    us.game_mode_id,
    RANK() OVER (PARTITION BY us.game_mode_id ORDER BY us.win_rate DESC, us.total_games DESC) as rank,
    us.total_games,
    us.wins,
    us.win_rate,
    u.display_name,
    u.photo_url,
    t.display_name as current_title_name,
    NOW()
  FROM user_statistics us
  JOIN users u ON us.user_id = u.id
  LEFT JOIN titles t ON u.current_title_id = t.id
  WHERE u.is_active = true
    AND us.total_games >= 5  -- Minimum games for leaderboard
  ORDER BY us.game_mode_id, rank;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ 데이터 무결성 체크리스트

- [x] 모든 외래 키에 적절한 ON DELETE 동작 정의
- [x] CHECK 제약 조건으로 데이터 유효성 검증
- [x] UNIQUE 제약 조건으로 중복 방지
- [x] NOT NULL 제약 조건으로 필수 필드 보장
- [x] 타임스탬프 자동 업데이트 트리거
- [x] 통계 자동 갱신 트리거
- [x] 적절한 인덱싱으로 조회 성능 최적화
- [x] Row Level Security로 데이터 접근 제어
- [x] 생성된 열(GENERATED ALWAYS AS)로 계산 필드 자동화

---

## 🚀 마이그레이션 순서

1. `users` 테이블 생성
2. `game_modes` 테이블 생성 및 초기 데이터 삽입
3. `titles` 테이블 생성 및 30개 칭호 데이터 삽입
4. `game_results` 테이블 생성
5. `user_statistics` 테이블 생성
6. `user_titles` 테이블 생성
7. `leaderboard_cache` 테이블 생성
8. 트리거 및 함수 생성
9. RLS 정책 적용
10. 인덱스 최종 확인

---

## 📊 예상 데이터 볼륨 및 확장성

- **Users**: ~100K (100,000명)
- **Game Results**: ~10M/year (연간 1천만 게임)
- **User Statistics**: ~300K (사용자당 평균 3개 모드)
- **Titles**: ~50개
- **User Titles**: ~5M (사용자당 평균 50개 칭호 획득)
- **Leaderboard Cache**: ~300K (실시간 갱신)

**확장 전략**:
- 게임 결과 테이블 파티셔닝 (월별/년별)
- 읽기 복제본 사용
- Redis 캐싱 레이어 추가 (리더보드, 통계)
- CDN을 통한 정적 데이터 제공

---

## 🔍 쿼리 예제

### 사용자 전체 통계 조회
```sql
SELECT
  u.display_name,
  gm.display_name as mode_name,
  us.total_games,
  us.wins,
  us.draws,
  us.losses,
  us.win_rate,
  us.current_streak,
  us.current_streak_type,
  us.best_win_streak
FROM user_statistics us
JOIN users u ON us.user_id = u.id
JOIN game_modes gm ON us.game_mode_id = gm.id
WHERE u.id = 'user-uuid-here';
```

### 게임 모드별 리더보드 TOP 100
```sql
SELECT
  rank,
  display_name,
  current_title_name,
  photo_url,
  total_games,
  wins,
  win_rate
FROM leaderboard_cache
WHERE game_mode_id = 2  -- ai-ranked
ORDER BY rank ASC
LIMIT 100;
```

### 사용자 획득 칭호 목록
```sql
SELECT
  t.display_name,
  t.description,
  t.category,
  t.rarity,
  ut.acquired_at
FROM user_titles ut
JOIN titles t ON ut.title_id = t.id
WHERE ut.user_id = 'user-uuid-here'
ORDER BY ut.acquired_at DESC;
```

---

## 📝 다음 단계

1. ✅ Supabase 프로젝트 생성
2. ✅ 마이그레이션 파일 작성
3. ✅ 30개 칭호 데이터 준비
4. ✅ API 엔드포인트 개발
5. ✅ 프론트엔드 통합

---

**작성일**: 2026-01-14
**작성자**: Database Architecture Team
**버전**: 1.0
**리뷰 상태**: Ready for Implementation
