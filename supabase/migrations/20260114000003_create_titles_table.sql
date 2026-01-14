-- Migration: Create titles table
-- Created: 2026-01-14
-- Description: Store 40 achievement titles

CREATE TABLE IF NOT EXISTS titles (
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
CREATE INDEX idx_titles_condition ON titles USING GIN (condition_json);

-- Comment
COMMENT ON TABLE titles IS 'Achievement titles with acquisition conditions';
