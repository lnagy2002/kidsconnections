#!/usr/bin/env python3
"""
Script to add new games to Brain Connections database
Run this script to add more games to your app
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

async def add_new_games():
    """Add new games to the database"""
    database = Database(mongo_url, db_name)
    
    # Define new games to add
    new_games = [
        # Easy Level Games
        Game(
            level="easy",
            title="Kitchen Fun",
            words=[
                "SPOON", "FORK", "KNIFE", "PLATE",
                "APPLE", "BREAD", "MILK", "WATER", 
                "MOM", "DAD", "COOK", "EAT",
                "HOT", "COLD", "SWEET", "SOUR"
            ],
            groups=[
                GameGroup(category="Kitchen Tools", words=["SPOON", "FORK", "KNIFE", "PLATE"], difficulty=1),
                GameGroup(category="Food & Drink", words=["APPLE", "BREAD", "MILK", "WATER"], difficulty=2),
                GameGroup(category="Kitchen Actions", words=["MOM", "DAD", "COOK", "EAT"], difficulty=3),
                GameGroup(category="Tastes", words=["HOT", "COLD", "SWEET", "SOUR"], difficulty=4)
            ]
        ),
        
        Game(
            level="easy", 
            title="Transportation",
            words=[
                "CAR", "BUS", "BIKE", "TRAIN",
                "FAST", "SLOW", "STOP", "GO",
                "RED", "GREEN", "YELLOW", "BLUE",
                "ROAD", "BRIDGE", "TUNNEL", "PARK"
            ],
            groups=[
                GameGroup(category="Vehicles", words=["CAR", "BUS", "BIKE", "TRAIN"], difficulty=1),
                GameGroup(category="Speed Words", words=["FAST", "SLOW", "STOP", "GO"], difficulty=2), 
                GameGroup(category="Traffic Colors", words=["RED", "GREEN", "YELLOW", "BLUE"], difficulty=3),
                GameGroup(category="Places to Go", words=["ROAD", "BRIDGE", "TUNNEL", "PARK"], difficulty=4)
            ]
        ),

        # Medium Level Games
        Game(
            level="medium",
            title="Ocean Adventures", 
            words=[
                "SHARK", "DOLPHIN", "WHALE", "OCTOPUS",
                "CORAL", "SEAWEED", "SAND", "SHELL",
                "SWIM", "DIVE", "SURF", "FLOAT",
                "SALTY", "DEEP", "BLUE", "COLD"
            ],
            groups=[
                GameGroup(category="Sea Creatures", words=["SHARK", "DOLPHIN", "WHALE", "OCTOPUS"], difficulty=1),
                GameGroup(category="Ocean Floor", words=["CORAL", "SEAWEED", "SAND", "SHELL"], difficulty=2),
                GameGroup(category="Water Activities", words=["SWIM", "DIVE", "SURF", "FLOAT"], difficulty=3),
                GameGroup(category="Ocean Description", words=["SALTY", "DEEP", "BLUE", "COLD"], difficulty=4)
            ]
        ),

        Game(
            level="medium",
            title="Forest Ecosystem",
            words=[
                "TREE", "BRANCH", "LEAF", "ROOT",
                "BEAR", "DEER", "RABBIT", "SQUIRREL", 
                "ACORN", "BERRY", "MUSHROOM", "FLOWER",
                "SHADE", "QUIET", "GREEN", "FRESH"
            ],
            groups=[
                GameGroup(category="Tree Parts", words=["TREE", "BRANCH", "LEAF", "ROOT"], difficulty=1),
                GameGroup(category="Forest Animals", words=["BEAR", "DEER", "RABBIT", "SQUIRREL"], difficulty=2),
                GameGroup(category="Forest Food", words=["ACORN", "BERRY", "MUSHROOM", "FLOWER"], difficulty=3), 
                GameGroup(category="Forest Feel", words=["SHADE", "QUIET", "GREEN", "FRESH"], difficulty=4)
            ]
        ),

        # Hard Level Games  
        Game(
            level="hard",
            title="Human Body Systems",
            words=[
                "HEART", "LUNGS", "BRAIN", "STOMACH",
                "BLOOD", "OXYGEN", "NUTRIENTS", "WASTE",
                "PUMP", "FILTER", "PROCESS", "DIGEST",
                "CIRCULATION", "RESPIRATION", "NERVOUS", "DIGESTIVE"
            ],
            groups=[
                GameGroup(category="Major Organs", words=["HEART", "LUNGS", "BRAIN", "STOMACH"], difficulty=1),
                GameGroup(category="Body Substances", words=["BLOOD", "OXYGEN", "NUTRIENTS", "WASTE"], difficulty=2),
                GameGroup(category="Body Functions", words=["PUMP", "FILTER", "PROCESS", "DIGEST"], difficulty=3),
                GameGroup(category="Body Systems", words=["CIRCULATION", "RESPIRATION", "NERVOUS", "DIGESTIVE"], difficulty=4)
            ]
        ),

        # Youth Level Games
        Game(
            level="youth",
            title="World Cultures",
            words=[
                "TRADITION", "CUSTOM", "RITUAL", "CEREMONY", 
                "LANGUAGE", "DIALECT", "ACCENT", "SCRIPT",
                "HERITAGE", "ANCESTRY", "LEGACY", "IDENTITY",
                "DIVERSITY", "UNITY", "RESPECT", "UNDERSTANDING"
            ],
            groups=[
                GameGroup(category="Cultural Practices", words=["TRADITION", "CUSTOM", "RITUAL", "CEREMONY"], difficulty=1),
                GameGroup(category="Communication", words=["LANGUAGE", "DIALECT", "ACCENT", "SCRIPT"], difficulty=2),
                GameGroup(category="Cultural Identity", words=["HERITAGE", "ANCESTRY", "LEGACY", "IDENTITY"], difficulty=3),
                GameGroup(category="Cultural Values", words=["DIVERSITY", "UNITY", "RESPECT", "UNDERSTANDING"], difficulty=4)
            ]
        )
    ]
    
    # Add games to database
    added_count = 0
    for game in new_games:
        try:
            await database.create_game(game)
            print(f"✅ Added game: {game.title} ({game.level})")
            added_count += 1
        except Exception as e:
            print(f"❌ Failed to add {game.title}: {e}")
    
    print(f"\n🎉 Successfully added {added_count} new games!")
    await database.close()

if __name__ == "__main__":
    asyncio.run(add_new_games())