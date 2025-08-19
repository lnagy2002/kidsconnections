import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LevelSelect from "./components/LevelSelect";
import GameSelect from "./components/GameSelect";
import GameBoard from "./components/GameBoard";
import DailyChallenge from "./components/DailyChallenge";
import LevelDailyChallenge from "./components/LevelDailyChallenge";
import { Toaster } from "./components/ui/toaster";
import { gameLevels } from "./mock/gameData";

function App() {
  const [currentView, setCurrentView] = useState('levels'); // 'levels', 'games', 'playing', 'daily', 'levelDaily'
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [playerProgress, setPlayerProgress] = useState({
    easy: { completedGames: 0, perfectGames: 0, games: {} },
    medium: { completedGames: 0, perfectGames: 0, games: {} },
    hard: { completedGames: 0, perfectGames: 0, games: {} },
    youth: { completedGames: 0, perfectGames: 0, games: {} },
    daily: { 
      // Level-specific daily progress
      easy: {
        completedToday: false, 
        currentStreak: 0, 
        longestStreak: 0, 
        totalCompleted: 0,
        lastCompletedDate: null,
        games: {}
      },
      medium: {
        completedToday: false, 
        currentStreak: 0, 
        longestStreak: 0, 
        totalCompleted: 0,
        lastCompletedDate: null,
        games: {}
      },
      hard: {
        completedToday: false, 
        currentStreak: 0, 
        longestStreak: 0, 
        totalCompleted: 0,
        lastCompletedDate: null,
        games: {}
      },
      youth: {
        completedToday: false, 
        currentStreak: 0, 
        longestStreak: 0, 
        totalCompleted: 0,
        lastCompletedDate: null,
        games: {}
      }
    }
  });

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('brainConnectionProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      
      // Check if daily progress needs to be reset (new day) for each level
      const today = new Date().toISOString().split('T')[0];
      
      if (progress.daily) {
        ['easy', 'medium', 'hard', 'youth'].forEach(level => {
          if (progress.daily[level] && progress.daily[level].lastCompletedDate !== today) {
            progress.daily[level].completedToday = false;
            
            // Update streak logic - if more than 1 day gap, reset streak
            if (progress.daily[level].lastCompletedDate) {
              const lastDate = new Date(progress.daily[level].lastCompletedDate);
              const todayDate = new Date(today);
              const diffTime = Math.abs(todayDate - lastDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays > 1) {
                progress.daily[level].currentStreak = 0;
              }
            }
          }
        });
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

  const handleSelectLevelDaily = (levelKey) => {
    setSelectedLevel(levelKey);
    setCurrentView('levelDaily');
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setCurrentView('playing');
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
      
      // Extract level from daily game ID (format: daily-{level}-{date})
      const gameIdParts = selectedGame.id.split('-');
      const dailyLevel = gameIdParts[1]; // easy, medium, hard, or youth
      
      // Initialize daily progress if not exists
      if (!newProgress.daily) {
        newProgress.daily = {};
      }
      if (!newProgress.daily[dailyLevel]) {
        newProgress.daily[dailyLevel] = { 
          completedToday: false, 
          currentStreak: 0, 
          longestStreak: 0, 
          totalCompleted: 0,
          lastCompletedDate: null,
          games: {} 
        };
      }
      
      // Update daily game completion for this level
      if (!newProgress.daily[dailyLevel].completedToday) {
        newProgress.daily[dailyLevel].completedToday = true;
        newProgress.daily[dailyLevel].totalCompleted++;
        newProgress.daily[dailyLevel].lastCompletedDate = today;
        
        // Update streak
        newProgress.daily[dailyLevel].currentStreak++;
        if (newProgress.daily[dailyLevel].currentStreak > newProgress.daily[dailyLevel].longestStreak) {
          newProgress.daily[dailyLevel].longestStreak = newProgress.daily[dailyLevel].currentStreak;
        }
      }
      
      // Save daily game stats
      newProgress.daily[dailyLevel].games[selectedGame.id] = {
        completed: true,
        attempts: (newProgress.daily[dailyLevel].games[selectedGame.id]?.attempts || 0) + 1,
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
      // If it's a level-specific daily game, go back to level daily view
      setCurrentView('levelDaily');
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
    <div className="min-h-screen">
      <BrowserRouter>
        <div className="min-h-screen">
          {currentView === 'levels' && (
            <LevelSelect 
              gameLevels={gameLevels}
              onSelectLevel={handleSelectLevel}
              onSelectLevelDaily={handleSelectLevelDaily}
              playerProgress={playerProgress}
            />
          )}
          
          {currentView === 'levelDaily' && selectedLevel && (
            <LevelDailyChallenge 
              level={selectedLevel}
              onPlayDaily={handlePlayDaily}
              onBackToMenu={handleBackToMenuFromDaily}
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