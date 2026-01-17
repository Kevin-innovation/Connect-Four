'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// 랭킹 데이터 타입 (user_statistics + users 조인)
interface RankingData {
  id: string;
  user_id: string;
  display_name: string;
  photo_url: string | null;
  total_games: number;
  wins: number;
  win_rate: number;
  current_title_name: string | null;
  current_title_color: string | null;
  rank: number;
}

export default function RankingPage() {
  const { user, isLoggedIn } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'player-ranked' | 'ai-ranked' | 'all'>('all');
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [myRanking, setMyRanking] = useState<RankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!mountedRef.current) return;

      const currentFetchId = ++fetchIdRef.current;
      setIsLoading(true);

      try {
        // Get game mode id based on selected tab
        let gameModeKey = 'ai-ranked'; // default to AI mode
        if (selectedTab === 'player-ranked') {
          gameModeKey = 'player-ranked';
        }

        // First get game mode id
        const { data: gameModeData } = await supabase
          .from('game_modes')
          .select('id')
          .eq('mode_key', gameModeKey)
          .single();

        // Check if this fetch is still current
        if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

        const gameModeId = gameModeData?.id;

        if (!gameModeId && selectedTab !== 'all') {
          // Fallback: fetch all statistics
          setRankings([]);
          setIsLoading(false);
          return;
        }

        // Fetch user statistics with user info and title
        let query = supabase
          .from('user_statistics')
          .select(`
            user_id,
            total_games,
            wins,
            win_rate,
            users!inner (
              id,
              display_name,
              photo_url,
              current_title_id,
              titles:current_title_id (
                display_name,
                color_hex
              )
            )
          `)
          .gt('total_games', 0);

        if (gameModeId && selectedTab !== 'all') {
          query = query.eq('game_mode_id', gameModeId);
        }

        const { data: statsData, error } = await query;

        // Check if this fetch is still current
        if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

        if (error) {
          console.error('Error fetching rankings:', error);
          setRankings([]);
          setIsLoading(false);
          return;
        }

        // For 'all' tab, aggregate statistics by user
        let aggregatedData: any[] = [];

        if (selectedTab === 'all') {
          // Group by user_id and sum statistics
          const userMap = new Map<string, any>();

          (statsData || []).forEach((stat: any) => {
            const userId = stat.user_id;
            if (userMap.has(userId)) {
              const existing = userMap.get(userId);
              existing.total_games += stat.total_games || 0;
              existing.wins += stat.wins || 0;
            } else {
              userMap.set(userId, {
                user_id: userId,
                total_games: stat.total_games || 0,
                wins: stat.wins || 0,
                users: stat.users,
              });
            }
          });

          // Convert map to array and calculate win_rate
          aggregatedData = Array.from(userMap.values()).map(stat => ({
            ...stat,
            win_rate: stat.total_games > 0 ? (stat.wins / stat.total_games) * 100 : 0,
          }));
        } else {
          aggregatedData = (statsData || []).map((stat: any) => ({
            ...stat,
            win_rate: parseFloat(stat.win_rate) || 0,
          }));
        }

        // Sort by win_rate then by wins
        aggregatedData.sort((a, b) => {
          if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
          return b.wins - a.wins;
        });

        // Limit to top 50
        aggregatedData = aggregatedData.slice(0, 50);

        // Transform and rank the data
        const rankedData: RankingData[] = aggregatedData.map((stat: any, index: number) => ({
          id: stat.user_id,
          user_id: stat.user_id,
          display_name: stat.users?.display_name || 'Unknown',
          photo_url: stat.users?.photo_url || null,
          total_games: stat.total_games,
          wins: stat.wins,
          win_rate: stat.win_rate,
          current_title_name: stat.users?.titles?.display_name || null,
          current_title_color: stat.users?.titles?.color_hex || null,
          rank: index + 1,
        }));

        setRankings(rankedData);

        // Find my ranking if logged in
        if (user?.id) {
          const myData = rankedData.find(r => r.user_id === user.id);
          if (myData) {
            setMyRanking(myData);
          } else {
            // Fetch my stats separately
            let myQuery = supabase
              .from('user_statistics')
              .select('user_id, total_games, wins, win_rate')
              .eq('user_id', user.id);

            if (gameModeId && selectedTab !== 'all') {
              myQuery = myQuery.eq('game_mode_id', gameModeId);
            }

            const { data: myStatsArray } = await myQuery;

            // Check if this fetch is still current
            if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

            if (myStatsArray && myStatsArray.length > 0) {
              // Aggregate stats for 'all' tab
              const aggregated = myStatsArray.reduce((acc, stat) => ({
                total_games: acc.total_games + (stat.total_games || 0),
                wins: acc.wins + (stat.wins || 0),
              }), { total_games: 0, wins: 0 });

              if (aggregated.total_games > 0) {
                setMyRanking({
                  id: user.id,
                  user_id: user.id,
                  display_name: user.nickname || 'Unknown',
                  photo_url: null,
                  total_games: aggregated.total_games,
                  wins: aggregated.wins,
                  win_rate: aggregated.total_games > 0 ? (aggregated.wins / aggregated.total_games) * 100 : 0,
                  current_title_name: null,
                  current_title_color: null,
                  rank: 51,
                });
              } else {
                setMyRanking(null);
              }
            } else {
              setMyRanking(null);
            }
          }
        }
      } catch (err) {
        console.error('Error in fetchRankings:', err);
        if (mountedRef.current && currentFetchId === fetchIdRef.current) {
          setRankings([]);
        }
      }

      // Only update loading state if this is still the current fetch
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    };

    fetchRankings();

    // 10초마다 자동 갱신
    const interval = setInterval(fetchRankings, 10000);
    return () => clearInterval(interval);
  }, [selectedTab]); // Only depend on selectedTab, user state handled separately

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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">랭킹</h1>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                {lastUpdated.toLocaleTimeString('ko-KR')} 갱신
              </span>
            )}
          </div>

          {/* Tab Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            {[
              { id: 'ai-ranked', label: 'AI 대전' },
              { id: 'player-ranked', label: 'PvP 대전' },
              { id: 'all', label: '전체' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'player-ranked' | 'ai-ranked' | 'all')}
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
                    key={`${rankedUser.user_id}-${rankedUser.rank}`}
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
                          <span
                            className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: rankedUser.current_title_color ? `${rankedUser.current_title_color}20` : '#f3e8ff',
                              color: rankedUser.current_title_color || '#7c3aed',
                            }}
                          >
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
