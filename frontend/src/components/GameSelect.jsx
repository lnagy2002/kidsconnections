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
      1: "bg-cyan-500 text-white",
      2: "bg-blue-500 text-white",
      3: "bg-purple-500 text-white", 
      4: "bg-pink-500 text-white"
    };
    return colors[difficulty] || "bg-gray-500 text-white";
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            onClick={onBackToLevels}
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
              <h1 className="text-3xl font-bold text-brand-cyan-bright">{level.title}</h1>
              <p className="text-cyan-300">{level.description}</p>
            </div>
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
                className="transition-all duration-300 hover:scale-102 hover:shadow-lg bg-brand-navy border-brand-cyan"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-brand-cyan-bright flex items-center gap-3">
                      <Play className="w-6 h-6 text-brand-cyan" />
                      {game.title}
                      {isCompleted && <Star className="w-5 h-5 text-yellow-400 fill-current" />}
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
                          className="bg-brand-dark/50 p-2 rounded text-center text-xs font-medium text-brand-cyan-bright border border-brand-cyan/30"
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-cyan-400 text-center">
                      ...and {game.words.length - 8} more words
                    </p>
                  </div>

                  {/* Stats */}
                  {progress && (
                    <div className="flex justify-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1 text-cyan-300">
                        <Target className="w-4 h-4" />
                        <span>Best: {bestScore?.mistakes || 0} mistakes</span>
                      </div>
                      <div className="flex items-center gap-1 text-cyan-300">
                        <Clock className="w-4 h-4" />
                        <span>Time: {bestScore?.time || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {/* Play Button */}
                  <Button 
                    onClick={() => onSelectGame(game)}
                    className="w-full bg-brand-cyan hover:bg-cyan-400 text-brand-navy font-bold py-3"
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
          <div className="inline-flex items-center gap-4 bg-brand-navy rounded-full px-6 py-3 shadow-md border border-brand-cyan">
            <div className="text-center">
              <div className="text-lg font-bold text-brand-cyan">
                {level.games.filter(game => {
                  const progress = getGameProgress(game.id);
                  return progress && progress.completed;
                }).length}
              </div>
              <div className="text-xs text-cyan-300">of {level.games.length} completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSelect;