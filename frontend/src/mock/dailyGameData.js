// Daily game data with date-based selection for consistent daily puzzles

export const dailyGames = {
  // January 2025 daily games
  "2025-01-19": {
    level: "easy",
    title: "Animal Homes",
    words: [
      "NEST", "CAVE", "HIVE", "DEN",
      "WINGS", "FINS", "LEGS", "TAIL",
      "BARK", "MEOW", "CHIRP", "ROAR",
      "MILK", "EGGS", "HONEY", "NUTS"
    ],
    groups: [
      { category: "Animal Homes", words: ["NEST", "CAVE", "HIVE", "DEN"], difficulty: 1 },
      { category: "Body Parts", words: ["WINGS", "FINS", "LEGS", "TAIL"], difficulty: 2 },
      { category: "Animal Sounds", words: ["BARK", "MEOW", "CHIRP", "ROAR"], difficulty: 3 },
      { category: "Animal Products", words: ["MILK", "EGGS", "HONEY", "NUTS"], difficulty: 4 }
    ]
  },
  "2025-01-20": {
    level: "medium",
    title: "Ocean Life",
    words: [
      "WHALE", "DOLPHIN", "SHARK", "OCTOPUS",
      "CORAL", "SEAWEED", "KELP", "ALGAE",
      "TIDE", "WAVE", "CURRENT", "STORM",
      "SHELL", "PEARL", "SAND", "SALT"
    ],
    groups: [
      { category: "Sea Creatures", words: ["WHALE", "DOLPHIN", "SHARK", "OCTOPUS"], difficulty: 1 },
      { category: "Ocean Plants", words: ["CORAL", "SEAWEED", "KELP", "ALGAE"], difficulty: 2 },
      { category: "Water Movement", words: ["TIDE", "WAVE", "CURRENT", "STORM"], difficulty: 3 },
      { category: "Beach Finds", words: ["SHELL", "PEARL", "SAND", "SALT"], difficulty: 4 }
    ]
  },
  "2025-01-21": {
    level: "hard",
    title: "Space Exploration",
    words: [
      "ROCKET", "SATELLITE", "TELESCOPE", "PROBE",
      "MARS", "VENUS", "JUPITER", "SATURN",
      "ORBIT", "GRAVITY", "VACUUM", "RADIATION",
      "ASTRONAUT", "MISSION", "LAUNCH", "LANDING"
    ],
    groups: [
      { category: "Space Vehicles", words: ["ROCKET", "SATELLITE", "TELESCOPE", "PROBE"], difficulty: 1 },
      { category: "Planets", words: ["MARS", "VENUS", "JUPITER", "SATURN"], difficulty: 2 },
      { category: "Space Physics", words: ["ORBIT", "GRAVITY", "VACUUM", "RADIATION"], difficulty: 3 },
      { category: "Space Mission", words: ["ASTRONAUT", "MISSION", "LAUNCH", "LANDING"], difficulty: 4 }
    ]
  },
  "2025-01-22": {
    level: "youth",
    title: "Literature Classics",
    words: [
      "METAPHOR", "SIMILE", "IRONY", "SYMBOLISM",
      "PROTAGONIST", "ANTAGONIST", "NARRATOR", "CHARACTER",
      "PLOT", "THEME", "SETTING", "CONFLICT",
      "SHAKESPEARE", "DICKENS", "TWAIN", "AUSTEN"
    ],
    groups: [
      { category: "Literary Devices", words: ["METAPHOR", "SIMILE", "IRONY", "SYMBOLISM"], difficulty: 1 },
      { category: "Story Elements", words: ["PROTAGONIST", "ANTAGONIST", "NARRATOR", "CHARACTER"], difficulty: 2 },
      { category: "Story Structure", words: ["PLOT", "THEME", "SETTING", "CONFLICT"], difficulty: 3 },
      { category: "Famous Authors", words: ["SHAKESPEARE", "DICKENS", "TWAIN", "AUSTEN"], difficulty: 4 }
    ]
  }
};

// Generate daily game based on current date
export const getTodaysDailyGame = () => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // If we have a specific game for today, return it
  if (dailyGames[dateString]) {
    return {
      ...dailyGames[dateString],
      date: dateString,
      id: `daily-${dateString}`
    };
  }
  
  // Otherwise, generate based on date using a simple algorithm
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  const gameIndex = daysSinceEpoch % 4; // Rotate through 4 different games
  const availableGames = Object.values(dailyGames);
  
  if (availableGames.length > 0) {
    const selectedGame = availableGames[gameIndex % availableGames.length];
    return {
      ...selectedGame,
      date: dateString,
      id: `daily-${dateString}`
    };
  }
  
  // Fallback game if no games are available
  return {
    level: "easy",
    title: "Daily Challenge",
    date: dateString,
    id: `daily-${dateString}`,
    words: [
      "SUN", "MOON", "STAR", "CLOUD",
      "TREE", "FLOWER", "GRASS", "LEAF",
      "HAPPY", "SAD", "EXCITED", "CALM",
      "RUN", "WALK", "JUMP", "SKIP"
    ],
    groups: [
      { category: "Sky Objects", words: ["SUN", "MOON", "STAR", "CLOUD"], difficulty: 1 },
      { category: "Nature", words: ["TREE", "FLOWER", "GRASS", "LEAF"], difficulty: 2 },
      { category: "Emotions", words: ["HAPPY", "SAD", "EXCITED", "CALM"], difficulty: 3 },
      { category: "Actions", words: ["RUN", "WALK", "JUMP", "SKIP"], difficulty: 4 }
    ]
  };
};

// Get time until next daily game
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

export const dailyGameAchievements = [
  { id: "daily_first", title: "Daily Starter", description: "Complete your first daily challenge", icon: "🌅" },
  { id: "daily_streak_3", title: "3-Day Streak", description: "Complete 3 daily challenges in a row", icon: "🔥" },
  { id: "daily_streak_7", title: "Weekly Warrior", description: "Complete 7 daily challenges in a row", icon: "⚡" },
  { id: "daily_streak_30", title: "Monthly Master", description: "Complete 30 daily challenges in a row", icon: "🏆" },
  { id: "daily_perfect", title: "Perfect Daily", description: "Complete daily challenge with no mistakes", icon: "💎" }
];