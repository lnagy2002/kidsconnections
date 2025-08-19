import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Play, Star, Clock, Target } from 'lucide-react';

const GameSelect = ({ level, onSelectGame, onBackToLevels, playerProgress }) => {
  const getGameProgress = (gameId) => {
    const levelKey = Object.keys(playerProgress).find(key => 
      playerProgress[key].games && playerProgress[key].games[gameId]
    );
    return levelKey ? playerProgress[levelKey].games[gameId] : null;
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-yellow-100 text-yellow-800",
      3: "bg-orange-100 text-orange-800", 
      4: "bg-red-100 text-red-800"
    };
    return colors[difficulty] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button 
          onClick={onBackToLevels}
          variant="outline" 
          size="sm"
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{level.title}</h1>
          <p className="text-gray-600">{level.description}</p>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid gap-6">
        {level.games.map((game) => {
          const progress = getGameProgress(game.id);
          const isCompleted = progress && progress.completed;
          const bestScore = progress ? progress.bestScore : null;

          return (
            <Card 
              key={game.id} 
              className="transition-all duration-300 hover:scale-102 hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <Play className="w-6 h-6 text-blue-600" />
                    {game.title}
                    {isCompleted && <Star className="w-5 h-5 text-yellow-500 fill-current" />}
                  </CardTitle>
                  
                  <div className="flex gap-2">
                    {game.groups.map((group, index) => (
                      <Badge 
                        key={index}
                        className={`text-xs ${getDifficultyColor(group.difficulty)}`}
                      >
                        {group.category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Preview of words */}
                <div className="mb-4">
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {game.words.slice(0, 8).map((word, index) => (
                      <div 
                        key={index}
                        className="bg-gray-100 p-2 rounded text-center text-xs font-medium text-gray-700"
                      >
                        {word}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    ...and {game.words.length - 8} more words
                  </p>
                </div>

                {/* Stats */}
                {progress && (
                  <div className="flex justify-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Target className="w-4 h-4" />
                      <span>Best: {bestScore?.mistakes || 0} mistakes</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Time: {bestScore?.time || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Play Button */}
                <Button 
                  onClick={() => onSelectGame(game)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                >
                  {isCompleted ? 'Play Again' : 'Start Game'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Level Progress */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-md">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {level.games.filter(game => {
                const progress = getGameProgress(game.id);
                return progress && progress.completed;
              }).length}
            </div>
            <div className="text-xs text-gray-600">of {level.games.length} completed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSelect;