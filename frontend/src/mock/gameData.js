// Mock data for NY Connections-style game with neuroplasticity-enhancing content

export const gameLevels = {
  easy: {
    title: "Easy Level (Grades 1-2)",
    description: "Simple patterns and categories",
    games: [
      {
        id: 1,
        title: "Colors and Shapes",
        words: [
          "RED", "CIRCLE", "BLUE", "SQUARE",
          "DOG", "CAT", "BIRD", "FISH",
          "APPLE", "BANANA", "ORANGE", "GRAPE",
          "ONE", "TWO", "THREE", "FOUR"
        ],
        groups: [
          { category: "Colors", words: ["RED", "BLUE", "ORANGE", "GRAPE"], difficulty: 1 },
          { category: "Shapes", words: ["CIRCLE", "SQUARE", "APPLE", "BANANA"], difficulty: 2 },
          { category: "Animals", words: ["DOG", "CAT", "BIRD", "FISH"], difficulty: 3 },
          { category: "Numbers", words: ["ONE", "TWO", "THREE", "FOUR"], difficulty: 4 }
        ]
      },
      {
        id: 2,
        title: "Home and Family",
        words: [
          "MOM", "DAD", "BABY", "SISTER",
          "BED", "CHAIR", "TABLE", "LAMP",
          "HAPPY", "SAD", "MAD", "GLAD",
          "HOT", "COLD", "WET", "DRY"
        ],
        groups: [
          { category: "Family", words: ["MOM", "DAD", "BABY", "SISTER"], difficulty: 1 },
          { category: "Furniture", words: ["BED", "CHAIR", "TABLE", "LAMP"], difficulty: 2 },
          { category: "Feelings", words: ["HAPPY", "SAD", "MAD", "GLAD"], difficulty: 3 },
          { category: "Opposites", words: ["HOT", "COLD", "WET", "DRY"], difficulty: 4 }
        ]
      }
    ]
  },
  medium: {
    title: "Medium Level (Grades 3-4)",
    description: "Pattern recognition and logical thinking",
    games: [
      {
        id: 1,
        title: "Science and Nature",
        words: [
          "BUTTERFLY", "CATERPILLAR", "COCOON", "WINGS",
          "RAIN", "SNOW", "HAIL", "SLEET",
          "PLANETS", "STARS", "MOON", "SUN",
          "ROOTS", "STEM", "LEAVES", "FLOWER"
        ],
        groups: [
          { category: "Butterfly Life Cycle", words: ["BUTTERFLY", "CATERPILLAR", "COCOON", "WINGS"], difficulty: 1 },
          { category: "Weather Types", words: ["RAIN", "SNOW", "HAIL", "SLEET"], difficulty: 2 },
          { category: "Space Objects", words: ["PLANETS", "STARS", "MOON", "SUN"], difficulty: 3 },
          { category: "Plant Parts", words: ["ROOTS", "STEM", "LEAVES", "FLOWER"], difficulty: 4 }
        ]
      }
    ]
  },
  hard: {
    title: "Hard Level (Grades 5-6)",
    description: "Complex associations and abstract thinking",
    games: [
      {
        id: 1,
        title: "Geography and Culture",
        words: [
          "DESERT", "OASIS", "CACTUS", "DUNES",
          "DEMOCRACY", "VOTE", "CITIZEN", "RIGHTS",
          "FRACTION", "DECIMAL", "PERCENT", "RATIO",
          "EVAPORATION", "CONDENSATION", "PRECIPITATION", "COLLECTION"
        ],
        groups: [
          { category: "Desert Features", words: ["DESERT", "OASIS", "CACTUS", "DUNES"], difficulty: 1 },
          { category: "Civics Terms", words: ["DEMOCRACY", "VOTE", "CITIZEN", "RIGHTS"], difficulty: 2 },
          { category: "Math Concepts", words: ["FRACTION", "DECIMAL", "PERCENT", "RATIO"], difficulty: 3 },
          { category: "Water Cycle", words: ["EVAPORATION", "CONDENSATION", "PRECIPITATION", "COLLECTION"], difficulty: 4 }
        ]
      }
    ]
  },
  youth: {
    title: "Youth Level (Grade 6+)",
    description: "Advanced pattern recognition and critical thinking",
    games: [
      {
        id: 1,
        title: "Literature and Logic",
        words: [
          "METAPHOR", "SIMILE", "ALLITERATION", "HYPERBOLE",
          "HYPOTHESIS", "THEORY", "EVIDENCE", "CONCLUSION",
          "RENAISSANCE", "MEDIEVAL", "BAROQUE", "ROMANTIC",
          "ALGORITHM", "VARIABLE", "FUNCTION", "LOOP"
        ],
        groups: [
          { category: "Literary Devices", words: ["METAPHOR", "SIMILE", "ALLITERATION", "HYPERBOLE"], difficulty: 1 },
          { category: "Scientific Method", words: ["HYPOTHESIS", "THEORY", "EVIDENCE", "CONCLUSION"], difficulty: 2 },
          { category: "Historical Periods", words: ["RENAISSANCE", "MEDIEVAL", "BAROQUE", "ROMANTIC"], difficulty: 3 },
          { category: "Programming Terms", words: ["ALGORITHM", "VARIABLE", "FUNCTION", "LOOP"], difficulty: 4 }
        ]
      }
    ]
  }
};

export const difficultyColors = {
  1: "bg-green-200 hover:bg-green-300 border-green-400",
  2: "bg-yellow-200 hover:bg-yellow-300 border-yellow-400", 
  3: "bg-orange-200 hover:bg-orange-300 border-orange-400",
  4: "bg-red-200 hover:bg-red-300 border-red-400"
};

export const achievements = [
  { id: 1, title: "First Connection!", description: "Complete your first group", icon: "🌟" },
  { id: 2, title: "Pattern Master", description: "Complete 5 games", icon: "🧠" },
  { id: 3, title: "Speed Thinker", description: "Complete a game in under 2 minutes", icon: "⚡" },
  { id: 4, title: "Level Up!", description: "Unlock a new difficulty level", icon: "🚀" }
];