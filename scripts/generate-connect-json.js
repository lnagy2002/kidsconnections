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
  const recentJSON = JSON.stringify([], null, 2);
  
  const system = `
You generate kid-friendly "Connections"-style puzzles.

Input (optional):
recent_category_names = the array below containing category names used in the past 30 days (strings). Use this to avoid repeats.
recent_category_names = ${recentJSON}

Output: strictly valid JSON matching this schema exactly:
{
  "easy":   { "id": "MMDDYYYY-E", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "easy" } ], "notes": "string" },
  "medium": { "id": "MMDDYYYY-M", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "medium" } ], "notes": "string" },
  "hard":   { "id": "MMDDYYYY-H", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "hard" } ], "notes": "string" }
}

Global rules
- Each difficulty contains exactly 4 groups of 4 items (16 items per puzzle).
- No item repeats anywhere within the entire day’s JSON (across easy/medium/hard).
- Category names must be unique within the day and must not repeat any in recent_category_names (hard blocklist).
- Do not use trivial paraphrases of blocked categories (avoid reuse of the same underlying concept; treat paraphrases with ≤50% token overlap as repeats).
- If recent_category_names is empty, still avoid repeating categories within the day.
- Items must be kid-appropriate and unambiguous for the grade range.
- Keep categories diverse: mix concrete themes (animals, shapes, everyday objects) with light patterning (prefix/suffix, simple word relationships). Avoid adult trivia.

Difficulty targets
- Easy (Grades 2–3): Concrete, familiar categories; single-step connections; zero ambiguity.
- Medium (Grades 4–5): Slightly trickier; allow simple wordplay (shared prefix/suffix, compound word parts) or a clear 2-step that’s obvious once seen.
- Hard (Grades 6+): More abstract or multi-step (metaphorical groupings, subtle patterns) but solvable without niche knowledge.

“TINY BIT HARDER” requirement (still fair)
- For Medium and Hard, include at least one near-miss temptation (e.g., two items feel related across groups) but ensure each item fits only one correct group. Use distinct, unambiguous definitions to prevent real overlap.
- Do NOT use homophones, hidden anagrams, or adult-level trivia.

Notes field
- In each difficulty’s "notes", briefly explain each category and mention any near-miss and why it isn’t a true fit.

Return ONLY JSON.`;

  const today = new Date();
  const id = mmddyyyy(today);

  const user = `Generate 3 puzzles (easy, medium, hard) for date ${id}.New categories daily.`;

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
  const outFile = path.join(outDir, `daily-${stamp}.json`);

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
