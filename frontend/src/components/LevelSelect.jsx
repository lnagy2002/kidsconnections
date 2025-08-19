import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Star, Brain, Zap, Trophy, Calendar, Flame } from 'lucide-react';

const LevelSelect = ({ gameLevels, onSelectLevel, onSelectLevelDaily, playerProgress }) => {
  const getLevelIcon = (levelKey) => {
    const icons = {
      easy: <Star className="w-8 h-8" />,
      medium: <Brain className="w-8 h-8" />,
      hard: <Zap className="w-8 h-8" />,
      youth: <Trophy className="w-8 h-8" />
    };
    return icons[levelKey] || <Star className="w-8 h-8" />;
  };

  const getLevelColor = (levelKey) => {
    const colors = {
      easy: "from-cyan-400 to-cyan-500",
      medium: "from-cyan-500 to-blue-500", 
      hard: "from-blue-500 to-purple-500",
      youth: "from-purple-500 to-pink-500"
    };
    return colors[levelKey] || "from-gray-400 to-gray-600";
  };

  const getCompletedGames = (levelKey) => {
    return playerProgress[levelKey]?.completedGames || 0;
  };

  const getTotalGames = (levelKey) => {
    return gameLevels[levelKey]?.games?.length || 0;
  };

  const getDailyProgress = () => {
    return playerProgress.daily || {};
  };

  const getLevelDailyProgress = (levelKey) => {
    const dailyProgress = getDailyProgress();
    return dailyProgress[levelKey] || {
      completedToday: false,
      currentStreak: 0,
      totalCompleted: 0
    };
  };

  const getTotalDailyStreak = () => {
    const dailyProgress = getDailyProgress();
    return Math.max(
      dailyProgress.easy?.currentStreak || 0,
      dailyProgress.medium?.currentStreak || 0,
      dailyProgress.hard?.currentStreak || 0,
      dailyProgress.youth?.currentStreak || 0
    );
  };

  const getTotalDailyCompleted = () => {
    const dailyProgress = getDailyProgress();
    return (dailyProgress.easy?.totalCompleted || 0) +
           (dailyProgress.medium?.totalCompleted || 0) +
           (dailyProgress.hard?.totalCompleted || 0) +
           (dailyProgress.youth?.totalCompleted || 0);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_kidconnections/artifacts/t3eatmx3_B.png" 
              alt="Brain Connections Logo" 
              className="w-16 h-16 object-contain"
            />
            <h1 className="text-4xl font-bold text-brand-cyan-bright">
              Brain Connection Challenge!
            </h1>
          </div>
          <p className="text-lg text-cyan-300">
            Choose your level and start connecting patterns!
          </p>
        </div>

        {/* Level Grid with Daily Challenges */}
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(gameLevels).map(([levelKey, level]) => {
            const completed = getCompletedGames(levelKey);
            const total = getTotalGames(levelKey);
            const levelDailyProgress = getLevelDailyProgress(levelKey);
            const isUnlocked = levelKey === 'easy' || completed > 0 || 
              (levelKey === 'medium' && getCompletedGames('easy') > 0) ||
              (levelKey === 'hard' && getCompletedGames('medium') > 0) ||
              (levelKey === 'youth' && getCompletedGames('hard') > 0);

            return (
              <Card 
                key={levelKey} 
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 bg-brand-navy border-brand-cyan ${
                  isUnlocked ? 'shadow-lg hover:shadow-xl shadow-cyan-500/20' : 'opacity-60'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${getLevelColor(levelKey)} opacity-10`} />
                
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-full bg-gradient-to-br ${getLevelColor(levelKey)} text-white`}>
                      {getLevelIcon(levelKey)}
                    </div>
                    <div className="text-right">
                      <Badge className="text-sm bg-brand-cyan text-brand-navy font-semibold mb-1 block">
                        {completed}/{total} games
                      </Badge>
                      {levelDailyProgress.completedToday && (
                        <Badge className="text-xs bg-brand-orange text-white font-semibold">
                          ✓ Daily Done
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-brand-cyan-bright">
                    {level.title}
                  </CardTitle>
                  <p className="text-cyan-300 text-sm">
                    {level.description}
                  </p>
                </CardHeader>

                <CardContent className="relative space-y-3">
                  {/* Daily Challenge Section */}
                  <div className="bg-brand-dark/50 rounded-lg p-3 border border-brand-cyan/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-cyan" />
                        <span className="text-sm font-medium text-brand-cyan-bright">Daily Challenge</span>
                      </div>
                      {levelDailyProgress.currentStreak > 0 && (
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-brand-orange" />
                          <span className="text-xs text-brand-orange font-semibold">
                            {levelDailyProgress.currentStreak}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => onSelectLevelDaily(levelKey)}
                      disabled={!isUnlocked}
                      className={`w-full bg-gradient-to-r ${getLevelColor(levelKey)} hover:opacity-90 text-white font-medium py-2 text-sm`}
                    >
                      {levelDailyProgress.completedToday ? 'Play Again' : 'Play Daily'}
                    </Button>
                  </div>

                  {/* Regular Games Section */}
                  <div>
                    {/* Progress Bar */}
                    {total > 0 && (
                      <div className="mb-3">
                        <div className="w-full bg-brand-dark rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${getLevelColor(levelKey)} transition-all duration-500`}
                            style={{ width: `${(completed / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={() => onSelectLevel(levelKey)}
                      disabled={!isUnlocked}
                      variant="outline"
                      className={`w-full border-2 ${isUnlocked ? 'border-brand-cyan text-brand-cyan hover:bg-brand-cyan hover:text-brand-navy' : 'border-gray-600 text-gray-500'} font-medium py-2`}
                    >
                      {isUnlocked ? 'Browse Games' : '🔒 Locked'}
                    </Button>

                    {!isUnlocked && levelKey !== 'easy' && (
                      <p className="text-xs text-cyan-400 mt-2 text-center">
                        Complete previous level to unlock
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enhanced Stats */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-6 bg-brand-navy rounded-full px-6 py-3 shadow-md border border-brand-cyan">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-cyan">
                {Object.values(playerProgress).reduce((sum, level) => sum + (level.completedGames || 0), 0)}
              </div>
              <div className="text-xs text-cyan-300">Games Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {Object.values(playerProgress).reduce((sum, level) => sum + (level.perfectGames || 0), 0)}
              </div>
              <div className="text-xs text-cyan-300">Perfect Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-orange">
                {getTotalDailyCompleted()}
              </div>
              <div className="text-xs text-cyan-300">Daily Challenges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">
                {getTotalDailyStreak()}
              </div>
              <div className="text-xs text-cyan-300">Best Daily Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;