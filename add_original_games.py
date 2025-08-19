#!/usr/bin/env python3
"""
Add the original seeded games back to the database
"""

import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import Database
from models import Game, GameGroup

# Database configuration
mongo_url = "mongodb://localhost:27017"
db_name = "brain_connections"

async def add_original_games():
    """Add original seeded games to the database"""
    database = Database(mongo_url, db_name)
    
    # Define original games
    original_games = [
        # Easy level games
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
        ),
        
        # Medium level games
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
        ),
        
        # Hard level games
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
        ),
        
        # Youth level games
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
    
    # Add games to database
    added_count = 0
    for game in original_games:
        try:
            await database.create_game(game)
            print(f"✅ Added original game: {game.title} ({game.level})")
            added_count += 1
        except Exception as e:
            print(f"❌ Failed to add {game.title}: {e}")
    
    print(f"\n🎉 Successfully added {added_count} original games!")
    await database.close()

if __name__ == "__main__":
    asyncio.run(add_original_games())