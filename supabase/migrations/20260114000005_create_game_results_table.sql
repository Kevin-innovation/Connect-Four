-- Migration: Create game_results table
-- Created: 2026-01-14
-- Description: Store all game results with detailed metadata

CREATE TABLE IF NOT EXISTS game_results (
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

-- Composite Indexes for Statistics Queries
CREATE INDEX idx_game_results_user_mode_result ON game_results(user_id, game_mode_id, result);
CREATE INDEX idx_game_results_user_created ON game_results(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY game_results_select_own ON game_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY game_results_insert_own ON game_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE game_results IS 'Detailed game result records for all matches';
