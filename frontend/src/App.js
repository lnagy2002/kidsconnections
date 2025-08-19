import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LevelSelect from "./components/LevelSelect";
import GameSelect from "./components/GameSelect";
import GameBoard from "./components/GameBoard";
import { Toaster } from "./components/ui/toaster";
import { gameLevels } from "./mock/gameData";

function App() {
  const [currentView, setCurrentView] = useState('levels'); // 'levels', 'games', 'playing'
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [playerProgress, setPlayerProgress] = useState({
    easy: { completedGames: 0, perfectGames: 0, games: {} },
    medium: { completedGames: 0, perfectGames: 0, games: {} },
    hard: { completedGames: 0, perfectGames: 0, games: {} },
    youth: { completedGames: 0, perfectGames: 0, games: {} }
  });

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('brainConnectionProgress');
    if (savedProgress) {
      setPlayerProgress(JSON.parse(savedProgress));
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (newProgress) => {
    setPlayerProgress(newProgress);
    localStorage.setItem('brainConnectionProgress', JSON.stringify(newProgress));
  };

  const handleSelectLevel = (levelKey) => {
    setSelectedLevel(levelKey);
    setCurrentView('games');
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setCurrentView('playing');
  };

  const handleGameComplete = (gameStats) => {
    const levelKey = selectedLevel;
    const gameId = selectedGame.id;
    
    const newProgress = { ...playerProgress };
    
    // Initialize level if not exists
    if (!newProgress[levelKey]) {
      newProgress[levelKey] = { completedGames: 0, perfectGames: 0, games: {} };
    }
    
    // Initialize game if not exists
    if (!newProgress[levelKey].games[gameId]) {
      newProgress[levelKey].games[gameId] = { completed: false, attempts: 0 };
      newProgress[levelKey].completedGames++;
    }
    
    // Update game stats
    newProgress[levelKey].games[gameId] = {
      ...newProgress[levelKey].games[gameId],
      completed: true,
      attempts: (newProgress[levelKey].games[gameId].attempts || 0) + 1,
      bestScore: {
        mistakes: gameStats.mistakes,
        hintsUsed: gameStats.hintsUsed,
        time: '2:30' // Mock time for now
      }
    };
    
    // Update perfect games count
    if (gameStats.mistakes === 0 && gameStats.hintsUsed === 0) {
      newProgress[levelKey].perfectGames++;
    }
    
    saveProgress(newProgress);
  };

  const handleBackToMenu = () => {
    setCurrentView('games');
    setSelectedGame(null);
  };

  const handleBackToLevels = () => {
    setCurrentView('levels');
    setSelectedLevel(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <BrowserRouter>
        <div className="container mx-auto py-8">
          {currentView === 'levels' && (
            <LevelSelect 
              gameLevels={gameLevels}
              onSelectLevel={handleSelectLevel}
              playerProgress={playerProgress}
            />
          )}
          
          {currentView === 'games' && selectedLevel && (
            <GameSelect 
              level={gameLevels[selectedLevel]}
              onSelectGame={handleSelectGame}
              onBackToLevels={handleBackToLevels}
              playerProgress={playerProgress}
            />
          )}
          
          {currentView === 'playing' && selectedGame && (
            <GameBoard 
              gameData={selectedGame}
              onGameComplete={handleGameComplete}
              onBackToMenu={handleBackToMenu}
            />
          )}
        </div>
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;