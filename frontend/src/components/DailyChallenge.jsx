import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Clock, Trophy, Flame, Star, ArrowLeft } from 'lucide-react';
import { getTodaysDailyGame, getTimeUntilNextDaily } from '../mock/dailyGameData';

const DailyChallenge = ({ onPlayDaily, onBackToMenu, playerProgress }) => {
  const [dailyGame, setDailyGame] = useState(null);
  const [timeUntilNext, setTimeUntilNext] = useState({ hours: 0, minutes: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Get today's daily game
    const todaysGame = getTodaysDailyGame();
    setDailyGame(todaysGame);

    // Update countdown every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTimeUntilNext(getTimeUntilNextDaily());
    }, 60000);

    // Initial time calculation
    setTimeUntilNext(getTimeUntilNextDaily());

    return () => clearInterval(timer);
  }, []);

  const getDailyProgress = () => {
    return playerProgress.daily || {
      completedToday: false,
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
      lastCompletedDate: null
    };
  };

  const getDifficultyColor = (level) => {
    const colors = {
      easy: "from-green-400 to-green-600",
      medium: "from-blue-400 to-blue-600",
      hard: "from-purple-400 to-purple-600", 
      youth: "from-red-400 to-red-600"
    };
    return colors[level] || "from-gray-400 to-gray-600";
  };

  const getDifficultyIcon = (level) => {
    const icons = {
      easy: "🌟",
      medium: "🧠", 
      hard: "⚡",
      youth: "🏆"
    };
    return icons[level] || "🎯";
  };

  const progress = getDailyProgress();
  const hasCompletedToday = progress.completedToday;

  if (!dailyGame) {
    return <div>Loading daily challenge...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button 
          onClick={onBackToMenu}
          variant="outline" 
          size="sm"
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Daily Challenge
          </h1>
          <p className="text-gray-600">Fresh puzzle every day!</p>
        </div>
      </div>

      {/* Daily Game Card */}
      <Card className="mb-6 overflow-hidden relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${getDifficultyColor(dailyGame.level)} opacity-10`} />
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{getDifficultyIcon(dailyGame.level)}</div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  {dailyGame.title}
                </CardTitle>
                <p className="text-gray-600 capitalize">
                  {dailyGame.level} Level • {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            {hasCompletedToday && (
              <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                <Star className="w-4 h-4 mr-1 fill-current" />
                Completed!
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative">
          {/* Game Preview */}
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {dailyGame.words.slice(0, 8).map((word, index) => (
                <div 
                  key={index}
                  className="bg-white bg-opacity-50 p-2 rounded text-center text-sm font-medium text-gray-700 border"
                >
                  {word}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Find 4 groups of 4 connected words
            </p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={() => onPlayDaily(dailyGame)}
            className={`w-full bg-gradient-to-r ${getDifficultyColor(dailyGame.level)} hover:opacity-90 text-white font-bold py-4 text-lg`}
          >
            {hasCompletedToday ? 'Play Again' : 'Start Daily Challenge'}
          </Button>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Flame className="w-6 h-6 text-orange-500 mr-2" />
              <span className="text-2xl font-bold text-orange-600">
                {progress.currentStreak}
              </span>
            </div>
            <p className="text-sm text-gray-600">Current Streak</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold text-yellow-600">
                {progress.longestStreak}
              </span>
            </div>
            <p className="text-sm text-gray-600">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Countdown to Next Daily */}
      {hasCompletedToday && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-gray-500 mr-2" />
              <span className="text-lg font-semibold text-gray-700">
                Next challenge in {timeUntilNext.hours}h {timeUntilNext.minutes}m
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Come back tomorrow for a new puzzle!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Achievement Hints */}
      {!hasCompletedToday && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Daily Challenge Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Complete daily challenges to build your streak</li>
              <li>• Each day features a different difficulty level</li>
              <li>• Perfect games (no mistakes) earn bonus achievements</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyChallenge;