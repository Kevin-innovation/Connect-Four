'use client';

import { useState, useEffect } from 'react';
import { supabase, DbTitle, DbUserTitle, DbUserStatistics } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AchievementWithProgress extends DbTitle {
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export default function AchievementsPage() {
  const { user, isLoggedIn, openLoginModal } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState<DbUserStatistics | null>(null);

  useEffect(() => {
    fetchAchievements();
  }, [user?.id]);

  const fetchAchievements = async () => {
    setIsLoading(true);

    // Fetch all titles
    const { data: titles, error: titlesError } = await supabase
      .from('titles')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (titlesError) {
      console.error('Error fetching titles:', titlesError);
      setIsLoading(false);
      return;
    }

    let userTitles: DbUserTitle[] = [];
    let stats: DbUserStatistics | null = null;

    // Fetch user's earned titles and stats if logged in
    if (user?.id) {
      // Get game mode ID first
      const { data: gameModeData } = await supabase
        .from('game_modes')
        .select('id')
        .eq('mode_key', 'ai-ranked')
        .single();

      const gameModeId = gameModeData?.id;

      const [userTitlesResult, allStatsResult] = await Promise.all([
        supabase
          .from('user_titles')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('user_statistics')
          .select('*')
          .eq('user_id', user.id)
      ]);

      userTitles = userTitlesResult.data || [];

      // Find stats for ai-ranked mode, or aggregate all stats
      const allStats = allStatsResult.data || [];
      let aiRankedStats = allStats.find(s => s.game_mode_id === gameModeId);

      // If no specific AI stats, aggregate all stats
      if (!aiRankedStats && allStats.length > 0) {
        const aggregated = allStats.reduce((acc, s) => ({
          total_games: acc.total_games + (s.total_games || 0),
          wins: acc.wins + (s.wins || 0),
          losses: acc.losses + (s.losses || 0),
          draws: acc.draws + (s.draws || 0),
          best_win_streak: Math.max(acc.best_win_streak, s.best_win_streak || 0),
        }), { total_games: 0, wins: 0, losses: 0, draws: 0, best_win_streak: 0 });

        if (aggregated.total_games > 0) {
          aiRankedStats = {
            ...aggregated,
            win_rate: (aggregated.wins / aggregated.total_games) * 100,
            user_id: user.id,
            game_mode_id: gameModeId || 0,
          } as DbUserStatistics;
        }
      }

      stats = aiRankedStats || null;
      setUserStats(stats);
    }

    // Calculate progress for each achievement
    const achievementsWithProgress: AchievementWithProgress[] = (titles || []).map(title => {
      const userTitle = userTitles.find(ut => ut.title_id === title.id);
      const condition = title.condition_json as {
        type: string;
        min?: number;
        max?: number;
        min_games?: number;
        count?: number;
        streak?: number;
      };

      let progress = 0;
      let target = 1;

      if (stats) {
        switch (condition.type) {
          case 'win_rate':
            // 승률 업적: progress는 현재 승률, target은 최소 요구 승률
            progress = stats.win_rate || 0;
            target = condition.min || 0;
            break;
          case 'ai_wins':
            // AI 승리 업적: progress는 현재 승수, target은 최소 요구 승수
            progress = stats.wins || 0;
            target = condition.min || 1;
            break;
          case 'streak':
            // 연승 업적: progress는 최고 연승, target은 요구 연승
            progress = stats.best_win_streak || 0;
            target = condition.min || 1;
            break;
          case 'total_games':
            // 총 게임 업적: progress는 총 게임수, target은 요구 게임수
            progress = stats.total_games || 0;
            target = condition.min || 1;
            break;
          case 'draws':
            // 무승부 업적
            progress = stats.draws || 0;
            target = condition.min || 1;
            break;
          default:
            // 특수 업적들 (측정 불가한 것들)
            progress = 0;
            target = condition.min || 1;
        }
      }

      return {
        ...title,
        progress,
        target,
        unlocked: !!userTitle,
        unlockedAt: userTitle?.acquired_at ? new Date(userTitle.acquired_at).toLocaleDateString('ko-KR') : undefined,
      };
    });

    setAchievements(achievementsWithProgress);
    setIsLoading(false);
  };

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-r from-yellow-200 to-amber-300 border-yellow-400';
      case 'epic':
        return 'bg-gradient-to-r from-purple-200 to-purple-300 border-purple-400';
      case 'rare':
        return 'bg-gradient-to-r from-blue-200 to-blue-300 border-blue-400';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return { text: '전설', color: 'text-yellow-700 bg-yellow-100' };
      case 'epic': return { text: '영웅', color: 'text-purple-700 bg-purple-100' };
      case 'rare': return { text: '희귀', color: 'text-blue-700 bg-blue-100' };
      default: return { text: '일반', color: 'text-gray-600 bg-gray-100' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'win_rate': return '📊';
      case 'ai_wins': return '🤖';
      case 'streak': return '🔥';
      case 'total_games': return '🎮';
      case 'special': return '⭐';
      default: return '🎯';
    }
  };

  const categories = [
    { id: 'all', label: '전체' },
    { id: 'win_rate', label: '승률' },
    { id: 'ai_wins', label: 'AI' },
    { id: 'streak', label: '연승' },
    { id: 'total_games', label: '게임수' },
    { id: 'special', label: '특별' },
  ];

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="max-w-[500px] mx-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-500 mb-6">업적을 확인하려면 로그인해주세요</p>
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

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="max-w-[500px] mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">업적</h1>

          {/* Progress Summary */}
          <div className="mb-4 text-center">
            <div className="text-sm text-gray-500">달성률</div>
            <div className="text-3xl font-bold text-blue-600">
              {unlockedCount}/{totalCount}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredAchievements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              해당 카테고리의 업적이 없습니다.
            </div>
          ) : (
            /* Achievements List */
            <div className="space-y-3">
              {filteredAchievements.map((achievement) => {
                const rarityLabel = getRarityLabel(achievement.rarity);
                const progressPercent = achievement.target > 0
                  ? Math.min((achievement.progress / achievement.target) * 100, 100)
                  : 0;

                return (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      achievement.unlocked
                        ? getRarityStyle(achievement.rarity)
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        achievement.unlocked ? 'bg-white/50' : 'bg-gray-200 grayscale'
                      }`}>
                        {getCategoryIcon(achievement.category)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold ${achievement.unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
                            {achievement.display_name}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${rarityLabel.color}`}>
                            {rarityLabel.text}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{achievement.description}</p>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {achievement.progress.toFixed(achievement.category === 'win_rate' ? 1 : 0)}/{achievement.target}
                          </span>
                        </div>

                        {achievement.unlocked && achievement.unlockedAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            달성일: {achievement.unlockedAt}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
