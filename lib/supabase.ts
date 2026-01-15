import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables - EXACTLY matching DB schema

// users table (20260114000001)
export interface DbUser {
  id: string;                    // UUID PRIMARY KEY
  google_id: string;             // VARCHAR(255) UNIQUE NOT NULL
  email: string;                 // VARCHAR(320) UNIQUE NOT NULL
  email_verified: boolean;       // BOOLEAN DEFAULT false
  display_name: string;          // VARCHAR(100) NOT NULL
  photo_url: string | null;      // TEXT
  current_title_id: number | null; // INTEGER (FK to titles)
  is_active: boolean;            // BOOLEAN DEFAULT true
  is_banned: boolean;            // BOOLEAN DEFAULT false
  ban_reason: string | null;     // TEXT
  created_at: string;            // TIMESTAMPTZ
  updated_at: string;            // TIMESTAMPTZ
  last_login_at: string | null;  // TIMESTAMPTZ (nullable)
  deleted_at: string | null;     // TIMESTAMPTZ
}

// user_statistics table (20260114000006)
export interface DbUserStatistics {
  user_id: string;               // UUID (PK part 1)
  game_mode_id: number;          // INTEGER (PK part 2)
  total_games: number;           // INTEGER DEFAULT 0
  wins: number;                  // INTEGER DEFAULT 0
  draws: number;                 // INTEGER DEFAULT 0
  losses: number;                // INTEGER DEFAULT 0
  win_rate: number;              // NUMERIC(5,2) GENERATED
  current_streak: number;        // INTEGER DEFAULT 0
  current_streak_type: 'win' | 'draw' | 'lose' | null; // VARCHAR(10)
  best_win_streak: number;       // INTEGER DEFAULT 0
  best_win_streak_date: string | null; // TIMESTAMPTZ
  updated_at: string;            // TIMESTAMPTZ
}

// titles table (20260114000003)
export interface DbTitle {
  id: number;                    // SERIAL PRIMARY KEY
  title_key: string;             // VARCHAR(100) UNIQUE NOT NULL
  display_name: string;          // VARCHAR(100) NOT NULL
  description: string;           // TEXT NOT NULL
  category: 'win_rate' | 'ai_wins' | 'streak' | 'total_games' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition_json: Record<string, unknown>; // JSONB NOT NULL
  icon_url: string | null;       // TEXT
  color_hex: string | null;      // VARCHAR(7)
  display_order: number;         // INTEGER DEFAULT 0
  is_active: boolean;            // BOOLEAN DEFAULT true
  created_at: string;            // TIMESTAMPTZ
}

// user_titles table (20260114000007)
export interface DbUserTitle {
  user_id: string;               // UUID (PK part 1)
  title_id: number;              // INTEGER (PK part 2)
  acquired_at: string;           // TIMESTAMPTZ DEFAULT NOW() - NOT earned_at!
  notification_sent: boolean;    // BOOLEAN DEFAULT false
  notification_read: boolean;    // BOOLEAN DEFAULT false
}

// leaderboard_cache table (20260114000008)
export interface DbLeaderboardCache {
  id: number;                    // SERIAL PRIMARY KEY
  user_id: string;               // UUID NOT NULL
  game_mode_id: number;          // INTEGER NOT NULL
  rank: number;                  // INTEGER NOT NULL
  total_games: number;           // INTEGER NOT NULL
  wins: number;                  // INTEGER NOT NULL
  win_rate: number;              // NUMERIC(5,2) NOT NULL
  display_name: string;          // VARCHAR(100) NOT NULL
  photo_url: string | null;      // TEXT
  current_title_name: string | null; // VARCHAR(100)
  last_refreshed_at: string;     // TIMESTAMPTZ
}

// game_modes table (20260114000002)
export interface DbGameMode {
  id: number;                    // SERIAL PRIMARY KEY
  mode_key: string;              // VARCHAR(50) UNIQUE NOT NULL
  display_name: string;          // VARCHAR(100) NOT NULL
  description: string | null;    // TEXT
  has_time_limit: boolean;       // BOOLEAN DEFAULT true
  time_limit_seconds: number | null; // INTEGER
  allows_undo: boolean;          // BOOLEAN DEFAULT false
  affects_ranking: boolean;      // BOOLEAN DEFAULT true
  opponent_type: 'ai' | 'player'; // VARCHAR(20) NOT NULL
  is_active: boolean;            // BOOLEAN DEFAULT true
  created_at: string;            // TIMESTAMPTZ
}
