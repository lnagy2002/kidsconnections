// scripts/generate-strands-json.js
// Node 20+, ESM. Requires OPENAI_API_KEY in repo secrets.
// Outputs:
//   - docs/data/strands-MMDDYYYY.json (named by the UTC date, like the Wordle file)
//   - docs/data/history.json (every word used so far)

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

// ---------- Config ----------
const OUT_DIR = path.join("docs", "data");
const HISTORY_FILE = path.join(OUT_DIR, "history.json");
const COUNTS = { easy: 8, medium: 8, hard: 9 };
const LEVELS = ["easy", "medium", "hard"];

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TEMPERATURE = 1.0; // more variety; the model otherwise keeps suggesting the same few hundred words
const TOP_P = 0.95;

// A word can come back once it hasn't been in a puzzle for this many days
const REPEAT_AFTER_DAYS = 30;

// Max lengths match the game's grids (8x8, 10x10, 12x12) so every word fits.
const RULES = {
  easy:   { min: 3, max: 7 },
  medium: { min: 5, max: 10 },
  hard:   { min: 6, max: 12 },
};

// Ask again (excluding everything rejected so far) until each level has enough fresh words
const MAX_ATTEMPTS = 5;
// After topping up from older words, a level with fewer words than this still fails the run
const MIN_WORDS = 5;

// A daily theme pushes the model toward different words each day (and makes the puzzle feel connected)
const THEMES = [
  "animals", "food", "the ocean", "space", "weather", "the farm", "sports", "music", "school",
  "the garden", "toys and games", "the kitchen", "transportation", "the forest", "insects and bugs",
  "the beach", "jobs and helpers", "clothes", "birds", "dinosaurs", "the city", "camping",
  "fruits and vegetables", "the body", "holidays", "art and colors", "the house", "pets",
  "the jungle", "winter", "summer", "machines and tools", "the playground", "fairy tales"
];

// Hand-picked backup words, used only when the model can't give enough fresh ones
const BACKUP = {
  easy: `CAT DOG SUN MOON STAR TREE BIRD FISH FROG DUCK BEAR LION CAKE MILK APPLE GRAPE LEMON PEAR BREAD
    HONEY SOCK SHOE HAT COAT BOOK DESK CHAIR TABLE BALL KITE DOLL DRUM BOAT TRAIN BUS TRUCK RAIN SNOW WIND
    CLOUD LEAF ROSE SEED NEST EGG HEN PIG COW GOAT HORSE MOUSE TIGER ZEBRA PANDA SHARK WHALE CRAB SHELL SAND
    WAVE HILL LAKE PARK SMILE HAPPY JUMP SWIM PLAY SING OWL FOX BEE ANT BUG MAP CUP SPOON PLATE BED LAMP`,
  medium: `RAINBOW PUMPKIN PENGUIN DOLPHIN BLANKET KITCHEN JUNGLE GARDEN PICNIC CASTLE DRAGON ROCKET PLANET
    COMET BRIDGE TUNNEL HAMMER LADDER PENCIL CRAYON SCHOOL TEACHER LIBRARY MUSEUM BICYCLE SCOOTER BALLOON
    CANDLE CHEESE BANANA CARROT POTATO TOMATO CHERRY MUFFIN COOKIE PANCAKE SANDWICH FEATHER RABBIT TURTLE
    MONKEY GIRAFFE PARROT SPIDER BEETLE BUTTER ISLAND OCEAN DESERT FOREST MEADOW THUNDER SUNSHINE SNOWMAN
    BLOSSOM TREASURE PIRATE WIZARD PUPPET TRACTOR PAINTER DOCTOR FARMER WAGON PILLOW MITTEN JACKET`,
  hard: `ADVENTURE DINOSAUR BUTTERFLY TELESCOPE MICROSCOPE VOLCANO ELEPHANT KANGAROO CROCODILE OCTOPUS
    JELLYFISH ASTRONAUT HELICOPTER SUBMARINE LIGHTHOUSE WATERFALL MOUNTAIN STRAWBERRY BLUEBERRY PINEAPPLE
    WATERMELON CHOCOLATE SANDCASTLE PLAYGROUND CATERPILLAR DRAGONFLY GRASSHOPPER CALENDAR DICTIONARY
    KEYBOARD COMPUTER INVENTOR SCIENTIST MUSICIAN ORCHESTRA FIREWORKS SNOWFLAKE HURRICANE TORNADO
    RAINFOREST EXPLORER DISCOVERY FRIENDSHIP KINDNESS UMBRELLA SKATEBOARD BACKPACK NOTEBOOK HEDGEHOG
    FLAMINGO CHAMELEON PORCUPINE SQUIRREL CHIPMUNK BLIZZARD SUNFLOWER DANDELION TREEHOUSE`
};

