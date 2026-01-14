-- Migration: Create user_titles table
-- Created: 2026-01-14
-- Description: Junction table for user-title many-to-many relationship

CREATE TABLE IF NOT EXISTS user_titles (
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

-- Enable Row Level Security
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY user_titles_select_own ON user_titles
FOR SELECT
USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE user_titles IS 'User acquired titles (many-to-many relationship)';
