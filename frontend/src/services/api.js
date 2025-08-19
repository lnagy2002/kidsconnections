import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Generate or get user ID (simple session-based approach)
const getUserId = () => {
  let userId = localStorage.getItem('brainConnections_userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('brainConnections_userId', userId);
  }
  return userId;
};

// Add user ID to all requests
apiClient.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = getUserId();
  return config;
});

// API service class
class ApiService {
  // Game Data APIs
  async getGameLevels() {
    try {
      const response = await apiClient.get('/games/levels');
      return response.data;
    } catch (error) {
      console.error('Error fetching game levels:', error);
      throw this.handleError(error);
    }
  }

  async getLevelGames(levelKey) {
    try {
      const response = await apiClient.get(`/games/level/${levelKey}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${levelKey} games:`, error);
      throw this.handleError(error);
    }
  }

  async getGame(gameId) {
    try {
      const response = await apiClient.get(`/games/${gameId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching game ${gameId}:`, error);
      throw this.handleError(error);
    }
  }

  async getDailyGame(level) {
    try {
      const response = await apiClient.get(`/games/daily/${level}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching daily game for ${level}:`, error);
      throw this.handleError(error);
    }
  }

  // User Progress APIs
  async getUserProgress() {
    try {
      const response = await apiClient.get('/progress');
      return response.data;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw this.handleError(error);
    }
  }

  async completeGame(gameId, mistakes, hintsUsed, timeSeconds = 150) {
    try {
      const response = await apiClient.post('/progress/game', {
        gameId,
        mistakes,
        hintsUsed,
        timeSeconds
      });
      return response.data;
    } catch (error) {
      console.error('Error completing game:', error);
      throw this.handleError(error);
    }
  }

  async completeDailyGame(gameId, level, mistakes, hintsUsed, timeSeconds = 150) {
    try {
      const response = await apiClient.post('/progress/daily', {
        gameId,
        level,
        mistakes,
        hintsUsed,
        timeSeconds
      });
      return response.data;
    } catch (error) {
      console.error('Error completing daily game:', error);
      throw this.handleError(error);
    }
  }

  // Statistics APIs
  async getUserStats() {
    try {
      const response = await apiClient.get('/stats/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw this.handleError(error);
    }
  }

  // Helper methods
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.detail || 'Server error occurred',
        status: error.response.status,
        type: 'server_error'
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Unable to connect to server. Please check your internet connection.',
        type: 'network_error'
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        type: 'client_error'
      };
    }
  }

  // Utility method to check if we're in offline mode
  isOffline() {
    return !navigator.onLine;
  }

  // Get user ID for debugging
  getCurrentUserId() {
    return getUserId();
  }
}

// Export singleton instance
export default new ApiService();