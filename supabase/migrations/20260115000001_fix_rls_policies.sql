-- Migration: Fix RLS policies for user registration
-- Created: 2026-01-15
-- Description: Add INSERT policy to allow users to create their own records

-- ========================================
-- 1. Add INSERT policy for users table
-- ========================================

-- Allow authenticated users to insert their own record
CREATE POLICY users_insert_own ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. Add SELECT policy for public leaderboard access
-- ========================================

-- Allow anyone to view leaderboard_cache (for public ranking)
DROP POLICY IF EXISTS leaderboard_cache_select_all ON leaderboard_cache;
CREATE POLICY leaderboard_cache_select_all ON leaderboard_cache
FOR SELECT
USING (true);

-- ========================================
-- 3. Add SELECT policy for titles (public)
-- ========================================

DROP POLICY IF EXISTS titles_select_all ON titles;
CREATE POLICY titles_select_all ON titles
FOR SELECT
USING (true);

-- ========================================
-- 4. Add SELECT policy for game_modes (public)
-- ========================================

DROP POLICY IF EXISTS game_modes_select_all ON game_modes;
CREATE POLICY game_modes_select_all ON game_modes
FOR SELECT
USING (true);

-- ========================================
-- 5. Fix user_statistics policies
-- ========================================

-- Allow users to insert their own statistics
DROP POLICY IF EXISTS user_statistics_insert_own ON user_statistics;
CREATE POLICY user_statistics_insert_own ON user_statistics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own statistics
DROP POLICY IF EXISTS user_statistics_select_own ON user_statistics;
CREATE POLICY user_statistics_select_own ON user_statistics
FOR SELECT
USING (auth.uid() = user_id);

-- ========================================
-- 6. Fix user_titles policies
-- ========================================

-- Allow users to view their own titles
DROP POLICY IF EXISTS user_titles_select_own ON user_titles;
CREATE POLICY user_titles_select_own ON user_titles
FOR SELECT
USING (auth.uid() = user_id);

-- ========================================
-- IMPORTANT: Run this in Supabase SQL Editor
-- ========================================

COMMENT ON POLICY users_insert_own ON users IS 'Allow users to create their own record during signup';