// UTC date, so the run right after midnight UTC writes today's file (not yesterday's)
function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function stamp(d) {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${m}${day}${d.getUTCFullYear()}`;
}
function themeFor(d) {
  const dayNumber = Math.floor(d.getTime() / 86400000);
  return THEMES[dayNumber % THEMES.length];
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadHistory() {
  try {
    const json = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    const set = new Set();
    LEVELS.forEach(level => (json[level] || []).forEach(w => set.add(String(w).toUpperCase())));
    return { raw: json, set };
  } catch {
    return { raw: { easy: [], medium: [], hard: [] }, set: new Set() };
  }
}

function saveHistory(historyRaw, newWords) {
  const merged = { ...historyRaw };
  for (const level of LEVELS) {
    merged[level] = Array.from(new Set([...(historyRaw[level] || []), ...newWords[level]]));
    if (merged[level].length > 3650) merged[level] = merged[level].slice(-3650);
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(merged, null, 2) + "\n");
}

// Words in the daily files from the last REPEAT_AFTER_DAYS days (these can't be used today)
function recentWords(today) {
  const recent = new Set();
  for (const f of fs.readdirSync(OUT_DIR)) {
    const m = f.match(/^strands-(\d{2})(\d{2})(\d{4})\.json$/);
    if (!m) continue;
    const day = Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    const age = (today.getTime() - day) / 86400000;
    if (age < 0 || age > REPEAT_AFTER_DAYS) continue;
    try {
      const json = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), "utf8"));
      LEVELS.forEach(l => (json[l]?.words || []).forEach(w => recent.add(String(w).toUpperCase())));
    } catch { /* ignore broken files */ }
  }
  return recent;
}

// Why a word can't be used (or null if it's fine)
function rejectReason(w, { min, max }, blocked, seen) {
  if (!/^[A-Z]+$/.test(w)) return "not just letters";
  if (w.length < min || w.length > max) return "wrong length";
  if (seen.has(w)) return "duplicate";
  if (blocked.has(w)) return `used in the last ${REPEAT_AFTER_DAYS} days`;
  return null;
}

function validatePayload(obj) {
  for (const level of LEVELS) {
    if (!obj[level] || !Array.isArray(obj[level].words)) return `Missing ${level}.words`;
  }
  return null;
}

async function generateWithOpenAI({ date, theme, excludeList }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = [
    "You generate daily English word lists for a kids' word-search game.",
    "Return STRICT JSON ONLY. No backticks, no comments.",
    "Rules:",
    "- Uppercase A–Z only. No spaces, hyphens, apostrophes, digits, or diacritics.",
    "- Real, common English words that children aged 7–12 know; no proper nouns, trademarks, slang, or made-up words.",
    "- School-safe and age-appropriate.",
    "- Obey per-level lengths: EASY 3–7, MEDIUM 5–10, HARD 6–12 letters.",
    `- All words should fit today's theme: ${theme}.`,
    "- Do not use any word from the EXCLUSIONS list."
  ].join("\n");

  // Ask for extra words, since some get filtered out
  const ask = Object.fromEntries(LEVELS.map(l => [l, COUNTS[l] + 4]));
  const user = JSON.stringify({
    date,
    theme,
    counts: ask,
    length_rules: RULES,
    exclusions: excludeList,
    output_schema: {
      easy: { words: "string[]" },
      medium: { words: "string[]" },
      hard: { words: "string[]" }
    }
  });

  const resp = await client.responses.create({
    model: MODEL,
    temperature: TEMPERATURE,
    top_p: TOP_P,
    text: { format: { type: "json_object" } },
    input: [
      { role: "system", content: system },
      { role: "user", content: `Generate today's word sets for ${date} (theme: ${theme}).\nInput JSON:\n${user}` }
    ]
  });

  const text = resp.output_text || (resp?.output?.[0]?.content?.[0]?.text) || "";
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error("Model did not return valid JSON. Raw: " + text.slice(0, 200));
  }
  const err = validatePayload(json);
  if (err) throw new Error("Invalid payload structure: " + err);
  return json;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const today = todayUTC();
  const date = stamp(today);
  const theme = themeFor(today);
  ensureDir(OUT_DIR);
  const { raw: historyRaw } = loadHistory();
  const recent = recentWords(today);
  console.log(`Theme: ${theme}. Blocking ${recent.size} words used in the last ${REPEAT_AFTER_DAYS} days.`);

  const accepted = { easy: [], medium: [], hard: [] };
  const reasons = {};

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const missing = LEVELS.filter(l => accepted[l].length < COUNTS[l]);
    if (!missing.length) break;

    const taken = new Set(LEVELS.flatMap(l => accepted[l]));
    const blocked = new Set([...recent, ...taken]);
    const candidate = await generateWithOpenAI({ date, theme, excludeList: [...blocked] });

    for (const level of missing) {
      const seen = new Set();
      for (const raw of candidate[level].words || []) {
        if (accepted[level].length >= COUNTS[level]) break;
        const w = String(raw || "").trim().toUpperCase();
        const why = rejectReason(w, RULES[level], blocked, seen);
        seen.add(w);
        if (why) { reasons[why] = (reasons[why] || 0) + 1; continue; }
        accepted[level].push(w);
        blocked.add(w);
      }
    }
    console.log(`Attempt ${attempt}: ` + LEVELS.map(l => `${l} ${accepted[l].length}/${COUNTS[l]}`).join(", ") +
      (Object.keys(reasons).length ? ` | rejected so far: ${JSON.stringify(reasons)}` : ""));
  }

  // Still short? Top up from the hand-picked backup words (never one used in the last 30 days)
  const taken = new Set([...recent, ...LEVELS.flatMap(l => accepted[l])]);
  for (const level of LEVELS) {
    const pool = BACKUP[level].split(/\s+/).filter(w => w && !taken.has(w) && !rejectReason(w, RULES[level], new Set(), new Set()));
    const added = [];
    while (accepted[level].length < COUNTS[level] && pool.length) {
      const w = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      accepted[level].push(w);
      taken.add(w);
      added.push(w);
    }
    if (added.length) console.log(`  ${level}: topped up with backup words ${added.join(", ")}`);
  }

  const short = LEVELS.filter(l => accepted[l].length < MIN_WORDS);
  if (short.length) {
    throw new Error(`Not enough valid words for: ${short.join(", ")}`);
  }

  const { easy, medium, hard } = accepted;
  const datedObj = { theme, easy: { words: easy }, medium: { words: medium }, hard: { words: hard } };
  const datedPath = path.join(OUT_DIR, `strands-${date}.json`);
  fs.writeFileSync(datedPath, JSON.stringify(datedObj, null, 2) + "\n");

  saveHistory(historyRaw, { easy, medium, hard });

  console.log(`✅ Generated:\n - ${datedPath}\n - updated history.json`);
}

main().catch(err => {
  console.error("❌ Generation failed:", err?.message || err);
  process.exit(1);
});
