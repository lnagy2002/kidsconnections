// scripts/generate-json.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- helpers ----------
function mmddyyyy(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

function assertEnv(name) {
  if (!process.env[name]) {
    throw new Error(`${name} missing. Add it as a GitHub Actions secret.`);
  }
}

async function generatePuzzleJSON(client) {
  const system = `You generate daily words for a kids' Wordle-style game.
Rules:
- EASY: 4-letter common word.
- MEDIUM: 5-letter common word.
- HARD: 6-letter common word.
- ALL CAPS A–Z. No hyphens, accents, numbers, or punctuation.
- No proper nouns, no brand names, no slang, no offensive terms.
- Age-appropriate (grades 2+).
- Output JSON ONLY per the given schema.`;

  const today = new Date();
  const id = mmddyyyy(today);

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
  const data = JSON.parse(jsonString);

  // Minimal shape check for new structure
["easy", "medium", "hard"].forEach(level => {
  if (
    !data[level] ||
    !Array.isArray(data[level].groups) ||
    data[level].groups.length !== 4
  ) {
    throw new Error(`JSON validation failed: expected 4 groups in "${level}" puzzle.`);
  }});


  data.id = id;
  data.generatedAt = today.toISOString();

  return data;
}

(async () => {
  assertEnv("OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const outDir = path.join(process.cwd(), "docs", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = mmddyyyy();
  const outFile = path.join(outDir, `wordle-${stamp}.json`);

  // Idempotency: skip if today's file already exists
  if (fs.existsSync(outFile)) {
    console.log(`Already exists: ${outFile}`);
    process.exit(0);
  }

  // Simple retry loop for transient errors
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const payload = await generatePuzzleJSON(client);
      fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
      console.log(`Wrote ${outFile}`);
      process.exit(0);
    } catch (e) {
      lastErr = e;
      console.warn(`Attempt ${i + 1} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
})().catch(err => {
  console.error(err);
  process.exit(1);
});
