-- Migration: Create triggers for automatic updates
-- Created: 2026-01-14
-- Description: Auto-update statistics when game results are inserted

-- ========================================
-- Trigger Function: Update user statistics on game result
-- ========================================

CREATE OR REPLACE FUNCTION update_user_statistics_on_game_result()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stats RECORD;
  v_new_streak INTEGER;
  v_new_best_streak INTEGER;
  v_new_best_streak_date TIMESTAMPTZ;
BEGIN
  -- Get current stats (if exists)
  SELECT * INTO v_current_stats
  FROM user_statistics
  WHERE user_id = NEW.user_id AND game_mode_id = NEW.game_mode_id;

  -- Calculate new streak
  IF v_current_stats IS NULL THEN
    -- First game for this mode
    v_new_streak := 1;
    v_new_best_streak := CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END;
    v_new_best_streak_date := CASE WHEN NEW.result = 'win' THEN NOW() ELSE NULL END;
  ELSE
    -- Check if streak continues
    IF v_current_stats.current_streak_type = NEW.result THEN
      v_new_streak := v_current_stats.current_streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;

    -- Update best win streak
    IF NEW.result = 'win' AND v_new_streak > v_current_stats.best_win_streak THEN
      v_new_best_streak := v_new_streak;
      v_new_best_streak_date := NOW();
    ELSE
      v_new_best_streak := v_current_stats.best_win_streak;
      v_new_best_streak_date := v_current_stats.best_win_streak_date;
    END IF;
  END IF;

  -- Insert or Update user_statistics
  INSERT INTO user_statistics (
    user_id,
    game_mode_id,
    total_games,
    wins,
    draws,
    losses,
    current_streak,
    current_streak_type,
    best_win_streak,
    best_win_streak_date,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.game_mode_id,
    1,
    CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
    CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
    CASE WHEN NEW.result = 'lose' THEN 1 ELSE 0 END,
    v_new_streak,
    NEW.result,
    v_new_best_streak,
    v_new_best_streak_date,
    NOW()
  )
  ON CONFLICT (user_id, game_mode_id)
  DO UPDATE SET
    total_games = user_statistics.total_games + 1,
    wins = user_statistics.wins + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
    draws = user_statistics.draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
    losses = user_statistics.losses + CASE WHEN NEW.result = 'lose' THEN 1 ELSE 0 END,
    current_streak = v_new_streak,
    current_streak_type = NEW.result,
    best_win_streak = v_new_best_streak,
    best_win_streak_date = v_new_best_streak_date,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to game_results table
CREATE TRIGGER game_result_update_statistics
AFTER INSERT ON game_results
FOR EACH ROW
EXECUTE FUNCTION update_user_statistics_on_game_result();


-- ========================================
-- Function: Refresh leaderboard cache
-- ========================================

CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS VOID AS $$
BEGIN
  -- Clear existing cache
  TRUNCATE TABLE leaderboard_cache;

  -- Rebuild cache
  INSERT INTO leaderboard_cache (
    user_id,
    game_mode_id,
    rank,
    total_games,
    wins,
    win_rate,
    display_name,
    photo_url,
    current_title_name,
    last_refreshed_at
  )
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


-- ========================================
-- Function: Check and award titles
-- ========================================

CREATE OR REPLACE FUNCTION check_and_award_titles(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_all_stats RECORD;
  v_title RECORD;
  v_condition JSONB;
  v_condition_type TEXT;
  v_min_value NUMERIC;
  v_max_value NUMERIC;
  v_min_games INTEGER;
  v_should_award BOOLEAN;
BEGIN
  -- Get aggregated stats across all modes
  SELECT
    SUM(total_games) as total_games,
    SUM(wins) as total_wins,
    SUM(wins) FILTER (WHERE game_mode_id IN (SELECT id FROM game_modes WHERE opponent_type = 'ai')) as ai_wins,
    MAX(best_win_streak) as best_streak,
    MAX(win_rate) as best_win_rate
  INTO v_all_stats
  FROM user_statistics
  WHERE user_id = p_user_id;

  -- Loop through all active titles
  FOR v_title IN
    SELECT id, title_key, condition_json
    FROM titles
    WHERE is_active = true
  LOOP
    -- Check if title already awarded
    IF EXISTS (
      SELECT 1 FROM user_titles WHERE user_id = p_user_id AND title_id = v_title.id
    ) THEN
      CONTINUE;  -- Skip already awarded titles
    END IF;

    v_condition := v_title.condition_json;
    v_condition_type := v_condition->>'type';
    v_should_award := false;

    -- Evaluate conditions based on type
    CASE v_condition_type
      WHEN 'win_rate' THEN
        v_min_value := (v_condition->>'min')::NUMERIC;
        v_max_value := COALESCE((v_condition->>'max')::NUMERIC, 100);
        v_min_games := COALESCE((v_condition->>'min_games')::INTEGER, 0);

        IF v_all_stats.best_win_rate >= v_min_value
           AND v_all_stats.best_win_rate <= v_max_value
           AND v_all_stats.total_games >= v_min_games THEN
          v_should_award := true;
        END IF;

      WHEN 'ai_wins' THEN
        v_min_value := (v_condition->>'min')::NUMERIC;
        IF v_all_stats.ai_wins >= v_min_value THEN
          v_should_award := true;
        END IF;

      WHEN 'streak' THEN
        v_min_value := (v_condition->>'min')::NUMERIC;
        IF v_all_stats.best_streak >= v_min_value THEN
          v_should_award := true;
        END IF;

      WHEN 'total_games' THEN
        v_min_value := (v_condition->>'min')::NUMERIC;
        IF v_all_stats.total_games >= v_min_value THEN
          v_should_award := true;
        END IF;

      -- Add more condition types as needed
      ELSE
        -- Unknown condition type, skip
        CONTINUE;
    END CASE;

    -- Award title if condition met
    IF v_should_award THEN
      INSERT INTO user_titles (user_id, title_id, acquired_at, notification_sent, notification_read)
      VALUES (p_user_id, v_title.id, NOW(), false, false)
      ON CONFLICT (user_id, title_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- Trigger: Auto-check titles after stat update
-- ========================================

CREATE OR REPLACE FUNCTION trigger_check_titles()
RETURNS TRIGGER AS $$
BEGIN
  -- Check titles asynchronously (after commit)
  PERFORM check_and_award_titles(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_statistics_check_titles
AFTER INSERT OR UPDATE ON user_statistics
FOR EACH ROW
EXECUTE FUNCTION trigger_check_titles();

-- Comment
COMMENT ON FUNCTION update_user_statistics_on_game_result() IS 'Auto-update user statistics when game result is inserted';
COMMENT ON FUNCTION refresh_leaderboard_cache() IS 'Rebuild leaderboard cache (run periodically)';
COMMENT ON FUNCTION check_and_award_titles(UUID) IS 'Check and award titles based on user statistics';
