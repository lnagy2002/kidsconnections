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
      easy: "from-cyan-400 to-cyan-500",
      medium: "from-cyan-500 to-blue-500",
      hard: "from-blue-500 to-purple-500", 
      youth: "from-purple-500 to-pink-500"
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
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cyan-bright flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mx-auto mb-4"></div>
          <p>Loading daily challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header with Logo */}
        <div className="flex items-center mb-6">
          <Button 
            onClick={onBackToMenu}
            className="mr-4 bg-brand-navy border-brand-cyan text-brand-cyan hover:bg-cyan-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_kidconnections/artifacts/t3eatmx3_B.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-brand-cyan-bright flex items-center gap-3">
                <Calendar className="w-8 h-8 text-brand-cyan" />
                Daily Challenge
              </h1>
              <p className="text-cyan-300">Fresh puzzle every day!</p>
            </div>
          </div>
        </div>

        {/* Daily Game Card */}
        <Card className="mb-6 overflow-hidden relative bg-brand-navy border-2 border-brand-cyan">
          <div className={`absolute inset-0 bg-gradient-to-br ${getDifficultyColor(dailyGame.level)} opacity-15`} />
          
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{getDifficultyIcon(dailyGame.level)}</div>
                <div>
                  <CardTitle className="text-2xl font-bold text-brand-cyan-bright">
                    {dailyGame.title}
                  </CardTitle>
                  <p className="text-cyan-300 capitalize">
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
                <Badge className="bg-brand-cyan text-brand-navy text-lg px-3 py-1 font-bold">
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
                    className="bg-brand-dark/50 p-2 rounded text-center text-sm font-medium text-brand-cyan-bright border border-brand-cyan/30"
                  >
                    {word}
                  </div>
                ))}
              </div>
              <p className="text-xs text-cyan-400 text-center">
                Find 4 groups of 4 connected words
              </p>
            </div>

            {/* Action Button */}
            <Button 
              onClick={() => onPlayDaily(dailyGame)}
              className={`w-full bg-gradient-to-r ${getDifficultyColor(dailyGame.level)} hover:opacity-90 text-white font-bold py-4 text-lg shadow-lg`}
            >
              {hasCompletedToday ? 'Play Again' : 'Start Daily Challenge'}
            </Button>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-brand-navy border-brand-cyan">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Flame className="w-6 h-6 text-brand-orange mr-2" />
                <span className="text-2xl font-bold text-brand-cyan">
                  {progress.currentStreak}
                </span>
              </div>
              <p className="text-sm text-cyan-300">Current Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-brand-navy border-brand-cyan">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
                <span className="text-2xl font-bold text-cyan-400">
                  {progress.longestStreak}
                </span>
              </div>
              <p className="text-sm text-cyan-300">Best Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Countdown to Next Daily */}
        {hasCompletedToday && (
          <Card className="bg-brand-navy/50 border-brand-cyan">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-brand-cyan mr-2" />
                <span className="text-lg font-semibold text-brand-cyan-bright">
                  Next challenge in {timeUntilNext.hours}h {timeUntilNext.minutes}m
                </span>
              </div>
              <p className="text-sm text-cyan-300">
                Come back tomorrow for a new puzzle!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Achievement Hints */}
        {!hasCompletedToday && (
          <Card className="bg-brand-navy/50 border-cyan-400">
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-brand-cyan-bright mb-2">💡 Daily Challenge Tips</h3>
              <ul className="text-sm text-brand-cyan space-y-1">
                <li>• Complete daily challenges to build your streak</li>
                <li>• Each day features a different difficulty level</li>
                <li>• Perfect games (no mistakes) earn bonus achievements</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;