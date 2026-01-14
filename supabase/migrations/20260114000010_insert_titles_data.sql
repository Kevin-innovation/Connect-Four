-- Migration: Insert 40 titles data
-- Created: 2026-01-14
-- Description: Populate titles table with 40 achievement titles

-- ========================================
-- 1. 승률 기반 칭호 (10개)
-- ========================================

INSERT INTO titles (title_key, display_name, description, category, rarity, condition_json, color_hex, display_order) VALUES

-- Common (0-40%)
('beginner', '초보자', '게임을 시작한 신입 플레이어', 'win_rate', 'common', '{"type": "win_rate", "min": 0, "max": 40, "min_games": 5}', '#9CA3AF', 1),

-- Common (40-50%)
('novice', '입문자', '기초를 익히고 있는 플레이어', 'win_rate', 'common', '{"type": "win_rate", "min": 40, "max": 50, "min_games": 10}', '#A3A3A3', 2),

-- Rare (50-60%)
('skilled', '숙련자', '실력을 갖춘 플레이어', 'win_rate', 'rare', '{"type": "win_rate", "min": 50, "max": 60, "min_games": 20}', '#60A5FA', 3),

-- Rare (60-70%)
('expert', '전문가', '뛰어난 실력의 소유자', 'win_rate', 'rare', '{"type": "win_rate", "min": 60, "max": 70, "min_games": 30}', '#3B82F6', 4),

-- Epic (70-75%)
('master', '마스터', '최상위 실력의 플레이어', 'win_rate', 'epic', '{"type": "win_rate", "min": 70, "max": 75, "min_games": 50}', '#A855F7', 5),

-- Epic (75-80%)
('grandmaster', '그랜드마스터', '경지에 오른 플레이어', 'win_rate', 'epic', '{"type": "win_rate", "min": 75, "max": 80, "min_games": 75}', '#9333EA', 6),

-- Epic (80-85%)
('champion', '챔피언', '왕좌에 가까워진 자', 'win_rate', 'epic', '{"type": "win_rate", "min": 80, "max": 85, "min_games": 100}', '#7C3AED', 7),

-- Legendary (85-90%)
('legend', '전설', '전설로 남을 플레이어', 'win_rate', 'legendary', '{"type": "win_rate", "min": 85, "max": 90, "min_games": 150}', '#EF4444', 8),

-- Legendary (90-95%)
('mythic', '신화', '신화가 된 존재', 'win_rate', 'legendary', '{"type": "win_rate", "min": 90, "max": 95, "min_games": 200}', '#DC2626', 9),

-- Legendary (95-100%)
('immortal', '불멸자', '불멸의 전설', 'win_rate', 'legendary', '{"type": "win_rate", "min": 95, "max": 100, "min_games": 250}', '#B91C1C', 10);


-- ========================================
-- 2. AI 승리 수 기반 칭호 (8개)
-- ========================================

INSERT INTO titles (title_key, display_name, description, category, rarity, condition_json, color_hex, display_order) VALUES

-- Common
('ai_rookie', 'AI 도전자', 'AI에게 첫 승리를 거둔 플레이어', 'ai_wins', 'common', '{"type": "ai_wins", "min": 1}', '#9CA3AF', 11),

('ai_fighter', 'AI 전사', 'AI를 10번 격파한 플레이어', 'ai_wins', 'common', '{"type": "ai_wins", "min": 10}', '#A3A3A3', 12),

-- Rare
('ai_hunter', 'AI 헌터', 'AI를 50번 격파한 플레이어', 'ai_wins', 'rare', '{"type": "ai_wins", "min": 50}', '#60A5FA', 13),

('ai_slayer', 'AI 학살자', 'AI를 100번 격파한 플레이어', 'ai_wins', 'rare', '{"type": "ai_wins", "min": 100}', '#3B82F6', 14),

-- Epic
('ai_conqueror', 'AI 정복자', 'AI를 250번 격파한 플레이어', 'ai_wins', 'epic', '{"type": "ai_wins", "min": 250}', '#A855F7', 15),

('ai_destroyer', 'AI 파괴자', 'AI를 500번 격파한 플레이어', 'ai_wins', 'epic', '{"type": "ai_wins", "min": 500}', '#9333EA', 16),

-- Legendary
('ai_terminator', 'AI 종결자', 'AI를 1000번 격파한 전설', 'ai_wins', 'legendary', '{"type": "ai_wins", "min": 1000}', '#EF4444', 17),

('machine_god', '기계의 신', 'AI를 2000번 격파한 신', 'ai_wins', 'legendary', '{"type": "ai_wins", "min": 2000}', '#DC2626', 18);


-- ========================================
-- 3. 연승 기반 칭호 (7개)
-- ========================================

INSERT INTO titles (title_key, display_name, description, category, rarity, condition_json, color_hex, display_order) VALUES

-- Common
('streak_3', '연승 입문', '3연승을 달성한 플레이어', 'streak', 'common', '{"type": "streak", "min": 3}', '#9CA3AF', 19),

