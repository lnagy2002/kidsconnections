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

const isAlpha = s => typeof s === "string" && /^[A-Z]+$/.test(s);
const hasLength = (s, n) => typeof s === "string" && s.length === n;

// ===== load previously used words =====
function loadUsedWords() {
  const dir = path.join(process.cwd(), "docs", "data");
  const usedAll = new Set(); // all difficulties together

  if (!fs.existsSync(dir)) return { usedAll, recentList: [] };

  const files = fs
    .readdirSync(dir)
    .filter(f => f.startsWith("wordle-") && f.endsWith(".json"))
    .sort(); // chronological-ish by filename

  for (const file of files) {
    try {
      const contents = fs.readFileSync(path.join(dir, file), "utf8");
      const json = JSON.parse(contents);

      ["easy", "medium", "hard"].forEach(slot => {
        const raw = json?.[slot];
        if (!raw || typeof raw !== "string") return;
        const word = raw.trim().toUpperCase();
        usedAll.add(word);
      });
    } catch (e) {
      console.warn("Could not parse previous file:", file, e.message);
    }
  }

  // Limit what we send to the model (tokens): only last ~150 words
  const recentList = Array.from(usedAll).slice(-150);
  return { usedAll, recentList };
}

// ===== Call model once =====
async function callModel({ system, user }) {
  const resp = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_object" },
    reasoning_effort: "low",
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  console.log("Raw model JSON:", text);

  let data;
  try {
    const parsed = JSON.parse(text);
    data = trimTopLevel(parsed);
  } catch {
    console.error("Model response was:", text);
    throw new Error("Model did not return valid JSON structure.");
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
Return ONLY a JSON object with keys: "easy", "medium", "hard".

Rules:
- EASY: exactly 4 letters
- MEDIUM: exactly 5 letters
- HARD: exactly 6 letters
- ALL CAPS A–Z only (no accents, punctuation, numbers)
- School-safe, age-appropriate (grades 2+)
- No proper nouns, brand names, slang, or offensive terms
`;

  // These evolve as we retry
  let currentSystem = baseSystem;
  let currentUsedWords = new Set(usedAll);          // accumulates across attempts
  let currentRecentList = [...recentList];          // what we send to model (last ~150)

  const MAX_ATTEMPTS = 6; // slightly higher for reliability
  let data = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}...`);

    const user = `
Date: ${stamp}.
Generate three fresh words that meet all rules.
These words MUST be different from the following previously used words:
${currentRecentList.join(", ")}
`;

    data = await callModel({ system: currentSystem, user });

    // Validate format; if invalid, retry instead of failing the run
    const valid =
      data?.easy && isAlpha(data.easy) && hasLength(data.easy, 4) &&
      data?.medium && isAlpha(data.medium) && hasLength(data.medium, 5) &&
      data?.hard && isAlpha(data.hard) && hasLength(data.hard, 6);

    if (!valid) {
      console.warn("Invalid format, retrying:", data);
      // tighten instruction slightly
      currentSystem = baseSystem + "\nCRITICAL: Output must match the exact lengths 4/5/6 and only A-Z.";
      continue;
    }

    // Avoid duplicates within the same output
    if (new Set([data.easy, data.medium, data.hard]).size !== 3) {
      console.warn("Duplicate word within output, retrying:", data);
      currentSystem = baseSystem + "\nCRITICAL: All three words must be different from each other.";
      continue;
    }

    // Check repetition against ALL used words
    const repeats =
      currentUsedWords.has(data.easy) ||
      currentUsedWords.has(data.medium) ||
      currentUsedWords.has(data.hard);

    if (!repeats) {
      console.log("Got fresh words:", data);
      break;
    }

    console.warn("Model returned previously used word(s):", data);

    const offending = [data.easy, data.medium, data.hard].filter(w => currentUsedWords.has(w));

    // Escalate without markdown / separators
    currentSystem =
      baseSystem +
      `\nCRITICAL: You reused ${offending.join(", ")}. ` +
      `Return 3 NEW words not in the avoidance list and also not: ${offending.join(", ")}.`;

    // Accumulate offending words so we don't loop on them
    currentUsedWords = new Set([...currentUsedWords, ...offending]);
    currentRecentList = Array.from(currentUsedWords).slice(-150);

    // if (attempt === MAX_ATTEMPTS) {
    //  throw new Error("Could not obtain fresh words after several attempts.");
    // }
  }

  if (!data) throw new Error("No data generated.");

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
