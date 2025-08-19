import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LevelSelect from "./components/LevelSelect";
import GameSelect from "./components/GameSelect";
import GameBoard from "./components/GameBoard";
import DailyChallenge from "./components/DailyChallenge";
import LevelDailyChallenge from "./components/LevelDailyChallenge";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorMessage from "./components/ErrorMessage";
import { Toaster } from "./components/ui/toaster";
import { useGameLevels, useUserProgress } from "./hooks/useGameData";

function App() {
  const [currentView, setCurrentView] = useState('levels');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  // Use custom hooks for data management
  const { gameLevels, loading: gameLevelsLoading, error: gameLevelsError } = useGameLevels();
  const { 
    progress: playerProgress, 
    loading: progressLoading, 
    error: progressError,
    updateGameProgress,
    updateDailyProgress 
  } = useUserProgress();

  // Handle navigation
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

  const handleGameComplete = async (gameStats) => {
    try {
      // Check if this is a daily game
      if (selectedGame && selectedGame.id && selectedGame.id.startsWith('daily-')) {
        const gameIdParts = selectedGame.id.split('-');
        const dailyLevel = gameIdParts[1]; // easy, medium, hard, or youth
        
        await updateDailyProgress(
          selectedGame.id, 
          dailyLevel, 
          gameStats.mistakes, 
          gameStats.hintsUsed, 
          gameStats.timeSeconds || 150
        );
      } else {
        // Regular game completion
        await updateGameProgress(
          selectedGame.id,
          gameStats.mistakes,
          gameStats.hintsUsed,
          gameStats.timeSeconds || 150
        );
      }
    } catch (error) {
      console.error('Failed to save game progress:', error);
      // Game completion UI still shows, just progress isn't saved to server
    }
  };

  const handleBackToMenu = () => {
    if (selectedGame && selectedGame.id && selectedGame.id.startsWith('daily-')) {
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

  // Show loading state
  if (gameLevelsLoading || progressLoading) {
    return <LoadingSpinner message="Preparing your brain training experience..." />;
  }

  // Show error state
  if (gameLevelsError && !gameLevels) {
    return (
      <ErrorMessage 
        error={gameLevelsError}
        title="Unable to Load Games"
        onRetry={() => window.location.reload()}
      />
    );
  }

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
          
          {currentView === 'games' && selectedLevel && gameLevels && (
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