import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Star, Brain, Zap, Trophy } from 'lucide-react';

const LevelSelect = ({ gameLevels, onSelectLevel, playerProgress }) => {
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
      easy: "from-green-400 to-green-600",
      medium: "from-blue-400 to-blue-600", 
      hard: "from-purple-400 to-purple-600",
      youth: "from-red-400 to-red-600"
    };
    return colors[levelKey] || "from-gray-400 to-gray-600";
  };

  const getCompletedGames = (levelKey) => {
    return playerProgress[levelKey]?.completedGames || 0;
  };

  const getTotalGames = (levelKey) => {
    return gameLevels[levelKey]?.games?.length || 0;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Brain Connection Challenge! 🧠
        </h1>
        <p className="text-lg text-gray-600">
          Choose your level and start connecting patterns!
        </p>
      </div>

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
              className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                isUnlocked ? 'shadow-lg hover:shadow-xl' : 'opacity-60'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${getLevelColor(levelKey)} opacity-10`} />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-full bg-gradient-to-br ${getLevelColor(levelKey)} text-white`}>
                    {getLevelIcon(levelKey)}
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {completed}/{total} completed
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  {level.title}
                </CardTitle>
                <p className="text-gray-600 text-sm">
                  {level.description}
                </p>
              </CardHeader>

              <CardContent className="relative">
                {/* Progress Bar */}
                {total > 0 && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
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
                  <p className="text-xs text-gray-500 mt-2 text-center">
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
        <div className="inline-flex items-center gap-6 bg-white rounded-full px-6 py-3 shadow-md">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(playerProgress).reduce((sum, level) => sum + (level.completedGames || 0), 0)}
            </div>
            <div className="text-xs text-gray-600">Games Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(playerProgress).reduce((sum, level) => sum + (level.perfectGames || 0), 0)}
            </div>
            <div className="text-xs text-gray-600">Perfect Games</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(Object.values(playerProgress).reduce((sum, level) => sum + (level.avgTime || 0), 0) / 4) || 0}s
            </div>
            <div className="text-xs text-gray-600">Avg Time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;