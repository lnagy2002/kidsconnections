from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
import uuid

# Game Models
class GameGroup(BaseModel):
    category: str
    words: List[str]
    difficulty: int  # 1-4

class Game(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level: str  # 'easy', 'medium', 'hard', 'youth'
    title: str
    words: List[str]  # 16 words
    groups: List[GameGroup]
    isDaily: bool = False
    dailyDate: Optional[str] = None  # YYYY-MM-DD for daily games
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GameCreate(BaseModel):
    level: str
    title: str
    words: List[str]
    groups: List[GameGroup]
    isDaily: bool = False
    dailyDate: Optional[str] = None

# User Progress Models
class BestScore(BaseModel):
    mistakes: int
    hintsUsed: int
    timeSeconds: int = 150  # default 2:30

class GameProgress(BaseModel):
    completed: bool = False
    attempts: int = 0
    bestScore: Optional[BestScore] = None

class LevelProgress(BaseModel):
    completedGames: int = 0
    perfectGames: int = 0
    games: Dict[str, GameProgress] = {}

class DailyLevelProgress(BaseModel):
    completedToday: bool = False
    currentStreak: int = 0
    longestStreak: int = 0
    totalCompleted: int = 0
    lastCompletedDate: Optional[str] = None
    games: Dict[str, GameProgress] = {}

class DailyProgress(BaseModel):
    easy: DailyLevelProgress = Field(default_factory=DailyLevelProgress)
    medium: DailyLevelProgress = Field(default_factory=DailyLevelProgress)
    hard: DailyLevelProgress = Field(default_factory=DailyLevelProgress)
    youth: DailyLevelProgress = Field(default_factory=DailyLevelProgress)

class UserProgress(BaseModel):
    userId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    easy: LevelProgress = Field(default_factory=LevelProgress)
    medium: LevelProgress = Field(default_factory=LevelProgress)
    hard: LevelProgress = Field(default_factory=LevelProgress)
    youth: LevelProgress = Field(default_factory=LevelProgress)
    daily: DailyProgress = Field(default_factory=DailyProgress)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# API Request/Response Models
class GameCompleteRequest(BaseModel):
    gameId: str
    mistakes: int
    hintsUsed: int
    timeSeconds: int = 150

class DailyGameCompleteRequest(BaseModel):
    gameId: str
    level: str
    mistakes: int
    hintsUsed: int
    timeSeconds: int = 150

class GameLevelsResponse(BaseModel):
    easy: Dict
    medium: Dict
    hard: Dict
    youth: Dict

class StatsResponse(BaseModel):
    totalGamesCompleted: int
    totalPerfectGames: int
    totalDailyCompleted: int
    longestDailyStreak: int
    favoriteLevel: str