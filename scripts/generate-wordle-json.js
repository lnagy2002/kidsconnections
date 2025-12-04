// scripts/generate-wordle-json.js
// Generates kid-friendly daily Wordle words via OpenAI and writes docs/data/wordle-YYYYMMDD.json

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===== Date helpers (UTC-aligned) =====
const pad = n => String(n).padStart(2, "0");

function mmddyyyy(d = new Date()) {
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

// ===== Small helpers =====
function trimTopLevel(value) {
  if (Array.isArray(value)) {
    return value.map(v => (typeof v === "string" ? v.trim() : v));
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      if (typeof value[k] === "string") value[k] = value[k].trim();
    }
    return value;
  }
  return typeof value === "string" ? value.trim() : value;
}

const isAlpha = s => /^[A-Z]+$/.test(s);
const hasLength = (s, n) => s.length === n;

// ===== NEW: load previously used words =====
function loadUsedWords() {
  const dir = path.join(process.cwd(), "docs", "data");
  const usedAll = new Set(); // all difficulties together
  const perSlot = {
    easy: new Set(),
    medium: new Set(),
    hard: new Set(),
  };

  if (!fs.existsSync(dir)) return { usedAll, perSlot, recentList: [] };

  const files = fs
    .readdirSync(dir)
    .filter(f => f.startsWith("wordle-") && f.endsWith(".json"))
    .sort(); // chronological-ish by filename

  for (const file of files) {
    try {
      const contents = fs.readFileSync(path.join(dir, file), "utf8");
      const json = JSON.parse(contents);

      ["easy", "medium", "hard"].forEach(slot => {
        const raw = json[slot];
        if (!raw || typeof raw !== "string") return;
        const word = raw.trim().toUpperCase();
        usedAll.add(word);
        perSlot[slot].add(word);
      });
    } catch (e) {
      console.warn("Could not parse previous file:", file, e.message);
    }
  }

  // Limit what we send to the model (tokens): only last ~150 words
  const recentList = Array.from(usedAll).slice(-150);

  return { usedAll, perSlot, recentList };
}

// ===== Call model once =====
async function callModel({ system, user }) {
  const resp = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    reasoning_effort: "minimal",
    // temperature: 0.9,          // a bit of randomness to avoid same favorites
    // top_p: 0.9,
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  // Strip fences if present
  const jsonString = text.replace(/^```json\s*|\s*```$/g, "");
  console.log("Raw model JSON:", jsonString);

  let data;
  try {
    const parsed = JSON.parse(jsonString);
    data = trimTopLevel(parsed);
  } catch {
    console.error("Model response was:", text);
    throw new Error("Model did not return valid JSON.");
  }

  // Normalize to uppercase (just in case)
  if (typeof data.easy === "string") data.easy = data.easy.toUpperCase();
  if (typeof data.medium === "string") data.medium = data.medium.toUpperCase();
  if (typeof data.hard === "string") data.hard = data.hard.toUpperCase();

  return data;
}

// ===== Main =====
async function main() {
  const today = new Date();
  const stamp = mmddyyyy(today);

  const { usedAll, recentList } = loadUsedWords();
  console.log("Total previously used words:", usedAll.size);

  const baseSystem = `
You generate daily words for a kids' Wordle-style game. 
Output JSON like:
{
  "easy": "FOUR",
  "medium": "FIVEY",
  "hard": "SIMPLEX"
}

- "easy" must be EXACTLY 4 letters long.
- "medium" must be EXACTLY 5 letters long.
- "hard" must be EXACTLY 6 letters long.
- ALL CAPS A–Z. No hyphens, accents, numbers, or punctuation.
- No proper nouns, no brand names, no slang, no offensive terms.
- Age-appropriate (grades 2+).
- Return ONLY JSON.`;

  const avoidClause = recentList.length
    ? `\nAdditional rule: Do NOT use any of these words for ANY slot: ${recentList.join(
        ", "
      )}.`
    : "";

  const system = baseSystem + avoidClause;

  const user = `Date: ${stamp}.
Return fresh, school-safe words that fit the lengths and are recognizable to kids.
They must be different from previous days.`;

  // Try a few times to get genuinely new words
  const MAX_ATTEMPTS = 4;
  let data;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}...`);
    data = await callModel({ system, user });

    // Validate basic format
    if (!isAlpha(data.easy) || !hasLength(data.easy, 4))
      throw new Error(`Invalid EASY word: ${data.easy}`);
    if (!isAlpha(data.medium) || !hasLength(data.medium, 5))
      throw new Error(`Invalid MEDIUM word: ${data.medium}`);
    if (!isAlpha(data.hard) || !hasLength(data.hard, 6))
      throw new Error(`Invalid HARD word: ${data.hard}`);

    // Check for repetition
    const repeats =
      usedAll.has(data.easy) ||
      usedAll.has(data.medium) ||
      usedAll.has(data.hard);

    if (!repeats) {
      console.log("Got fresh words:", data);
      break;
    }

    console.warn("Model returned previously used word(s):", data);
    if (attempt === MAX_ATTEMPTS) {
      // throw new Error("Could not obtain fresh words after several attempts.");
    }
  }

  // Write docs/data/wordle-YYYYMMDD.json
  const outDir = path.join(process.cwd(), "docs", "data");
  const outFile = path.join(outDir, `wordle-${stamp}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Wrote:", outFile, data);
}

main().catch(err => {
  console.error("Generation failed:", err);
  process.exit(1);
});
