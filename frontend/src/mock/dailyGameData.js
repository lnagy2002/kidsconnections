// Level-specific daily game data with date-based selection for consistent daily puzzles

export const levelDailyGames = {
  easy: {
    "2025-01-19": {
      level: "easy",
      title: "Animal Families",
      words: [
        "PUPPY", "KITTEN", "CALF", "CHICK",
        "DOG", "CAT", "COW", "HEN",
        "WOOF", "MEOW", "MOO", "CLUCK",
        "BONE", "MILK", "CORN", "SEEDS"
      ],
      groups: [
        { category: "Baby Animals", words: ["PUPPY", "KITTEN", "CALF", "CHICK"], difficulty: 1 },
        { category: "Adult Animals", words: ["DOG", "CAT", "COW", "HEN"], difficulty: 2 },
        { category: "Animal Sounds", words: ["WOOF", "MEOW", "MOO", "CLUCK"], difficulty: 3 },
        { category: "Animal Food", words: ["BONE", "MILK", "CORN", "SEEDS"], difficulty: 4 }
      ]
    },
    "2025-01-20": {
      level: "easy",
      title: "Playground Fun",
      words: [
        "SWING", "SLIDE", "SEESAW", "MONKEY BARS",
        "RED", "BLUE", "GREEN", "YELLOW",
        "RUN", "JUMP", "CLIMB", "PLAY",
        "HAPPY", "FUN", "EXCITED", "CHEERFUL"
      ],
      groups: [
        { category: "Playground Equipment", words: ["SWING", "SLIDE", "SEESAW", "MONKEY BARS"], difficulty: 1 },
        { category: "Colors", words: ["RED", "BLUE", "GREEN", "YELLOW"], difficulty: 2 },
        { category: "Actions", words: ["RUN", "JUMP", "CLIMB", "PLAY"], difficulty: 3 },
        { category: "Happy Feelings", words: ["HAPPY", "FUN", "EXCITED", "CHEERFUL"], difficulty: 4 }
      ]
    }
  },
  medium: {
    "2025-01-19": {
      level: "medium",
      title: "Weather Patterns",
      words: [
        "THUNDER", "LIGHTNING", "RAIN", "STORM",
        "SNOWFLAKE", "BLIZZARD", "FROST", "ICE",
        "RAINBOW", "SUNSHINE", "BREEZE", "CLOUDS",
        "HOT", "COLD", "WARM", "COOL"
      ],
      groups: [
        { category: "Stormy Weather", words: ["THUNDER", "LIGHTNING", "RAIN", "STORM"], difficulty: 1 },
        { category: "Winter Weather", words: ["SNOWFLAKE", "BLIZZARD", "FROST", "ICE"], difficulty: 2 },
        { category: "Pleasant Weather", words: ["RAINBOW", "SUNSHINE", "BREEZE", "CLOUDS"], difficulty: 3 },
        { category: "Temperature Words", words: ["HOT", "COLD", "WARM", "COOL"], difficulty: 4 }
      ]
    },
    "2025-01-20": {
      level: "medium",
      title: "Solar System",
      words: [
        "MERCURY", "VENUS", "EARTH", "MARS",
        "CRATER", "ASTEROID", "COMET", "METEOR",
        "TELESCOPE", "ROCKET", "SATELLITE", "ASTRONAUT",
        "ORBIT", "GRAVITY", "ROTATION", "REVOLUTION"
      ],
      groups: [
        { category: "Inner Planets", words: ["MERCURY", "VENUS", "EARTH", "MARS"], difficulty: 1 },
        { category: "Space Objects", words: ["CRATER", "ASTEROID", "COMET", "METEOR"], difficulty: 2 },
        { category: "Space Equipment", words: ["TELESCOPE", "ROCKET", "SATELLITE", "ASTRONAUT"], difficulty: 3 },
        { category: "Space Motion", words: ["ORBIT", "GRAVITY", "ROTATION", "REVOLUTION"], difficulty: 4 }
      ]
    }
  },
  hard: {
    "2025-01-19": {
      level: "hard",
      title: "Ancient Civilizations",
      words: [
        "PYRAMID", "PHARAOH", "SPHINX", "HIEROGLYPH",
        "COLOSSEUM", "GLADIATOR", "CAESAR", "SENATOR",
        "DEMOCRACY", "PHILOSOPHY", "THEATER", "OLYMPICS",
        "CIVILIZATION", "EMPIRE", "CULTURE", "HERITAGE"
      ],
      groups: [
        { category: "Ancient Egypt", words: ["PYRAMID", "PHARAOH", "SPHINX", "HIEROGLYPH"], difficulty: 1 },
        { category: "Ancient Rome", words: ["COLOSSEUM", "GLADIATOR", "CAESAR", "SENATOR"], difficulty: 2 },
        { category: "Ancient Greece", words: ["DEMOCRACY", "PHILOSOPHY", "THEATER", "OLYMPICS"], difficulty: 3 },
        { category: "Historical Concepts", words: ["CIVILIZATION", "EMPIRE", "CULTURE", "HERITAGE"], difficulty: 4 }
      ]
    },
    "2025-01-20": {
      level: "hard",
      title: "Scientific Method",
      words: [
        "HYPOTHESIS", "EXPERIMENT", "VARIABLE", "CONTROL",
        "OBSERVATION", "DATA", "ANALYSIS", "CONCLUSION",
        "THEORY", "LAW", "PRINCIPLE", "EVIDENCE",
        "MICROSCOPE", "BEAKER", "FORMULA", "RESEARCH"
      ],
      groups: [
        { category: "Scientific Process", words: ["HYPOTHESIS", "EXPERIMENT", "VARIABLE", "CONTROL"], difficulty: 1 },
        { category: "Data Collection", words: ["OBSERVATION", "DATA", "ANALYSIS", "CONCLUSION"], difficulty: 2 },
        { category: "Scientific Knowledge", words: ["THEORY", "LAW", "PRINCIPLE", "EVIDENCE"], difficulty: 3 },
        { category: "Lab Equipment", words: ["MICROSCOPE", "BEAKER", "FORMULA", "RESEARCH"], difficulty: 4 }
      ]
    }
  },
  youth: {
    "2025-01-19": {
      level: "youth",
      title: "Economic Systems",
      words: [
        "SUPPLY", "DEMAND", "MARKET", "PRICE",
        "ENTREPRENEUR", "INNOVATION", "INVESTMENT", "PROFIT",
        "BUDGET", "SAVINGS", "EXPENSES", "INCOME",
        "INFLATION", "RECESSION", "GROWTH", "ECONOMY"
      ],
      groups: [
        { category: "Market Forces", words: ["SUPPLY", "DEMAND", "MARKET", "PRICE"], difficulty: 1 },
        { category: "Business Concepts", words: ["ENTREPRENEUR", "INNOVATION", "INVESTMENT", "PROFIT"], difficulty: 2 },
        { category: "Personal Finance", words: ["BUDGET", "SAVINGS", "EXPENSES", "INCOME"], difficulty: 3 },
        { category: "Economic Indicators", words: ["INFLATION", "RECESSION", "GROWTH", "ECONOMY"], difficulty: 4 }
      ]
    },
    "2025-01-20": {
      level: "youth",
      title: "Constitutional Government",
      words: [
        "CONSTITUTION", "AMENDMENT", "RATIFICATION", "PREAMBLE",
        "EXECUTIVE", "LEGISLATIVE", "JUDICIAL", "SEPARATION",
        "FEDERALISM", "REPUBLIC", "DEMOCRACY", "CITIZENSHIP",
        "RIGHTS", "FREEDOMS", "JUSTICE", "EQUALITY"
      ],
      groups: [
        { category: "Constitutional Terms", words: ["CONSTITUTION", "AMENDMENT", "RATIFICATION", "PREAMBLE"], difficulty: 1 },
        { category: "Branches of Government", words: ["EXECUTIVE", "LEGISLATIVE", "JUDICIAL", "SEPARATION"], difficulty: 2 },
        { category: "Government Types", words: ["FEDERALISM", "REPUBLIC", "DEMOCRACY", "CITIZENSHIP"], difficulty: 3 },
        { category: "Democratic Values", words: ["RIGHTS", "FREEDOMS", "JUSTICE", "EQUALITY"], difficulty: 4 }
      ]
    }
  }
};