-- Rare
('streak_5', '연승 행진', '5연승을 달성한 플레이어', 'streak', 'rare', '{"type": "streak", "min": 5}', '#60A5FA', 20),

('streak_10', '무적의 전사', '10연승을 달성한 전사', 'streak', 'rare', '{"type": "streak", "min": 10}', '#3B82F6', 21),

-- Epic
('streak_15', '연승의 제왕', '15연승을 달성한 제왕', 'streak', 'epic', '{"type": "streak", "min": 15}', '#A855F7', 22),

('streak_20', '연승 머신', '20연승을 달성한 머신', 'streak', 'epic', '{"type": "streak", "min": 20}', '#9333EA', 23),

-- Legendary
('streak_30', '불패의 신화', '30연승을 달성한 신화', 'streak', 'legendary', '{"type": "streak", "min": 30}', '#EF4444', 24),

('streak_50', '연승의 신', '50연승을 달성한 신', 'streak', 'legendary', '{"type": "streak", "min": 50}', '#DC2626', 25);


-- ========================================
-- 4. 총 게임 수 기반 칭호 (6개)
-- ========================================

INSERT INTO titles (title_key, display_name, description, category, rarity, condition_json, color_hex, display_order) VALUES

-- Common
('games_10', '게임 입문', '10게임을 플레이한 플레이어', 'total_games', 'common', '{"type": "total_games", "min": 10}', '#9CA3AF', 26),

('games_50', '게임 애호가', '50게임을 플레이한 애호가', 'total_games', 'common', '{"type": "total_games", "min": 50}', '#A3A3A3', 27),

-- Rare
('games_100', '게임 중독자', '100게임을 플레이한 중독자', 'total_games', 'rare', '{"type": "total_games", "min": 100}', '#60A5FA', 28),

('games_500', '베테랑', '500게임을 플레이한 베테랑', 'total_games', 'rare', '{"type": "total_games", "min": 500}', '#3B82F6', 29),

-- Epic
('games_1000', '오목 마스터', '1000게임을 플레이한 마스터', 'total_games', 'epic', '{"type": "total_games", "min": 1000}', '#A855F7', 30),

-- Legendary
('games_5000', '평생 플레이어', '5000게임을 플레이한 전설', 'total_games', 'legendary', '{"type": "total_games", "min": 5000}', '#EF4444', 31);


-- ========================================
-- 5. 특수 조건 칭호 (9개)
-- ========================================

INSERT INTO titles (title_key, display_name, description, category, rarity, condition_json, color_hex, display_order) VALUES

-- Epic - 무패 연승
('perfectionist', '완벽주의자', '무패 10연승을 달성한 완벽주의자', 'special', 'epic', '{"type": "perfect_streak", "min": 10, "no_loss": true}', '#A855F7', 32),

-- Epic - 첫날 달성
('early_bird', '얼리버드', '가입 첫날 10승을 달성한 플레이어', 'special', 'epic', '{"type": "first_day_wins", "min": 10}', '#9333EA', 33),

-- Legendary - 100% 승률 유지
('flawless', '결함 없는 자', '50게임 이상 100% 승률 유지', 'special', 'legendary', '{"type": "flawless", "min_games": 50, "win_rate": 100}', '#EF4444', 34),

-- Rare - 빠른 승리
('speed_demon', '스피드 데몬', '평균 30초 이내 승리 20회', 'special', 'rare', '{"type": "fast_wins", "min": 20, "max_duration": 30}', '#60A5FA', 35),

-- Epic - 역전승
('comeback_king', '역전의 명수', '극적인 역전승 30회', 'special', 'epic', '{"type": "comeback_wins", "min": 30}', '#7C3AED', 36),

-- Common - 무승부 달인
('draw_master', '무승부 달인', '무승부 10회 달성', 'special', 'common', '{"type": "draws", "min": 10}', '#A3A3A3', 37),

-- Rare - 다양한 모드 플레이
('versatile_player', '만능 플레이어', '모든 게임 모드에서 10승 이상', 'special', 'rare', '{"type": "all_modes", "min_wins_per_mode": 10}', '#3B82F6', 38),

-- Legendary - 리더보드 1위
('number_one', '넘버원', '리더보드 1위 달성', 'special', 'legendary', '{"type": "leaderboard_rank", "rank": 1}', '#DC2626', 39),

-- Epic - 마라톤 플레이어
('marathon_player', '마라톤 플레이어', '하루 50게임 플레이', 'special', 'epic', '{"type": "daily_games", "min": 50}', '#9333EA', 40);


-- ========================================
-- 총 40개 칭호 생성 완료
-- ========================================

-- 카테고리별 집계:
-- - win_rate: 10개
-- - ai_wins: 8개
-- - streak: 7개
-- - total_games: 6개
-- - special: 9개

-- 희귀도별 집계:
-- - common: 9개
-- - rare: 12개
-- - epic: 12개
-- - legendary: 7개
