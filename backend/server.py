from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from datetime import datetime
import uuid

# Import models and database
from models import (
    Game, GameCreate, UserProgress, GameCompleteRequest, 
    DailyGameCompleteRequest, GameLevelsResponse, StatsResponse
)
from database import Database

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'brain_connections')
database = Database(mongo_url, db_name)

# Create the main app
app = FastAPI(title="Brain Connections API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# User ID extraction from header
async def get_user_id(x_user_id: str = Header(default=None)) -> str:
    if not x_user_id:
        # Generate new user ID
        return str(uuid.uuid4())
    return x_user_id

# Health check
@api_router.get("/")
async def root():
    return {"message": "Brain Connections API is running!", "timestamp": datetime.utcnow()}

# Game Data Endpoints
@api_router.get("/games/levels", response_model=dict)
async def get_game_levels():
    """Get all game levels and their games"""
    try:
        levels = await database.get_all_levels()
        return levels
    except Exception as e:
        logger.error(f"Error fetching game levels: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch game levels")

@api_router.get("/games/level/{level_key}")
async def get_level_games(level_key: str):
    """Get games for a specific level"""
    try:
        if level_key not in ['easy', 'medium', 'hard', 'youth']:
            raise HTTPException(status_code=400, detail="Invalid level key")
        
        games = await database.get_games_by_level(level_key)
        return {
            "level": level_key,
            "games": games,
            "title": database._get_level_title(level_key),
            "description": database._get_level_description(level_key)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching level {level_key}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch level {level_key}")

@api_router.get("/games/{game_id}")
async def get_game(game_id: str):
    """Get specific game data"""
    try:
        game = await database.get_game_by_id(game_id)
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        return game
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching game {game_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch game")

@api_router.get("/games/daily/{level}")
async def get_daily_game(level: str):
    """Get today's daily challenge for a specific level"""
    try:
        if level not in ['easy', 'medium', 'hard', 'youth']:
            raise HTTPException(status_code=400, detail="Invalid level")
        
        today = datetime.utcnow().strftime('%Y-%m-%d')
        daily_game = await database.get_daily_game(level, today)
        
        if not daily_game:
            raise HTTPException(status_code=404, detail="No daily game available")
        
        return daily_game
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching daily game for {level}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch daily game")

# User Progress Endpoints
@api_router.get("/progress")
async def get_user_progress(user_id: str = Depends(get_user_id)):
    """Get user's complete progress"""
    try:
        progress = await database.get_user_progress(user_id)
        return progress
    except Exception as e:
        logger.error(f"Error fetching user progress for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user progress")

@api_router.post("/progress/game")
async def complete_game(
    request: GameCompleteRequest, 
    user_id: str = Depends(get_user_id)
):
    """Update game completion progress"""
    try:
        # Get the game to determine its level
        game = await database.get_game_by_id(request.gameId)
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        level = game["level"]
        progress = await database.update_game_progress(
            user_id, level, request.gameId, 
            request.mistakes, request.hintsUsed, request.timeSeconds
        )
        
        return {"success": True, "progress": progress}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating game progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to update game progress")

@api_router.post("/progress/daily")
async def complete_daily_game(
    request: DailyGameCompleteRequest,
    user_id: str = Depends(get_user_id)
):
    """Update daily challenge completion"""
    try:
        if request.level not in ['easy', 'medium', 'hard', 'youth']:
            raise HTTPException(status_code=400, detail="Invalid level")
        
        progress = await database.update_daily_progress(
            user_id, request.level, request.gameId,
            request.mistakes, request.hintsUsed, request.timeSeconds
        )
        
        return {"success": True, "progress": progress}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating daily progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to update daily progress")

# Statistics Endpoints
@api_router.get("/stats/user", response_model=StatsResponse)
async def get_user_stats(user_id: str = Depends(get_user_id)):
    """Get user statistics"""
    try:
        progress = await database.get_user_progress(user_id)
        
        # Calculate stats
        total_games = sum([
            progress.get('easy', {}).get('completedGames', 0),
            progress.get('medium', {}).get('completedGames', 0),
            progress.get('hard', {}).get('completedGames', 0),
            progress.get('youth', {}).get('completedGames', 0)
        ])
        
        total_perfect = sum([
            progress.get('easy', {}).get('perfectGames', 0),
            progress.get('medium', {}).get('perfectGames', 0),
            progress.get('hard', {}).get('perfectGames', 0),
            progress.get('youth', {}).get('perfectGames', 0)
        ])
        
        daily_progress = progress.get('daily', {})
        total_daily = sum([
            daily_progress.get('easy', {}).get('totalCompleted', 0),
            daily_progress.get('medium', {}).get('totalCompleted', 0),
            daily_progress.get('hard', {}).get('totalCompleted', 0),
            daily_progress.get('youth', {}).get('totalCompleted', 0)
        ])
        
        longest_streak = max([
            daily_progress.get('easy', {}).get('longestStreak', 0),
            daily_progress.get('medium', {}).get('longestStreak', 0),
            daily_progress.get('hard', {}).get('longestStreak', 0),
            daily_progress.get('youth', {}).get('longestStreak', 0)
        ])
        
        # Determine favorite level
        level_counts = {
            'easy': progress.get('easy', {}).get('completedGames', 0),
            'medium': progress.get('medium', {}).get('completedGames', 0),
            'hard': progress.get('hard', {}).get('completedGames', 0),
            'youth': progress.get('youth', {}).get('completedGames', 0)
        }
        favorite_level = max(level_counts, key=level_counts.get) if total_games > 0 else 'easy'
        
        return StatsResponse(
            totalGamesCompleted=total_games,
            totalPerfectGames=total_perfect,
            totalDailyCompleted=total_daily,
            longestDailyStreak=longest_streak,
            favoriteLevel=favorite_level
        )
    except Exception as e:
        logger.error(f"Error fetching user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user statistics")

# Include the router in the main app
app.include_router(api_router)

# Startup event to seed database
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Brain Connections API...")
    try:
        await database.seed_games()
        logger.info("Database seeding completed successfully")
    except Exception as e:
        logger.error(f"Error during startup: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Brain Connections API...")
    await database.close()