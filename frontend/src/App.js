import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LevelSelect from "./components/LevelSelect";
import GameSelect from "./components/GameSelect";
import GameBoard from "./components/GameBoard";
import DailyChallenge from "./components/DailyChallenge";
import { Toaster } from "./components/ui/toaster";
import { gameLevels } from "./mock/gameData";

function App() {
  const [currentView, setCurrentView] = useState('levels'); // 'levels', 'games', 'playing', 'daily'
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [playerProgress, setPlayerProgress] = useState({
    easy: { completedGames: 0, perfectGames: 0, games: {} },
    medium: { completedGames: 0, perfectGames: 0, games: {} },
    hard: { completedGames: 0, perfectGames: 0, games: {} },
    youth: { completedGames: 0, perfectGames: 0, games: {} },
    daily: { 
      completedToday: false, 
      currentStreak: 0, 
      longestStreak: 0, 
      totalCompleted: 0,
      lastCompletedDate: null,
      games: {} 
    }
  });

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('brainConnectionProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      
      // Check if daily progress needs to be reset (new day)
      const today = new Date().toISOString().split('T')[0];
      if (progress.daily && progress.daily.lastCompletedDate !== today) {
        progress.daily.completedToday = false;
        
        // Update streak logic - if more than 1 day gap, reset streak
        if (progress.daily.lastCompletedDate) {
          const lastDate = new Date(progress.daily.lastCompletedDate);
          const todayDate = new Date(today);
          const diffTime = Math.abs(todayDate - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            progress.daily.currentStreak = 0;
          }
        }
      }
      
      setPlayerProgress(progress);
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

  const handleSelectDaily = () => {
    setCurrentView('daily');
  };

  const handlePlayDaily = (dailyGame) => {
    setSelectedGame(dailyGame);
    setCurrentView('playing');
  };

  const handleGameComplete = (gameStats) => {
    const newProgress = { ...playerProgress };
    
    // Check if this is a daily game
    if (selectedGame && selectedGame.id && selectedGame.id.startsWith('daily-')) {
      const today = new Date().toISOString().split('T')[0];
      
      // Initialize daily progress if not exists
      if (!newProgress.daily) {
        newProgress.daily = { 
          completedToday: false, 
          currentStreak: 0, 
          longestStreak: 0, 
          totalCompleted: 0,
          lastCompletedDate: null,
          games: {} 
        };
      }
      
      // Update daily game completion
      if (!newProgress.daily.completedToday) {
        newProgress.daily.completedToday = true;
        newProgress.daily.totalCompleted++;
        newProgress.daily.lastCompletedDate = today;
        
        // Update streak
        newProgress.daily.currentStreak++;
        if (newProgress.daily.currentStreak > newProgress.daily.longestStreak) {
          newProgress.daily.longestStreak = newProgress.daily.currentStreak;
        }
      }
      
      // Save daily game stats
      newProgress.daily.games[selectedGame.id] = {
        completed: true,
        attempts: (newProgress.daily.games[selectedGame.id]?.attempts || 0) + 1,
        bestScore: {
          mistakes: gameStats.mistakes,
          hintsUsed: gameStats.hintsUsed,
          time: '2:30' // Mock time for now
        }
      };
    } else {
      // Regular level game completion
      const levelKey = selectedLevel;
      const gameId = selectedGame.id;
      
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
    }
    
    saveProgress(newProgress);
  };

  const handleBackToMenu = () => {
    if (selectedGame && selectedGame.id && selectedGame.id.startsWith('daily-')) {
      setCurrentView('daily');
    } else {
      setCurrentView('games');
    }
    setSelectedGame(null);
  };

  const handleBackToLevels = () => {
    setCurrentView('levels');
    setSelectedLevel(null);
  };

  const handleBackToMenuFromDaily = () => {
    setCurrentView('levels');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <BrowserRouter>
        <div className="container mx-auto py-8">
          {currentView === 'levels' && (
            <LevelSelect 
              gameLevels={gameLevels}
              onSelectLevel={handleSelectLevel}
              onSelectDaily={handleSelectDaily}
              playerProgress={playerProgress}
            />
          )}
          
          {currentView === 'daily' && (
            <DailyChallenge 
              onPlayDaily={handlePlayDaily}
              onBackToMenu={handleBackToMenuFromDaily}
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