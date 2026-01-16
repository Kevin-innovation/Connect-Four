'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, DbUserStatistics, DbTitle, DbLeaderboardCache } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, dbUser, isLoggedIn, openLoginModal, signOut } = useAuth();
  const [stats, setStats] = useState<DbUserStatistics | null>(null);
  const [currentTitle, setCurrentTitle] = useState<DbTitle | null>(null);
  const [ranking, setRanking] = useState<DbLeaderboardCache | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      if (!mountedRef.current) return;
      setIsLoading(true);

      try {
        // First get the game mode ID for ai-ranked
        const { data: gameModeData } = await supabase
          .from('game_modes')
          .select('id')
          .eq('mode_key', 'ai-ranked')
          .single();

        if (!mountedRef.current) return;

        const gameModeId = gameModeData?.id;

        // Fetch all user statistics (for all game modes)
        const { data: allStats } = await supabase
          .from('user_statistics')
          .select('*')
          .eq('user_id', user.id);

        if (!mountedRef.current) return;

        // Find the AI ranked stats or calculate totals
        let aiRankedStats = allStats?.find(s => s.game_mode_id === gameModeId) || null;

        // If no AI stats but has other stats, aggregate them
        if (!aiRankedStats && allStats && allStats.length > 0) {
          const totalStats = allStats.reduce((acc, s) => ({
            total_games: acc.total_games + (s.total_games || 0),
            wins: acc.wins + (s.wins || 0),
            losses: acc.losses + (s.losses || 0),
            draws: acc.draws + (s.draws || 0),
            current_streak: Math.max(acc.current_streak, s.current_streak || 0),
            best_win_streak: Math.max(acc.best_win_streak, s.best_win_streak || 0),
          }), { total_games: 0, wins: 0, losses: 0, draws: 0, current_streak: 0, best_win_streak: 0 });

          if (totalStats.total_games > 0) {
            aiRankedStats = {
              ...totalStats,
              win_rate: (totalStats.wins / totalStats.total_games) * 100,
              user_id: user.id,
              game_mode_id: gameModeId || 0,
            } as any;
          }
        }

        setStats(aiRankedStats);

        // Fetch current title if user has one
        if (dbUser?.current_title_id) {
          const { data: titleData } = await supabase
            .from('titles')
            .select('*')
            .eq('id', dbUser.current_title_id)
            .single();

          if (mountedRef.current) {
            setCurrentTitle(titleData || null);
          }
        }

        // Ranking is optional - leaderboard_cache may not be populated
        if (mountedRef.current) {
          setRanking(null);
        }

      } catch (err) {
        console.error('Error fetching profile data:', err);
      }

      if (mountedRef.current) {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user?.id, dbUser?.current_title_id]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="max-w-[500px] mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-500 mb-6">프로필을 보려면 로그인해주세요</p>
            <button
              onClick={openLoginModal}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="max-w-[500px] mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalGames = stats?.total_games || 0;
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const draws = stats?.draws || 0;
  const winRate = stats?.win_rate || 0;
  const currentStreak = stats?.current_streak || 0;
  const currentStreakType = stats?.current_streak_type || null;
  const bestStreak = stats?.best_win_streak || 0;
  const rank = ranking?.rank || '-';

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="max-w-[500px] mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4">
          {/* Profile Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.nickname}
                  className="w-24 h-24 rounded-full mx-auto mb-3 object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.nickname.charAt(0).toUpperCase()}
                </div>
              )}
              {ranking && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-yellow-900">
                  {rank}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{user?.nickname}</h1>
            {currentTitle && (
              <div
                className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: currentTitle.color_hex ? `${currentTitle.color_hex}20` : undefined,
                  color: currentTitle.color_hex || undefined,
                }}
              >
                {currentTitle.display_name}
              </div>
            )}
            {user?.email && (
              <p className="text-sm text-gray-500 mt-2">{user.email}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalGames}</div>
              <div className="text-xs text-gray-500">총 게임</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{winRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">승률</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">#{rank}</div>
              <div className="text-xs text-gray-500">랭킹</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{bestStreak}</div>
              <div className="text-xs text-gray-500">최대 연승</div>
            </div>
          </div>

          {/* Win/Loss/Draw */}
          {totalGames > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">전적</span>
                <span className="text-sm text-gray-500">{wins}승 {losses}패 {draws}무</span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div
                  className="bg-green-500"
                  style={{ width: `${(wins / totalGames) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(losses / totalGames) * 100}%` }}
                />
                <div
                  className="bg-gray-400"
                  style={{ width: `${(draws / totalGames) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-green-600">승리 {wins}</span>
                <span className="text-red-600">패배 {losses}</span>
                <span className="text-gray-500">무승부 {draws}</span>
              </div>
            </div>
          )}

          {/* Current Streak - 연승일 때만 표시 */}
          {currentStreak > 0 && currentStreakType === 'win' && (
            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-orange-700">현재 연승</div>
                  <div className="text-3xl font-bold text-orange-600">{currentStreak}연승</div>
                </div>
                <div className="text-4xl">🔥</div>
              </div>
            </div>
          )}

          {/* No games played message */}
          {totalGames === 0 && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-center">
              <p className="text-blue-600 font-medium">아직 플레이한 게임이 없습니다.</p>
              <p className="text-sm text-blue-500 mt-1">게임을 시작해 통계를 쌓아보세요!</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-red-600"
            >
              <span className="font-medium">로그아웃</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
