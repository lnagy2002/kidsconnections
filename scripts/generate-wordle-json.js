// scripts/generate-wordle-json.js
// Generates kid-friendly daily Wordle words via OpenAI and writes docs/data/wordle-YYYYMMDD.json

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// UTC helpers so “daily” aligns with GitHub cron (UTC)
const pad = n => String(n).padStart(2, "0");
function mmddyyyy(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

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

// Simple validators
const isAlpha = s => /^[A-Z]+$/.test(s);
const hasLength = (s, n) => s.length === n;

async function main() {
  const today = new Date();
  const stamp = mmddyyyy(today);

  const system = `
You generate daily words for a kids' Wordle-style game. 
Output strictly valid JSON matching this schema:
{
  "easy": "WORD",
  "medium": "WORDS",
  "hard": "WORDSS"
}

Rules:
- EASY: 4-letter common word.
- MEDIUM: 5-letter common word.
- HARD: 6-letter common word.
- ALL CAPS A–Z. No hyphens, accents, numbers, or punctuation.
- No proper nouns, no brand names, no slang, no offensive terms.
- Age-appropriate (grades 2+).
- Return ONLY JSON.`;

  const user = `Date: ${stamp}.
Return fresh, school-safe words that fit the lengths and are recognizable to kids.`;

  // Chat Completions style (compatible with official SDK)
  const resp = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    reasoning_effort: "minimal", // preferred control knob
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  // Basic JSON guard: strip code fences if present
  const jsonString = text.replace(/^```json\s*|\s*```$/g, "");
  console.log (jsonString);
  
  let data;
  try {
    const parsed = JSON.parse(text);
    data = trimTopLevel(parsed);   // trims only direct string values
    console.log(data);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }

  // Validate lengths & characters; if invalid, throw (workflow will show logs)
  if (!isAlpha(data.easy)   || !hasLength(data.easy, 4)) throw new Error("Invalid EASY word");
  if (!isAlpha(data.medium) || !hasLength(data.medium, 5)) throw new Error("Invalid MEDIUM word");
  if (!isAlpha(data.hard)   || !hasLength(data.hard, 6)) throw new Error("Invalid HARD word");

  // Write docs/data/daily-YYYYMMDD.json
  const outDir  = path.join(process.cwd(), "docs", "data");
  const outFile = path.join(outDir, `wordle-${stamp}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Wrote:", outFile, data);
}

main().catch(err => {
  console.error("Generation failed:", err);
  process.exit(1);
});
