import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Star, Brain, Zap, Trophy, Calendar, Flame } from 'lucide-react';

const LevelSelect = ({ gameLevels, onSelectLevel, onSelectDaily, playerProgress }) => {
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
    return playerProgress.daily || {
      completedToday: false,
      currentStreak: 0,
      totalCompleted: 0
    };
  };

  const dailyProgress = getDailyProgress();

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

        {/* Daily Challenge Card - Featured at top */}
        <Card className="mb-8 overflow-hidden relative bg-brand-navy border-2 border-brand-cyan shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20" />
          
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-brand-orange to-brand-red text-white">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-brand-cyan-bright flex items-center gap-2">
                    Daily Challenge
                    {dailyProgress.completedToday && <Star className="w-6 h-6 text-yellow-400 fill-current" />}
                  </CardTitle>
                  <p className="text-cyan-300">Fresh puzzle every day!</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-5 h-5 text-brand-orange" />
                  <span className="text-lg font-bold text-brand-cyan">
                    {dailyProgress.currentStreak} day streak
                  </span>
                </div>
                <Badge className="text-sm bg-brand-cyan text-brand-navy font-semibold">
                  {dailyProgress.completedToday ? 'Completed Today!' : 'Available Now'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative">
            <div className="mb-4">
              <p className="text-cyan-200 mb-3">
                Challenge yourself with today's special puzzle and build your daily streak!
              </p>
              <div className="flex justify-center gap-6 text-sm text-cyan-300 mb-4">
                <span>🏆 Total Completed: {dailyProgress.totalCompleted}</span>
                <span>🔥 Current Streak: {dailyProgress.currentStreak}</span>
              </div>
            </div>

            <Button 
              onClick={onSelectDaily}
              className="w-full bg-gradient-to-r from-brand-cyan to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-brand-navy font-bold py-4 text-lg shadow-lg"
            >
              {dailyProgress.completedToday ? 'View Daily Challenge' : 'Play Daily Challenge'}
            </Button>
          </CardContent>
        </Card>

        {/* Regular Level Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(gameLevels).map(([levelKey, level]) => {
            const completed = getCompletedGames(levelKey);
            const total = getTotalGames(levelKey);
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
                    <Badge className="text-sm bg-brand-cyan text-brand-navy font-semibold">
                      {completed}/{total} completed
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-brand-cyan-bright">
                    {level.title}
                  </CardTitle>
                  <p className="text-cyan-300 text-sm">
                    {level.description}
                  </p>
                </CardHeader>

                <CardContent className="relative">
                  {/* Progress Bar */}
                  {total > 0 && (
                    <div className="mb-4">
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
                    className={`w-full bg-gradient-to-r ${getLevelColor(levelKey)} hover:opacity-90 text-white font-medium py-3`}
                  >
                    {isUnlocked ? 'Play Level' : '🔒 Locked'}
                  </Button>

                  {!isUnlocked && levelKey !== 'easy' && (
                    <p className="text-xs text-cyan-400 mt-2 text-center">
                      Complete previous level to unlock
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
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
                {dailyProgress.currentStreak}
              </div>
              <div className="text-xs text-cyan-300">Daily Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;