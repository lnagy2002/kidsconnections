from motor.motor_asyncio import AsyncIOMotorClient
from models import Game, UserProgress, GameGroup
import os
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, mongo_url: str, db_name: str):
        self.client = AsyncIOMotorClient(mongo_url)
        self.db = self.client[db_name]
        self.games = self.db.games
        self.user_progress = self.db.user_progress
        
    async def close(self):
        self.client.close()

    # Game CRUD Operations
    async def create_game(self, game: Game) -> Game:
        game_dict = game.dict()
        await self.games.insert_one(game_dict)
        return game

    async def get_games_by_level(self, level: str) -> list:
        games = await self.games.find({"level": level, "isDaily": False}).to_list(1000)
        # Convert ObjectId to string for JSON serialization
        for game in games:
            if '_id' in game:
                del game['_id']
        return games

    async def get_all_levels(self) -> dict:
        levels = {}
        for level in ['easy', 'medium', 'hard', 'youth']:
            games = await self.get_games_by_level(level)
            levels[level] = {
                'title': self._get_level_title(level),
                'description': self._get_level_description(level),
                'games': games
            }
        return levels

    async def get_game_by_id(self, game_id: str) -> dict:
        game = await self.games.find_one({"id": game_id})
        if game and '_id' in game:
            del game['_id']
        return game

    async def get_daily_game(self, level: str, date: str) -> dict:
        # Try to find existing daily game for this level and date
        daily_game = await self.games.find_one({
            "level": level,
            "isDaily": True,
            "dailyDate": date
        })
        
        if daily_game:
            return daily_game
            
        # If no daily game exists, create one from regular games
        return await self._generate_daily_game(level, date)

    async def _generate_daily_game(self, level: str, date: str) -> dict:
        # Get regular games for this level
        regular_games = await self.get_games_by_level(level)
        
        if not regular_games:
            return None
            
        # Use date to deterministically select a game
        date_hash = hash(date + level) % len(regular_games)
        selected_game = regular_games[date_hash]
        
        # Create daily version
        daily_game = {
            **selected_game,
            "id": f"daily-{level}-{date}",
            "title": f"Daily {selected_game['title']}",
            "isDaily": True,
            "dailyDate": date
        }
        
        # Store daily game
        await self.games.insert_one(daily_game)
        return daily_game

    # User Progress CRUD Operations
    async def get_user_progress(self, user_id: str) -> dict:
        progress = await self.user_progress.find_one({"userId": user_id})
        if not progress:
            # Create new user progress
            new_progress = UserProgress(userId=user_id)
            await self.user_progress.insert_one(new_progress.dict())
            return new_progress.dict()
        return progress

    async def update_user_progress(self, user_id: str, progress: dict) -> dict:
        progress["updated_at"] = datetime.utcnow()
        await self.user_progress.update_one(
            {"userId": user_id},
            {"$set": progress},
            upsert=True
        )
        return progress

    async def update_game_progress(self, user_id: str, level: str, game_id: str, 
                                 mistakes: int, hints_used: int, time_seconds: int):
        # Get current progress
        user_progress = await self.get_user_progress(user_id)
        
        # Initialize if needed
        if level not in user_progress:
            user_progress[level] = {"completedGames": 0, "perfectGames": 0, "games": {}}
        
        # Update game progress
        if game_id not in user_progress[level]["games"]:
            user_progress[level]["games"][game_id] = {"completed": False, "attempts": 0}
            user_progress[level]["completedGames"] += 1
        
        user_progress[level]["games"][game_id]["completed"] = True
        user_progress[level]["games"][game_id]["attempts"] += 1
        user_progress[level]["games"][game_id]["bestScore"] = {
            "mistakes": mistakes,
            "hintsUsed": hints_used,
            "timeSeconds": time_seconds
        }
        
        # Update perfect games count
        if mistakes == 0 and hints_used == 0:
            user_progress[level]["perfectGames"] += 1
        
        return await self.update_user_progress(user_id, user_progress)

    async def update_daily_progress(self, user_id: str, level: str, game_id: str,
                                  mistakes: int, hints_used: int, time_seconds: int):
        # Get current progress
        user_progress = await self.get_user_progress(user_id)
        today = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Initialize daily progress if needed
        if "daily" not in user_progress:
            user_progress["daily"] = {
                "easy": {"completedToday": False, "currentStreak": 0, "longestStreak": 0, 
                        "totalCompleted": 0, "lastCompletedDate": None, "games": {}},
                "medium": {"completedToday": False, "currentStreak": 0, "longestStreak": 0, 
                          "totalCompleted": 0, "lastCompletedDate": None, "games": {}},
                "hard": {"completedToday": False, "currentStreak": 0, "longestStreak": 0, 
                        "totalCompleted": 0, "lastCompletedDate": None, "games": {}},
                "youth": {"completedToday": False, "currentStreak": 0, "longestStreak": 0, 
                         "totalCompleted": 0, "lastCompletedDate": None, "games": {}}
            }
        
        if level not in user_progress["daily"]:
            user_progress["daily"][level] = {
                "completedToday": False, "currentStreak": 0, "longestStreak": 0,
                "totalCompleted": 0, "lastCompletedDate": None, "games": {}
            }
        
        # Update daily progress
        daily_level = user_progress["daily"][level]
        
        # Check if completing for first time today
        if not daily_level["completedToday"]:
            daily_level["completedToday"] = True
            daily_level["totalCompleted"] += 1
            daily_level["lastCompletedDate"] = today
            
            # Update streak
            daily_level["currentStreak"] += 1
            if daily_level["currentStreak"] > daily_level["longestStreak"]:
                daily_level["longestStreak"] = daily_level["currentStreak"]
        
        # Update game stats
        daily_level["games"][game_id] = {
            "completed": True,
            "attempts": daily_level["games"].get(game_id, {}).get("attempts", 0) + 1,
            "bestScore": {
                "mistakes": mistakes,
                "hintsUsed": hints_used,
                "timeSeconds": time_seconds
            }
        }
        
        return await self.update_user_progress(user_id, user_progress)

    # Helper methods
    def _get_level_title(self, level: str) -> str:
        titles = {
            'easy': 'Easy Level (Grades 1-2)',
            'medium': 'Medium Level (Grades 3-4)',
            'hard': 'Hard Level (Grades 5-6)',
            'youth': 'Youth Level (Grade 6+)'
        }
        return titles.get(level, 'Unknown Level')

    def _get_level_description(self, level: str) -> str:
        descriptions = {
            'easy': 'Simple patterns and categories',
            'medium': 'Pattern recognition and logical thinking',
            'hard': 'Complex associations and abstract thinking',
            'youth': 'Advanced pattern recognition and critical thinking'
        }
        return descriptions.get(level, 'Brain training challenges')

    # Seed database with initial games
    async def seed_games(self):
        # Check if games already exist
        existing_games = await self.games.count_documents({})
        if existing_games > 0:
            logger.info(f"Database already has {existing_games} games, skipping seed")
            return

        logger.info("Seeding database with initial games...")
        
        # Easy level games
        easy_games = [
            Game(
                level="easy",
                title="Colors and Shapes",
                words=["RED", "CIRCLE", "BLUE", "SQUARE", "DOG", "CAT", "BIRD", "FISH", 
                      "APPLE", "BANANA", "ORANGE", "GRAPE", "ONE", "TWO", "THREE", "FOUR"],
                groups=[
                    GameGroup(category="Colors", words=["RED", "BLUE", "ORANGE", "GRAPE"], difficulty=1),
                    GameGroup(category="Shapes", words=["CIRCLE", "SQUARE", "APPLE", "BANANA"], difficulty=2),
                    GameGroup(category="Animals", words=["DOG", "CAT", "BIRD", "FISH"], difficulty=3),
                    GameGroup(category="Numbers", words=["ONE", "TWO", "THREE", "FOUR"], difficulty=4)
                ]
            ),
            Game(
                level="easy",
                title="Home and Family",
                words=["MOM", "DAD", "BABY", "SISTER", "BED", "CHAIR", "TABLE", "LAMP",
                      "HAPPY", "SAD", "MAD", "GLAD", "HOT", "COLD", "WET", "DRY"],
                groups=[
                    GameGroup(category="Family", words=["MOM", "DAD", "BABY", "SISTER"], difficulty=1),
                    GameGroup(category="Furniture", words=["BED", "CHAIR", "TABLE", "LAMP"], difficulty=2),
                    GameGroup(category="Feelings", words=["HAPPY", "SAD", "MAD", "GLAD"], difficulty=3),
                    GameGroup(category="Opposites", words=["HOT", "COLD", "WET", "DRY"], difficulty=4)
                ]
            )
        ]
        
        # Medium level games
        medium_games = [
            Game(
                level="medium",
                title="Science and Nature",
                words=["BUTTERFLY", "CATERPILLAR", "COCOON", "WINGS", "RAIN", "SNOW", "HAIL", "SLEET",
                      "PLANETS", "STARS", "MOON", "SUN", "ROOTS", "STEM", "LEAVES", "FLOWER"],
                groups=[
                    GameGroup(category="Butterfly Life Cycle", words=["BUTTERFLY", "CATERPILLAR", "COCOON", "WINGS"], difficulty=1),
                    GameGroup(category="Weather Types", words=["RAIN", "SNOW", "HAIL", "SLEET"], difficulty=2),
                    GameGroup(category="Space Objects", words=["PLANETS", "STARS", "MOON", "SUN"], difficulty=3),
                    GameGroup(category="Plant Parts", words=["ROOTS", "STEM", "LEAVES", "FLOWER"], difficulty=4)
                ]
            )
        ]
        
        # Hard level games
        hard_games = [
            Game(
                level="hard",
                title="Geography and Culture",
                words=["DESERT", "OASIS", "CACTUS", "DUNES", "DEMOCRACY", "VOTE", "CITIZEN", "RIGHTS",
                      "FRACTION", "DECIMAL", "PERCENT", "RATIO", "EVAPORATION", "CONDENSATION", "PRECIPITATION", "COLLECTION"],
                groups=[
                    GameGroup(category="Desert Features", words=["DESERT", "OASIS", "CACTUS", "DUNES"], difficulty=1),
                    GameGroup(category="Civics Terms", words=["DEMOCRACY", "VOTE", "CITIZEN", "RIGHTS"], difficulty=2),
                    GameGroup(category="Math Concepts", words=["FRACTION", "DECIMAL", "PERCENT", "RATIO"], difficulty=3),
                    GameGroup(category="Water Cycle", words=["EVAPORATION", "CONDENSATION", "PRECIPITATION", "COLLECTION"], difficulty=4)
                ]
            )
        ]
        
        # Youth level games
        youth_games = [
            Game(
                level="youth",
                title="Literature and Logic",
                words=["METAPHOR", "SIMILE", "ALLITERATION", "HYPERBOLE", "HYPOTHESIS", "THEORY", "EVIDENCE", "CONCLUSION",
                      "RENAISSANCE", "MEDIEVAL", "BAROQUE", "ROMANTIC", "ALGORITHM", "VARIABLE", "FUNCTION", "LOOP"],
                groups=[
                    GameGroup(category="Literary Devices", words=["METAPHOR", "SIMILE", "ALLITERATION", "HYPERBOLE"], difficulty=1),
                    GameGroup(category="Scientific Method", words=["HYPOTHESIS", "THEORY", "EVIDENCE", "CONCLUSION"], difficulty=2),
                    GameGroup(category="Historical Periods", words=["RENAISSANCE", "MEDIEVAL", "BAROQUE", "ROMANTIC"], difficulty=3),
                    GameGroup(category="Programming Terms", words=["ALGORITHM", "VARIABLE", "FUNCTION", "LOOP"], difficulty=4)
                ]
            )
        ]
        
        # Insert all games
        all_games = easy_games + medium_games + hard_games + youth_games
        for game in all_games:
            await self.create_game(game)
        
        logger.info(f"Successfully seeded {len(all_games)} games to database")