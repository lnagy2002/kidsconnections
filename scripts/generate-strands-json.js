// scripts/generate-daily-words.mjs
// Node 20+, ESM. Requires OPENAI_API_KEY in repo secrets.
// Outputs:
//   - docs/data/levels-YYYYMMDD.json
//   - docs/data/latest.json  (includes the date + levels)
//   - docs/data/history.json (rolling history to reduce repeats)

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

// ---------- Config ----------
const TZ = process.env.TZ || "America/Los_Angeles";
const OUT_DIR = path.join("docs", "data");
const HISTORY_FILE = path.join(OUT_DIR, "history.json");
const COUNTS = { easy: 8, medium: 8, hard: 9 };

// Model + sampling. (Keep these stable for reproducibility.)
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TEMPERATURE = 0.6;
const TOP_P = 0.95;

// Exclude proper nouns, hyphens, spaces, numbers, diacritics.
// Tune lengths by difficulty.
const RULES = {
  easy:   { min: 3, max: 7 },
  medium: { min: 6, max: 11 },
  hard:   { min: 8, max: 14 },
};

function todayStr() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
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

  // We’ll pass a seed equal to YYYYMMDD for “best-effort” repeatability.
  // Determinism is not guaranteed across backend updates (see notes).
  const seed = Number(date);

  const system = [
    "You generate daily English word lists for a word-puzzle game.",
    "Return STRICT JSON ONLY. No backticks, no comments.",
    "Rules:",
    "- Uppercase A–Z only. No spaces, hyphens, apostrophes, digits, or diacritics.",
    "- English dictionary words; no proper nouns; no trademarks.",
    "- Obey per-level lengths: EASY 3–7, MEDIUM 6–11, HARD 8–14 letters.",
    "- Provide novel words not in the EXCLUSIONS list."
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
    seed, // best-effort reproducibility
    text: { format: "json" }, 
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
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

  // We’ll ask the model while showing a (bounded) exclusions list to avoid repeats.
  // To keep prompts compact, only include the most recent N used words.
  const RECENT_LIMIT = 600; // tune as you like
  const recentExclusions = Array.from(historySet).slice(-RECENT_LIMIT);

  // First attempt
  let candidate = await generateWithOpenAI({ date, excludeList: recentExclusions });

  // Post-filter to strictly enforce rules and avoid any collisions with history
  const easy = setDiffFilter(candidate.easy.words, historySet, RULES.easy).slice(0, COUNTS.easy);
  const medium = setDiffFilter(candidate.medium.words, historySet, RULES.medium).slice(0, COUNTS.medium);
  const hard = setDiffFilter(candidate.hard.words, historySet, RULES.hard).slice(0, COUNTS.hard);

  // If any level short, re-ask with expanded exclusions (previous + what we kept) once.
  const needsRetry = (easy.length < COUNTS.easy) || (medium.length < COUNTS.medium) || (hard.length < COUNTS.hard);
  if (needsRetry) {
    const unionExclusions = Array.from(new Set([
      ...recentExclusions,
      ...easy, ...medium, ...hard
    ]));
    const cand2 = await generateWithOpenAI({ date, excludeList: unionExclusions });
    const e2 = setDiffFilter(cand2.easy.words,   historySet, RULES.easy);
    const m2 = setDiffFilter(cand2.medium.words, historySet, RULES.medium);
    const h2 = setDiffFilter(cand2.hard.words,   historySet, RULES.hard);

    // Fill any gaps
    while (easy.length   < COUNTS.easy   && e2.length) easy.push(e2.shift());
    while (medium.length < COUNTS.medium && m2.length) medium.push(m2.shift());
    while (hard.length   < COUNTS.hard   && h2.length) hard.push(h2.shift());
  }

  // Final guard
  if (easy.length < COUNTS.easy || medium.length < COUNTS.medium || hard.length < COUNTS.hard) {
    throw new Error("Not enough valid unique words returned. Try loosening rules or increasing retry logic.");
  }

  const datedObj = { easy: { words: easy }, medium: { words: medium }, hard: { words: hard } };
  const payload = { date, ...datedObj };

  const datedPath = path.join(OUT_DIR, `strands-${date}.json`);
  const latestPath = path.join(OUT_DIR, "latest.json");

  fs.writeFileSync(datedPath, JSON.stringify(datedObj, null, 2) + "\n");
  fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2) + "\n");

  // Update history
  saveHistory(loadHistory().raw, { easy, medium, hard });

  console.log(`✅ Generated:\n - ${datedPath}\n - ${latestPath}\n - updated history.json`);
}

main().catch(err => {
  console.error("❌ Generation failed:", err?.message || err);
  process.exit(1);
});
