-- Migration: Create user_statistics table
-- Created: 2026-01-14
-- Description: Aggregated user statistics per game mode (denormalized for performance)

CREATE TABLE IF NOT EXISTS user_statistics (
  -- Composite Primary Key
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_mode_id INTEGER NOT NULL REFERENCES game_modes(id) ON DELETE CASCADE,

  -- Statistics
  total_games INTEGER DEFAULT 0 CHECK (total_games >= 0),
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  draws INTEGER DEFAULT 0 CHECK (draws >= 0),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0),

  -- Calculated Win Rate (Stored Generated Column)
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

-- Enable Row Level Security
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY user_statistics_select_own ON user_statistics
FOR SELECT
USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE user_statistics IS 'Aggregated user statistics per game mode (auto-updated via triggers)';
