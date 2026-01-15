'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, DbLeaderboardCache } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function RankingPage() {
  const { user, isLoggedIn } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'weekly' | 'monthly' | 'all'>('all');
  const [rankings, setRankings] = useState<DbLeaderboardCache[]>([]);
  const [myRanking, setMyRanking] = useState<DbLeaderboardCache | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);

    // Fetch top 50 rankings (game_mode_id = 2 is ai-ranked)
    const { data: leaderboardData, error } = await supabase
      .from('leaderboard_cache')
      .select('*')
      .eq('game_mode_id', 2) // ai-ranked mode
      .order('rank', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching rankings:', error);
      setIsLoading(false);
      return;
    }

    setRankings(leaderboardData || []);

    // Fetch my ranking if logged in
    if (user?.id) {
      const { data: myData } = await supabase
        .from('leaderboard_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_mode_id', 2)
        .single();

      setMyRanking(myData || null);
    }

    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'bg-yellow-400', text: 'text-yellow-900', icon: '🥇' };
    if (rank === 2) return { bg: 'bg-gray-300', text: 'text-gray-900', icon: '🥈' };
    if (rank === 3) return { bg: 'bg-amber-600', text: 'text-amber-100', icon: '🥉' };
    return { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="max-w-[500px] mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">랭킹</h1>

          {/* Tab Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            {[
              { id: 'weekly', label: '주간' },
              { id: 'monthly', label: '월간' },
              { id: 'all', label: '전체' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'weekly' | 'monthly' | 'all')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>아직 랭킹 데이터가 없습니다.</p>
              <p className="text-sm mt-2">게임을 플레이하면 랭킹에 등록됩니다!</p>
            </div>
          ) : (
            /* Ranking List */
            <div className="space-y-2">
              {rankings.map((rankedUser) => {
                const badge = getRankBadge(rankedUser.rank);
                const isMe = user?.id === rankedUser.user_id;
                return (
                  <div
                    key={rankedUser.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isMe
                        ? 'bg-blue-100 border-2 border-blue-300'
                        : rankedUser.rank <= 3
                        ? 'bg-gradient-to-r from-gray-50 to-gray-100'
                        : 'bg-gray-50'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 rounded-full ${badge.bg} ${badge.text} flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                      {badge.icon || rankedUser.rank}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                          {rankedUser.display_name}
                          {isMe && ' (나)'}
                        </span>
                        {rankedUser.current_title_name && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                            {rankedUser.current_title_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rankedUser.wins}승 / {rankedUser.total_games}게임
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-lg font-bold ${
                        rankedUser.win_rate >= 60 ? 'text-green-600' : rankedUser.win_rate >= 50 ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {rankedUser.win_rate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400">승률</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* My Ranking (if logged in and not in top 50) */}
          {isLoggedIn && myRanking && !rankings.find(r => r.user_id === user?.id) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-2">내 순위</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {myRanking.rank}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{myRanking.display_name}</div>
                    <div className="text-xs text-gray-500">
                      {myRanking.wins}승 / {myRanking.total_games}게임
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{myRanking.win_rate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-400">승률</div>
                </div>
              </div>
            </div>
          )}

          {/* Not logged in message */}
          {!isLoggedIn && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
              로그인하면 내 순위를 확인할 수 있습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
