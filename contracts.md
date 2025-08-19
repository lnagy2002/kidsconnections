# Backend Development Contracts

## API Endpoints Required

### 1. Game Data Endpoints
```
GET /api/games/levels - Get all game levels and their games
GET /api/games/level/{level_key} - Get specific level games  
GET /api/games/{game_id} - Get specific game data
GET /api/games/daily - Get today's daily challenge
```

### 2. User Progress Endpoints
```
GET /api/progress - Get user's complete progress
POST /api/progress/game - Update game completion
POST /api/progress/daily - Update daily challenge completion
PUT /api/progress/reset - Reset user progress (optional)
```

### 3. Statistics Endpoints
```
GET /api/stats/user - Get user statistics
GET /api/stats/global - Get global leaderboard (future)
```

## Data Models

### Game Model
```javascript
{
  id: String,
  level: String, // 'easy', 'medium', 'hard', 'youth'
  title: String,
  words: [String], // 16 words
  groups: [{
    category: String,
    words: [String], // 4 words
    difficulty: Number // 1-4
  }],
  isDaily: Boolean,
  dailyDate: String // YYYY-MM-DD for daily games
}
```

### UserProgress Model
```javascript
{
  userId: String, // Session-based for now
  levels: {
    easy: {
      completedGames: Number,
      perfectGames: Number,
      games: {
        [gameId]: {
          completed: Boolean,
          attempts: Number,
          bestScore: {
            mistakes: Number,
            hintsUsed: Number,
            timeSeconds: Number
          }
        }
      }
    },
    // ... same for medium, hard, youth
  },
  daily: {
    completedToday: Boolean,
    currentStreak: Number,
    longestStreak: Number,
    totalCompleted: Number,
    lastCompletedDate: String,
    games: {
      [dailyId]: {
        completed: Boolean,
        attempts: Number,
        bestScore: Object
      }
    }
  }
}
```

## Mock Data to Replace

### From gameData.js:
- `gameLevels` object → Database games collection
- Static game data → Dynamic game fetching

### From dailyGameData.js:
- `dailyGames` object → Database with daily games
- `getTodaysDailyGame()` → Backend API call
- Local progress tracking → Database user progress

### From App.js:
- `playerProgress` state → API-driven progress
- `localStorage` persistence → Database persistence

## Backend Implementation Plan

### Phase 1: Models & Database
1. Create Game and UserProgress MongoDB models
2. Seed database with initial game data
3. Set up daily game rotation logic

### Phase 2: API Endpoints
1. Game data endpoints with proper error handling
2. User progress CRUD operations
3. Daily challenge logic with date-based selection

### Phase 3: Frontend Integration
1. Replace mock data imports with API calls
2. Add loading states and error handling
3. Update progress tracking to use backend
4. Remove localStorage, use session-based users

### Phase 4: Enhanced Features
1. Better daily game algorithm
2. Achievement system in backend
3. Statistics and analytics
4. Performance optimizations

## Frontend Changes Required

### Remove Mock Dependencies:
```javascript
// Remove these imports:
import { gameLevels } from "./mock/gameData";
import { getTodaysDailyGame } from "./mock/dailyGameData";
```

### Add API Service:
```javascript
// New api service for all backend calls
const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

// Replace with actual API calls:
- fetchGameLevels()
- fetchDailyChallenge() 
- updateGameProgress()
- updateDailyProgress()
- fetchUserProgress()
```

### Update Components:
- Add loading states to LevelSelect, GameSelect, DailyChallenge
- Add error handling for API failures
- Replace local state management with API-driven state
- Add retry mechanisms for failed requests

## Session Management
- Use browser fingerprinting or simple session IDs
- No authentication required initially
- Progress tied to session/device
- Future: Add user accounts and cloud sync

## Error Handling Strategy
- Graceful degradation to mock data if API fails
- User-friendly error messages
- Retry logic for network failures
- Offline support considerations

## Testing Strategy
- Test all API endpoints with different scenarios
- Test frontend integration with loading/error states
- Test daily game rotation logic
- Test progress persistence and retrieval