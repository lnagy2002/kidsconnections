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

// ===== load previously used words =====
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

// ===== Call model once (UPDATED) =====
async function callModel({ system, user }) {
  const resp = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    // *** CRITICAL IMPROVEMENT: Enforce JSON output format ***
    response_format: { type: "json_object" },
    reasoning_effort: "low",
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  // Since response_format is used, we no longer need to strip fences,
  // but we still parse and check for a valid object.
  const jsonString = text;
  console.log("Raw model JSON:", jsonString);

  let data;
  try {
    const parsed = JSON.parse(jsonString);
    data = trimTopLevel(parsed);
  } catch {
    console.error("Model response was:", text);
    // If parsing fails despite response_format, the structure is wrong.
    throw new Error("Model did not return valid JSON structure.");
  }

  // Normalize to uppercase (just in case)
  if (typeof data.easy === "string") data.easy = data.easy.toUpperCase();
  if (typeof data.medium === "string") data.medium = data.medium.toUpperCase();
  if (typeof data.hard === "string") data.hard = data.hard.toUpperCase();

  return data;
}

// ===== Main (CORRECTED) =====
async function main() {
  const today = new Date();
  const stamp = mmddyyyy(today);

  const { usedAll, recentList } = loadUsedWords();
  console.log("Total previously used words:", usedAll.size);

  // *** Improved System Prompt for clarity and structure ***
  const baseSystem = `
You are an assistant that generates daily words for a kids' Wordle-style game.
Your output MUST be a JSON object with three keys: "easy", "medium", and "hard".
The word rules are:
1. "easy" must be EXACTLY 4 letters long.
2. "medium" must be EXACTLY 5 letters long.
3. "hard" must be EXACTLY 6 letters long.
4. All words must be ALL CAPS A–Z. No numbers, punctuation, or special characters.
5. Words must be school-safe and age-appropriate (grades 2+).
6. Exclude proper nouns, brand names, slang, and offensive terms.
Return ONLY the JSON object, like: {"easy": "FOUR", "medium": "FIVEY", "hard": "SIMPLE"}.`;

  // DECLARE AND INITIALIZE variables for the loop to avoid ReferenceError
  let currentSystem = baseSystem;
  let currentUsedWords = usedAll;
  let currentRecentList = recentList;

  // Try a few times to get genuinely new words
  const MAX_ATTEMPTS = 4;
  let data;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}...`);

    // *** Create the User Prompt using the current list to avoid ***
    const user = `
Date: ${stamp}.
Generate three fresh words that meet all system criteria.
Critically, these words must be DIFFERENT from the following list of previously used words: 
${currentRecentList.join(", ")}`;

    data = await callModel({ system: currentSystem, user }); // Use currentSystem

    // Validate basic format
    if (!data.easy || typeof data.easy !== 'string' || !isAlpha(data.easy) || !hasLength(data.easy, 4))
      throw new Error(`Invalid EASY word: ${data.easy} (Must be 4 letters, A-Z)`);
    if (!data.medium || typeof data.medium !== 'string' || !isAlpha(data.medium) || !hasLength(data.medium, 5))
      throw new Error(`Invalid MEDIUM word: ${data.medium} (Must be 5 letters, A-Z)`);
    if (!data.hard || typeof data.hard !== 'string' || !isAlpha(data.hard) || !hasLength(data.hard, 6))
      throw new Error(`Invalid HARD word: ${data.hard} (Must be 6 letters, A-Z)`);

    // Check for repetition against the current list of used words
    const repeats =
      currentUsedWords.has(data.easy) ||
      currentUsedWords.has(data.medium) ||
      currentUsedWords.has(data.hard);

    if (!repeats) {
      console.log("Got fresh words:", data);
      break;
    }

    console.warn("Model returned previously used word(s):", data);
    
    // *** Update the System Prompt for the next attempt ***
    if (attempt < MAX_ATTEMPTS) {
        // Collect the specific offending words
        const offending = [data.easy, data.medium, data.hard].filter(w => currentUsedWords.has(w));
        
        // Update the system prompt to explicitly avoid these words
        currentSystem = baseSystem + `\n\n---
        **CRITICAL FAILURE: The previous attempt failed because you reused the word(s) ${offending.join(", ")}.
        For this attempt, you MUST generate three completely new words that are NOT on the avoidance list and NOT the words: ${offending.join(", ")}.
        DOUBLE CHECK the list of used words before generating the final JSON.**`;
        
        // Update the set and list of words to avoid for the next attempt
        // Merge the originally used words with the newly failed words
        currentUsedWords = new Set([...usedAll, ...offending]); 
        currentRecentList = Array.from(currentUsedWords).slice(-150); // Regenerate the list to send to model
    }
    
    
    if (attempt === MAX_ATTEMPTS) {
      throw new Error("Could not obtain fresh words after several attempts.");
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
