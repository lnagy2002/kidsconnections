// scripts/generate-strands-json.js
// Node 20+, ESM. Requires OPENAI_API_KEY in repo secrets.
// Outputs:
//   - docs/data/strands-MMDDYYYY.json (named by the UTC date, like the Wordle file)
//   - docs/data/history.json (every word used so far; never reused)

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

// ---------- Config ----------
const OUT_DIR = path.join("docs", "data");
const HISTORY_FILE = path.join(OUT_DIR, "history.json");
const COUNTS = { easy: 8, medium: 8, hard: 9 };
const LEVELS = ["easy", "medium", "hard"];

// Model + sampling. (Keep these stable for reproducibility.)
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TEMPERATURE = 0.6;
const TOP_P = 0.95;

// Exclude proper nouns, hyphens, spaces, numbers, diacritics.
// Max lengths match the game's grids (8x8, 10x10, 12x12) so every word fits.
const RULES = {
  easy:   { min: 4, max: 7 },
  medium: { min: 6, max: 10 },
  hard:   { min: 8, max: 12 },
};

// Ask again (excluding everything rejected so far) until each level has enough fresh words
const MAX_ATTEMPTS = 5;
// A level with fewer words than this fails the run, so the game falls back to yesterday's words
const MIN_WORDS = 6;

// UTC date, so the run right after midnight UTC writes today's file (not yesterday's)
function todayStr() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${m}${d}${y}`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadHistory() {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const json = JSON.parse(raw);
    // normalize to uppercase set
    const set = new Set();
    ["easy", "medium", "hard"].forEach(level => {
      (json[level] || []).forEach(w => set.add(String(w).toUpperCase()));
    });
    return { raw: json, set };
  } catch {
    return { raw: { easy: [], medium: [], hard: [] }, set: new Set() };
  }
}

function saveHistory(historyRaw, newWords) {
  const merged = { ...historyRaw };
  for (const level of ["easy", "medium", "hard"]) {
    merged[level] = Array.from(new Set([...(historyRaw[level] || []), ...newWords[level]]));
  }
  // keep only last ~1 year worth by trimming (optional)
  for (const level of ["easy", "medium", "hard"]) {
    if (merged[level].length > 3650) merged[level] = merged[level].slice(-3650);
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(merged, null, 2) + "\n");
}

function validateWord(w, { min, max }) {
  // Single A–Z uppercase only, no spaces/hyphens/apostrophes/digits/accents.
  if (!/^[A-Z]+$/.test(w)) return false;
  if (w.length < min || w.length > max) return false;
  // no obvious proper nouns (heuristic: avoid capitalized-only forms since we already enforce uppercase)
  return true;
}

function validatePayload(obj) {
  for (const level of ["easy", "medium", "hard"]) {
    if (!obj[level] || !Array.isArray(obj[level].words)) return `Missing ${level}.words`;
  }
  return null;
}

function setDiffFilter(arr, excludeSet, bounds) {
  const seen = new Set();
  return arr
    .map(s => String(s || "").trim().toUpperCase())
    .filter(w => !excludeSet.has(w) && !seen.has(w) && validateWord(w, bounds) && seen.add(w));
}

async function generateWithOpenAI({ date, excludeList }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = [
    "You generate daily English word lists for a word-puzzle game.",
    "Return STRICT JSON ONLY. No backticks, no comments.",
    "Rules:",
    "- Uppercase A–Z only. No spaces, hyphens, apostrophes, digits, or diacritics.",
    "- Common English words that children aged 7–12 know; no proper nouns, trademarks, slang, or made-up words.",
    "- School-safe and age-appropriate.",
    "- Obey per-level lengths: EASY 4–7, MEDIUM 6–10, HARD 8–12 letters.",
    "- Every word must be new: never use a word from the EXCLUSIONS list."
  ].join("\n");

  const user = JSON.stringify({
    date,
    counts: COUNTS,
    length_rules: RULES,
    exclusions: excludeList,   // pass the union list; model should avoid these
    output_schema: {
      easy: { words: "string[]" },
      medium: { words: "string[]" },
      hard: { words: "string[]" }
    }
  });

  
  // Use the Responses API (official JS SDK) with JSON response format.
  // If your SDK version doesn’t support response_format here, you can
  // switch to chat.completions with function-style JSON instructions.
  const resp = await client.responses.create({
  
  model: MODEL,
  temperature: TEMPERATURE,
  top_p: TOP_P,
  text: { format: { type: "json_object" } },
  input: [
    { role: "system", content: system },
    {
      role: "user",
      content: `Generate today's unique word sets for ${date}.
      Absolutely do not include any word from the EXCLUSIONS array.
        Input JSON (use this data as guidance):
        ${user}`
    }
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

  const date = todayStr();
  ensureDir(OUT_DIR);
  const { raw: historyRaw, set: historySet } = loadHistory();

  // Every word ever used (all levels) is excluded, and checked again in code below,
  // because the model does not always follow the exclusion list.
  const accepted = { easy: [], medium: [], hard: [] };
  const rejected = new Set();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const missing = LEVELS.filter(l => accepted[l].length < COUNTS[l]);
    if (!missing.length) break;

    const used = new Set([...historySet, ...LEVELS.flatMap(l => accepted[l])]);
    const candidate = await generateWithOpenAI({ date, excludeList: [...used, ...rejected] });

    for (const level of missing) {
      const raw = (candidate[level].words || []).map(w => String(w || "").trim().toUpperCase());
      const fresh = setDiffFilter(raw, used, RULES[level]);
      raw.filter(w => !fresh.includes(w)).forEach(w => rejected.add(w));
      for (const w of fresh) {
        if (accepted[level].length >= COUNTS[level]) break;
        accepted[level].push(w);
        used.add(w);
      }
    }
    console.log(`Attempt ${attempt}: easy ${accepted.easy.length}/${COUNTS.easy}, medium ${accepted.medium.length}/${COUNTS.medium}, hard ${accepted.hard.length}/${COUNTS.hard} (rejected so far: ${rejected.size})`);
  }

  const short = LEVELS.filter(l => accepted[l].length < MIN_WORDS);
  if (short.length) {
    throw new Error(`Not enough new valid words for: ${short.join(", ")}`);
  }

  const { easy, medium, hard } = accepted;

  const datedObj = { easy: { words: easy }, medium: { words: medium }, hard: { words: hard } };

  const datedPath = path.join(OUT_DIR, `strands-${date}.json`);

  fs.writeFileSync(datedPath, JSON.stringify(datedObj, null, 2) + "\n");

  // Update history
  saveHistory(loadHistory().raw, { easy, medium, hard });

  console.log(`✅ Generated:\n - ${datedPath}\n - updated history.json`);
}

main().catch(err => {
  console.error("❌ Generation failed:", err?.message || err);
  process.exit(1);
});
