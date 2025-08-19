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
        className: "bg-cyan-900 border-brand-cyan text-brand-cyan-bright"
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
        className: "bg-cyan-900 border-cyan-400 text-brand-cyan-bright"
      });
    }
  };

  const getSolvedGroupColor = (difficulty) => {
    const colors = {
      1: "bg-cyan-500",
      2: "bg-blue-500", 
      3: "bg-purple-500",
      4: "bg-pink-500"
    };
    return colors[difficulty] || "bg-gray-500";
  };

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-brand-dark text-brand-cyan-bright flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-white mb-6">
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
          <Button 
            onClick={onBackToMenu} 
            size="lg" 
            className="bg-brand-cyan hover:bg-cyan-400 text-brand-navy font-bold"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  const remainingWords = shuffledWords.filter(word => !isWordSolved(word));

  return (
    <div className="min-h-screen bg-brand-dark text-brand-cyan-bright">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_kidconnections/artifacts/t3eatmx3_B.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
            <h2 className="text-2xl font-bold text-brand-cyan-bright">{gameData.title}</h2>
          </div>
          <div className="flex justify-center gap-4 text-sm text-cyan-300">
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
              className={`h-16 text-sm font-medium transition-all duration-200 ${
                selectedWords.includes(word) 
                  ? "bg-brand-cyan hover:bg-cyan-400 text-brand-navy scale-105 shadow-lg shadow-cyan-500/30" 
                  : "bg-brand-navy hover:bg-cyan-900 text-brand-cyan-bright border-2 border-brand-cyan hover:border-cyan-400"
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
            className="bg-brand-cyan hover:bg-cyan-400 text-brand-navy px-6 font-bold"
          >
            Submit Guess
          </Button>
          <Button 
            onClick={() => setSelectedWords([])}
            className="px-6 bg-brand-navy border-brand-cyan text-brand-cyan hover:bg-cyan-900"
          >
            Clear
          </Button>
          <Button 
            onClick={getHint}
            disabled={hintsUsed >= 2}
            className="px-6 bg-brand-navy border-cyan-400 text-cyan-400 hover:bg-cyan-900"
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
                    i < mistakes ? 'bg-brand-red' : 'bg-brand-navy'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;