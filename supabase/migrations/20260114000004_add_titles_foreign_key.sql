-- Migration: Add foreign key from users to titles
-- Created: 2026-01-14
-- Description: Link current_title_id in users table to titles table

ALTER TABLE users
ADD CONSTRAINT fk_users_current_title
FOREIGN KEY (current_title_id) REFERENCES titles(id) ON DELETE SET NULL;

-- Index for foreign key
CREATE INDEX idx_users_current_title_id ON users(current_title_id) WHERE current_title_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.current_title_id IS 'User selected display title (foreign key to titles.id)';
