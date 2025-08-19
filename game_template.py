#!/usr/bin/env python3
"""
Game Creation Template
Use this template to create new games for Brain Connections
"""

# GAME CREATION TEMPLATE
# Copy this template and modify it to create new games

GAME_TEMPLATE = {
    "level": "easy",  # Choose: "easy", "medium", "hard", "youth"
    "title": "Your Game Title",
    "words": [
        # 16 words total - arrange them randomly, not in groups
        "WORD1", "WORD2", "WORD3", "WORD4",   # Group 1 words (mixed in)
        "WORD5", "WORD6", "WORD7", "WORD8",   # Group 2 words (mixed in) 
        "WORD9", "WORD10", "WORD11", "WORD12", # Group 3 words (mixed in)
        "WORD13", "WORD14", "WORD15", "WORD16" # Group 4 words (mixed in)
    ],
    "groups": [
        {
            "category": "Group 1 Name",
            "words": ["WORD1", "WORD2", "WORD3", "WORD4"],
            "difficulty": 1  # 1 = easiest to find
        },
        {
            "category": "Group 2 Name", 
            "words": ["WORD5", "WORD6", "WORD7", "WORD8"],
            "difficulty": 2
        },
        {
            "category": "Group 3 Name",
            "words": ["WORD9", "WORD10", "WORD11", "WORD12"], 
            "difficulty": 3
        },
        {
            "category": "Group 4 Name",
            "words": ["WORD13", "WORD14", "WORD15", "WORD16"],
            "difficulty": 4  # 4 = hardest to find
        }
    ]
}

# LEVEL GUIDELINES:
# 
# EASY (Grades 1-2):
# - Simple, concrete concepts kids know
# - Basic categories like colors, animals, family
# - Short, familiar words
# - Clear, obvious connections
#
# MEDIUM (Grades 3-4): 
# - More complex concepts and relationships
# - Science, nature, geography topics
# - Longer words, some abstract thinking
# - Connections require some knowledge
#
# HARD (Grades 5-6):
# - Academic subjects and advanced concepts  
# - History, math, science, literature
# - Abstract thinking and complex relationships
# - May require specific knowledge
#
# YOUTH (Grade 6+):
# - Advanced academic and life concepts
# - Critical thinking and analysis
# - Complex vocabulary and ideas
# - Multi-layered connections

# EXAMPLE GAMES FOR EACH LEVEL:

EASY_EXAMPLE = {
    "level": "easy",
    "title": "My School Day", 
    "words": [
        "TEACHER", "STUDENT", "PRINCIPAL", "NURSE",
        "BOOK", "PENCIL", "PAPER", "CRAYON",
        "MATH", "READING", "ART", "MUSIC", 
        "LUNCH", "RECESS", "HOMEWORK", "TEST"
    ],
    "groups": [
        {"category": "School People", "words": ["TEACHER", "STUDENT", "PRINCIPAL", "NURSE"], "difficulty": 1},
        {"category": "School Supplies", "words": ["BOOK", "PENCIL", "PAPER", "CRAYON"], "difficulty": 2},
        {"category": "School Subjects", "words": ["MATH", "READING", "ART", "MUSIC"], "difficulty": 3},
        {"category": "School Activities", "words": ["LUNCH", "RECESS", "HOMEWORK", "TEST"], "difficulty": 4}
    ]
}

MEDIUM_EXAMPLE = {
    "level": "medium",
    "title": "Weather and Climate",
    "words": [
        "TORNADO", "HURRICANE", "BLIZZARD", "THUNDERSTORM",
        "BAROMETER", "THERMOMETER", "ANEMOMETER", "HYGROMETER",
        "CUMULUS", "STRATUS", "CIRRUS", "NIMBUS",
        "PRECIPITATION", "EVAPORATION", "CONDENSATION", "SUBLIMATION"
    ],
    "groups": [
        {"category": "Severe Weather", "words": ["TORNADO", "HURRICANE", "BLIZZARD", "THUNDERSTORM"], "difficulty": 1},
        {"category": "Weather Instruments", "words": ["BAROMETER", "THERMOMETER", "ANEMOMETER", "HYGROMETER"], "difficulty": 2},
        {"category": "Cloud Types", "words": ["CUMULUS", "STRATUS", "CIRRUS", "NIMBUS"], "difficulty": 3},
        {"category": "Water Cycle Processes", "words": ["PRECIPITATION", "EVAPORATION", "CONDENSATION", "SUBLIMATION"], "difficulty": 4}
    ]
}

HARD_EXAMPLE = {
    "level": "hard", 
    "title": "American Government",
    "words": [
        "EXECUTIVE", "LEGISLATIVE", "JUDICIAL", "CONSTITUTIONAL",
        "SENATE", "CONGRESS", "SUPREME", "FEDERAL",
        "VETO", "IMPEACH", "FILIBUSTER", "AMENDMENT", 
        "DEMOCRACY", "REPUBLIC", "FEDERALISM", "SEPARATION"
    ],
    "groups": [
        {"category": "Government Branches", "words": ["EXECUTIVE", "LEGISLATIVE", "JUDICIAL", "CONSTITUTIONAL"], "difficulty": 1},
        {"category": "Government Bodies", "words": ["SENATE", "CONGRESS", "SUPREME", "FEDERAL"], "difficulty": 2},
        {"category": "Political Processes", "words": ["VETO", "IMPEACH", "FILIBUSTER", "AMENDMENT"], "difficulty": 3},
        {"category": "Political Concepts", "words": ["DEMOCRACY", "REPUBLIC", "FEDERALISM", "SEPARATION"], "difficulty": 4}
    ]
}

YOUTH_EXAMPLE = {
    "level": "youth",
    "title": "Philosophy and Ethics", 
    "words": [
        "RATIONALISM", "EMPIRICISM", "SKEPTICISM", "PRAGMATISM",
        "DEONTOLOGY", "UTILITARIANISM", "VIRTUE", "CONSEQUENTIALISM", 
        "EPISTEMOLOGY", "METAPHYSICS", "ONTOLOGY", "PHENOMENOLOGY",
        "CATEGORICAL", "IMPERATIVE", "SYLLOGISM", "DIALECTIC"
    ],
    "groups": [
        {"category": "Schools of Thought", "words": ["RATIONALISM", "EMPIRICISM", "SKEPTICISM", "PRAGMATISM"], "difficulty": 1},
        {"category": "Ethical Theories", "words": ["DEONTOLOGY", "UTILITARIANISM", "VIRTUE", "CONSEQUENTIALISM"], "difficulty": 2},
        {"category": "Philosophy Branches", "words": ["EPISTEMOLOGY", "METAPHYSICS", "ONTOLOGY", "PHENOMENOLOGY"], "difficulty": 3},
        {"category": "Logical Concepts", "words": ["CATEGORICAL", "IMPERATIVE", "SYLLOGISM", "DIALECTIC"], "difficulty": 4}
    ]
}

print("Game Template loaded! Use the examples above to create your own games.")
print("Run the add_games_script.py to add games to your database.")