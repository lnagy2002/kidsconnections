import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Clock, Trophy, Flame, Star, ArrowLeft } from 'lucide-react';
import { useDailyGame } from '../hooks/useGameData';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const LevelDailyChallenge = ({ level, onPlayDaily, onBackToMenu, playerProgress }) => {
  const { dailyGame, loading, error } = useDailyGame(level);
  const [timeUntilNext, setTimeUntilNext] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    // Calculate time until next daily game
    const calculateTimeUntilNext = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeDiff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      return { hours, minutes };
    };

    // Update countdown every minute
    const timer = setInterval(() => {
      setTimeUntilNext(calculateTimeUntilNext());
    }, 60000);

    // Initial calculation
    setTimeUntilNext(calculateTimeUntilNext());

    return () => clearInterval(timer);
  }, []);

  const getLevelDailyProgress = () => {
    return playerProgress.daily?.[level] || {
      completedToday: false,
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
      lastCompletedDate: null
    };
  };

  const getDifficultyColor = (levelKey) => {
    const colors = {
      easy: "from-cyan-400 to-cyan-500",
      medium: "from-cyan-500 to-blue-500",
      hard: "from-blue-500 to-purple-500", 
      youth: "from-purple-500 to-pink-500"
    };
    return colors[levelKey] || "from-gray-400 to-gray-600";
  };

  const getLevelTitle = (levelKey) => {
    const titles = {
      easy: "Easy Level Daily",
      medium: "Medium Level Daily",
      hard: "Hard Level Daily",
      youth: "Youth Level Daily"
    };
    return titles[levelKey] || "Daily Challenge";
  };

  const getLevelIcon = (levelKey) => {
    const icons = {
      easy: "🌟",
      medium: "🧠", 
      hard: "⚡",
      youth: "🏆"
    };
    return icons[levelKey] || "🎯";
  };

  const getLevelDescription = (levelKey) => {
    const descriptions = {
      easy: "Perfect for Grades 1-2 • Simple patterns and categories",
      medium: "Perfect for Grades 3-4 • Pattern recognition and logical thinking",
      hard: "Perfect for Grades 5-6 • Complex associations and abstract thinking",
      youth: "Perfect for Grade 6+ • Advanced pattern recognition and critical thinking"
    };
    return descriptions[levelKey] || "Daily brain training challenge";
  };

  const progress = getLevelDailyProgress();
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
                {getLevelTitle(level)}
              </h1>
              <p className="text-cyan-300">{getLevelDescription(level)}</p>
            </div>
          </div>
        </div>

        {/* Daily Game Card */}
        <Card className="mb-6 overflow-hidden relative bg-brand-navy border-2 border-brand-cyan">
          <div className={`absolute inset-0 bg-gradient-to-br ${getDifficultyColor(level)} opacity-15`} />
          
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{getLevelIcon(level)}</div>
                <div>
                  <CardTitle className="text-2xl font-bold text-brand-cyan-bright">
                    {dailyGame.title}
                  </CardTitle>
                  <p className="text-cyan-300 capitalize">
                    {level} Level • {new Date().toLocaleDateString('en-US', { 
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
              className={`w-full bg-gradient-to-r ${getDifficultyColor(level)} hover:opacity-90 text-white font-bold py-4 text-lg shadow-lg`}
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

        {/* Total Progress */}
        <Card className="mb-6 bg-brand-navy/50 border-brand-cyan">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-3xl font-bold text-brand-cyan-bright">
                {progress.totalCompleted}
              </span>
            </div>
            <p className="text-sm text-cyan-300">
              Total {level} daily challenges completed
            </p>
          </CardContent>
        </Card>

        {/* Countdown to Next Daily */}
        {hasCompletedToday && (
          <Card className="bg-brand-navy/50 border-brand-cyan mb-6">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-brand-cyan mr-2" />
                <span className="text-lg font-semibold text-brand-cyan-bright">
                  Next challenge in {timeUntilNext.hours}h {timeUntilNext.minutes}m
                </span>
              </div>
              <p className="text-sm text-cyan-300">
                Come back tomorrow for a new {level} puzzle!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Achievement Hints */}
        {!hasCompletedToday && (
          <Card className="bg-brand-navy/50 border-cyan-400">
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-brand-cyan-bright mb-2">💡 {level.charAt(0).toUpperCase() + level.slice(1)} Daily Tips</h3>
              <ul className="text-sm text-brand-cyan space-y-1">
                <li>• Perfect for your skill level - challenging but achievable</li>
                <li>• Build your daily streak to unlock achievements</li>
                <li>• Try daily challenges in other levels too!</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LevelDailyChallenge;