// Generate level-specific daily game based on current date
export const getLevelDailyGame = (level) => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // If we have a specific game for today and this level, return it
  if (levelDailyGames[level] && levelDailyGames[level][dateString]) {
    return {
      ...levelDailyGames[level][dateString],
      date: dateString,
      id: `daily-${level}-${dateString}`
    };
  }
  
  // Otherwise, generate based on date using a simple algorithm
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  const gameIndex = daysSinceEpoch % 2; // Rotate through available games
  const availableGames = levelDailyGames[level] ? Object.values(levelDailyGames[level]) : [];
  
  if (availableGames.length > 0) {
    const selectedGame = availableGames[gameIndex % availableGames.length];
    return {
      ...selectedGame,
      date: dateString,
      id: `daily-${level}-${dateString}`
    };
  }
  
  // Fallback games for each level if no specific games are available
  const fallbackGames = {
    easy: {
      level: "easy",
      title: "Colors & Shapes",
      words: [
        "RED", "BLUE", "GREEN", "YELLOW",
        "CIRCLE", "SQUARE", "TRIANGLE", "RECTANGLE",
        "BIG", "SMALL", "TALL", "SHORT",
        "ONE", "TWO", "THREE", "FOUR"
      ],
      groups: [
        { category: "Colors", words: ["RED", "BLUE", "GREEN", "YELLOW"], difficulty: 1 },
        { category: "Shapes", words: ["CIRCLE", "SQUARE", "TRIANGLE", "RECTANGLE"], difficulty: 2 },
        { category: "Sizes", words: ["BIG", "SMALL", "TALL", "SHORT"], difficulty: 3 },
        { category: "Numbers", words: ["ONE", "TWO", "THREE", "FOUR"], difficulty: 4 }
      ]
    },
    medium: {
      level: "medium",
      title: "Nature Cycles",
      words: [
        "SEED", "SPROUT", "PLANT", "FLOWER",
        "SPRING", "SUMMER", "FALL", "WINTER",
        "RAIN", "SNOW", "SUN", "WIND",
        "GROW", "BLOOM", "WILT", "REST"
      ],
      groups: [
        { category: "Plant Growth", words: ["SEED", "SPROUT", "PLANT", "FLOWER"], difficulty: 1 },
        { category: "Seasons", words: ["SPRING", "SUMMER", "FALL", "WINTER"], difficulty: 2 },
        { category: "Weather", words: ["RAIN", "SNOW", "SUN", "WIND"], difficulty: 3 },
        { category: "Plant Actions", words: ["GROW", "BLOOM", "WILT", "REST"], difficulty: 4 }
      ]
    },
    hard: {
      level: "hard",
      title: "Mathematical Concepts",
      words: [
        "ADDITION", "SUBTRACTION", "MULTIPLICATION", "DIVISION",
        "FRACTION", "DECIMAL", "PERCENT", "RATIO",
        "GEOMETRY", "ALGEBRA", "STATISTICS", "PROBABILITY",
        "EQUATION", "VARIABLE", "SOLUTION", "PROOF"
      ],
      groups: [
        { category: "Basic Operations", words: ["ADDITION", "SUBTRACTION", "MULTIPLICATION", "DIVISION"], difficulty: 1 },
        { category: "Number Forms", words: ["FRACTION", "DECIMAL", "PERCENT", "RATIO"], difficulty: 2 },
        { category: "Math Branches", words: ["GEOMETRY", "ALGEBRA", "STATISTICS", "PROBABILITY"], difficulty: 3 },
        { category: "Problem Solving", words: ["EQUATION", "VARIABLE", "SOLUTION", "PROOF"], difficulty: 4 }
      ]
    },
    youth: {
      level: "youth",
      title: "Critical Thinking",
      words: [
        "ANALYSIS", "SYNTHESIS", "EVALUATION", "INFERENCE",
        "PREMISE", "CONCLUSION", "ARGUMENT", "LOGIC",
        "EVIDENCE", "ASSUMPTION", "BIAS", "PERSPECTIVE",
        "REASONING", "JUDGMENT", "DECISION", "REFLECTION"
      ],
      groups: [
        { category: "Thinking Skills", words: ["ANALYSIS", "SYNTHESIS", "EVALUATION", "INFERENCE"], difficulty: 1 },
        { category: "Logical Structure", words: ["PREMISE", "CONCLUSION", "ARGUMENT", "LOGIC"], difficulty: 2 },
        { category: "Information Quality", words: ["EVIDENCE", "ASSUMPTION", "BIAS", "PERSPECTIVE"], difficulty: 3 },
        { category: "Decision Making", words: ["REASONING", "JUDGMENT", "DECISION", "REFLECTION"], difficulty: 4 }
      ]
    }
  };
  
  return {
    ...fallbackGames[level],
    date: dateString,
    id: `daily-${level}-${dateString}`
  };
};

// Get time until next daily game (same for all levels)
export const getTimeUntilNextDaily = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set to midnight
  
  const timeDiff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
};

// Legacy function for backward compatibility
export const getTodaysDailyGame = () => {
  return getLevelDailyGame('easy'); // Default to easy level
};

export const dailyGameAchievements = [
  { id: "daily_first_easy", title: "Easy Daily Starter", description: "Complete your first easy daily challenge", icon: "🌅" },
  { id: "daily_first_medium", title: "Medium Daily Starter", description: "Complete your first medium daily challenge", icon: "🧠" },
  { id: "daily_first_hard", title: "Hard Daily Starter", description: "Complete your first hard daily challenge", icon: "⚡" },
  { id: "daily_first_youth", title: "Youth Daily Starter", description: "Complete your first youth daily challenge", icon: "🏆" },
  { id: "daily_streak_all_levels", title: "Multi-Level Master", description: "Complete daily challenges in all levels on the same day", icon: "🌟" },
  { id: "daily_streak_7", title: "Weekly Warrior", description: "Complete 7 daily challenges in a row (any level)", icon: "🔥" },
  { id: "daily_streak_30", title: "Monthly Master", description: "Complete 30 daily challenges in a row (any level)", icon: "👑" }
];