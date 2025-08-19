import { useState, useEffect } from 'react';
import apiService from '../services/api';
import { gameLevels as fallbackGameLevels } from '../mock/gameData';
import { getLevelDailyGame as fallbackGetLevelDailyGame } from '../mock/dailyGameData';

// Custom hook for managing game data
export const useGameLevels = () => {
  const [gameLevels, setGameLevels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameLevels = async () => {
      try {
        setLoading(true);
        const levels = await apiService.getGameLevels();
        setGameLevels(levels);
        setError(null);
      } catch (err) {
        console.warn('Failed to fetch game levels from API, using fallback data:', err);
        setGameLevels(fallbackGameLevels);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameLevels();
  }, []);

  return { gameLevels, loading, error, refetch: () => window.location.reload() };
};

// Custom hook for daily games
export const useDailyGame = (level) => {
  const [dailyGame, setDailyGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!level) return;

    const fetchDailyGame = async () => {
      try {
        setLoading(true);
        const game = await apiService.getDailyGame(level);
        setDailyGame(game);
        setError(null);
      } catch (err) {
        console.warn(`Failed to fetch daily game for ${level}, using fallback:`, err);
        const fallbackGame = fallbackGetLevelDailyGame(level);
        setDailyGame(fallbackGame);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyGame();
  }, [level]);

  return { dailyGame, loading, error };
};

// Custom hook for user progress
export const useUserProgress = () => {
  const [progress, setProgress] = useState({
    easy: { completedGames: 0, perfectGames: 0, games: {} },
    medium: { completedGames: 0, perfectGames: 0, games: {} },
    hard: { completedGames: 0, perfectGames: 0, games: {} },
    youth: { completedGames: 0, perfectGames: 0, games: {} },
    daily: { 
      easy: { completedToday: false, currentStreak: 0, longestStreak: 0, totalCompleted: 0, lastCompletedDate: null, games: {} },
      medium: { completedToday: false, currentStreak: 0, longestStreak: 0, totalCompleted: 0, lastCompletedDate: null, games: {} },
      hard: { completedToday: false, currentStreak: 0, longestStreak: 0, totalCompleted: 0, lastCompletedDate: null, games: {} },
      youth: { completedToday: false, currentStreak: 0, longestStreak: 0, totalCompleted: 0, lastCompletedDate: null, games: {} }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const userProgress = await apiService.getUserProgress();
      setProgress(userProgress);
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch user progress from API:', err);
      // Keep using local storage as fallback
      const savedProgress = localStorage.getItem('brainConnectionProgress');
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      }
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const updateGameProgress = async (gameId, mistakes, hintsUsed, timeSeconds) => {
    try {
      const result = await apiService.completeGame(gameId, mistakes, hintsUsed, timeSeconds);
      if (result.success) {
        setProgress(result.progress);
        // Also update localStorage as backup
        localStorage.setItem('brainConnectionProgress', JSON.stringify(result.progress));
      }
      return result;
    } catch (err) {
      console.error('Failed to update game progress:', err);
      throw err;
    }
  };

  const updateDailyProgress = async (gameId, level, mistakes, hintsUsed, timeSeconds) => {
    try {
      const result = await apiService.completeDailyGame(gameId, level, mistakes, hintsUsed, timeSeconds);
      if (result.success) {
        setProgress(result.progress);
        // Also update localStorage as backup
        localStorage.setItem('brainConnectionProgress', JSON.stringify(result.progress));
      }
      return result;
    } catch (err) {
      console.error('Failed to update daily progress:', err);
      throw err;
    }
  };

  return {
    progress,
    loading,
    error,
    updateGameProgress,
    updateDailyProgress,
    refetchProgress: fetchProgress
  };
};