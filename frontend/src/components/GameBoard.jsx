import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, RotateCcw, Lightbulb } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const GameBoard = ({ gameData, onGameComplete, onBackToMenu }) => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Shuffle words when game starts
    const shuffled = [...gameData.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
    resetGame();
  }, [gameData]);

  const resetGame = () => {
    setSelectedWords([]);
    setSolvedGroups([]);
    setMistakes(0);
    setGameComplete(false);
    setHintsUsed(0);
  };

  const toggleWordSelection = (word) => {
    if (isWordSolved(word)) return;
    
    setSelectedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word);
      } else if (prev.length < 4) {
        return [...prev, word];
      } else {
        return prev;
      }
    });
  };

  const isWordSolved = (word) => {
    return solvedGroups.some(group => group.words.includes(word));
  };

  const submitGuess = () => {
    if (selectedWords.length !== 4) {
      toast({
        title: "Select 4 words",
        description: "You need to select exactly 4 words to make a guess!",
        variant: "destructive"
      });
      return;
    }

    const correctGroup = gameData.groups.find(group => 
      group.words.every(word => selectedWords.includes(word)) &&
      selectedWords.every(word => group.words.includes(word))
    );

    if (correctGroup) {
      setSolvedGroups(prev => [...prev, correctGroup]);
      setSelectedWords([]);
      
      toast({
        title: "Correct! 🎉",
        description: `You found the ${correctGroup.category} group!`,
        className: "bg-green-100 border-green-300"
      });

      if (solvedGroups.length + 1 === gameData.groups.length) {
        setGameComplete(true);
        onGameComplete({
          mistakes,
          hintsUsed,
          timeBonus: true // Could add actual timer later
        });
      }
    } else {
      setMistakes(prev => prev + 1);
      setSelectedWords([]);
      
      toast({
        title: "Not quite right 🤔",
        description: "Try a different combination!",
        variant: "destructive"
      });

      if (mistakes + 1 >= 4) {
        toast({
          title: "Game Over 😔",
          description: "Too many mistakes! Try again?",
          variant: "destructive"
        });
      }
    }
  };

  const getHint = () => {
    if (hintsUsed >= 2) {
      toast({
        title: "No more hints!",
        description: "You've used all your hints for this game.",
        variant: "destructive"
      });
      return;
    }

    const unsolvedGroups = gameData.groups.filter(group => 
      !solvedGroups.some(solved => solved.category === group.category)
    );
    
    if (unsolvedGroups.length > 0) {
      const hintGroup = unsolvedGroups[Math.floor(Math.random() * unsolvedGroups.length)];
      const hintWord = hintGroup.words[Math.floor(Math.random() * hintGroup.words.length)];
      
      setHintsUsed(prev => prev + 1);
      toast({
        title: `Hint! 💡`,
        description: `"${hintWord}" belongs to the ${hintGroup.category} group!`,
        className: "bg-blue-100 border-blue-300"
      });
    }
  };

  const getSolvedGroupColor = (difficulty) => {
    const colors = {
      1: "bg-green-500",
      2: "bg-yellow-500", 
      3: "bg-orange-500",
      4: "bg-red-500"
    };
    return colors[difficulty] || "bg-gray-500";
  };

  if (gameComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-3xl p-8 text-white mb-6">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Congratulations! 🎉</h2>
          <p className="text-lg">You completed "{gameData.title}"!</p>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <span>Mistakes: {mistakes}/4</span>
            <span>Hints Used: {hintsUsed}/2</span>
          </div>
        </div>
        <div className="space-y-2 mb-6">
          {solvedGroups.map((group, index) => (
            <div key={index} className={`${getSolvedGroupColor(group.difficulty)} text-white p-4 rounded-xl`}>
              <h3 className="font-bold text-lg mb-2">{group.category}</h3>
              <p className="text-sm opacity-90">{group.words.join(", ")}</p>
            </div>
          ))}
        </div>
        <Button onClick={onBackToMenu} size="lg" className="bg-purple-600 hover:bg-purple-700">
          Back to Menu
        </Button>
      </div>
    );
  }

  const remainingWords = shuffledWords.filter(word => !isWordSolved(word));

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{gameData.title}</h2>
        <div className="flex justify-center gap-4 text-sm text-gray-600">
          <span>Mistakes: {mistakes}/4</span>
          <span>Groups Found: {solvedGroups.length}/4</span>
          <span>Hints: {hintsUsed}/2</span>
        </div>
      </div>

      {/* Solved Groups */}
      {solvedGroups.map((group, index) => (
        <div key={index} className={`${getSolvedGroupColor(group.difficulty)} text-white p-4 rounded-xl mb-3`}>
          <h3 className="font-bold text-center mb-2">{group.category}</h3>
          <div className="grid grid-cols-4 gap-2">
            {group.words.map(word => (
              <div key={word} className="bg-white bg-opacity-20 p-2 rounded text-center text-sm font-medium">
                {word}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Game Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {remainingWords.map(word => (
          <Button
            key={word}
            variant={selectedWords.includes(word) ? "default" : "outline"}
            className={`h-16 text-sm font-medium transition-all duration-200 ${
              selectedWords.includes(word) 
                ? "bg-blue-500 hover:bg-blue-600 text-white scale-105 shadow-lg" 
                : "bg-white hover:bg-gray-50 text-gray-800 border-2 hover:border-blue-300"
            }`}
            onClick={() => toggleWordSelection(word)}
          >
            {word}
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button 
          onClick={submitGuess}
          disabled={selectedWords.length !== 4 || mistakes >= 4}
          className="bg-green-600 hover:bg-green-700 px-6"
        >
          Submit Guess
        </Button>
        <Button 
          onClick={() => setSelectedWords([])}
          variant="outline"
          className="px-6"
        >
          Clear
        </Button>
        <Button 
          onClick={getHint}
          disabled={hintsUsed >= 2}
          variant="outline"
          className="px-6"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Hint
        </Button>
      </div>

      {/* Mistake indicator */}
      {mistakes > 0 && (
        <div className="flex justify-center mt-4">
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < mistakes ? 'bg-red-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;