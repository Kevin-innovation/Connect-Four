-- Migration: Create leaderboard_cache table
-- Created: 2026-01-14
-- Description: Denormalized leaderboard cache for fast queries

CREATE TABLE IF NOT EXISTS leaderboard_cache (
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

-- RLS: Public read for leaderboard
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY leaderboard_cache_select_all ON leaderboard_cache
FOR SELECT
TO authenticated
USING (true);

-- Comment
COMMENT ON TABLE leaderboard_cache IS 'Denormalized leaderboard cache (refreshed periodically)';
