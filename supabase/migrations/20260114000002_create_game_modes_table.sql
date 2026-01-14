-- Migration: Create game_modes table
-- Created: 2026-01-14
-- Description: Define different game modes (AI practice, AI ranked, Player ranked)

CREATE TABLE IF NOT EXISTS game_modes (
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

-- Indexes
CREATE INDEX idx_game_modes_key ON game_modes(mode_key);
CREATE INDEX idx_game_modes_active ON game_modes(is_active) WHERE is_active = true;

-- Insert Default Game Modes
INSERT INTO game_modes (mode_key, display_name, description, has_time_limit, time_limit_seconds, allows_undo, affects_ranking, opponent_type) VALUES
('ai-practice', 'AI 연습 모드', 'AI와 연습 게임 (무르기 가능, 시간 제한 없음, 랭킹 미반영)', false, NULL, true, false, 'ai'),
('ai-ranked', 'AI 랭킹 모드', 'AI와 랭킹 게임 (30초 시간 제한, 랭킹 반영)', true, 30, false, true, 'ai'),
('player-ranked', '플레이어 랭킹 모드', '다른 플레이어와 랭킹 게임 (30초 시간 제한, 랭킹 반영)', true, 30, false, true, 'player');

-- Comment
COMMENT ON TABLE game_modes IS 'Game mode definitions with settings';
