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

// Simple validators
const isAlpha = s => /^[A-Z]+$/.test(s);
const hasLength = (s, n) => s.length === n;


async function generatePuzzleJSON(client) {
  // Ask the model to output STRICT JSON only, with lengths enforced.
  // We use Structured Outputs to make the model follow a JSON schema. 
  // (This is supported in the Responses API.)
  // Docs: https://platform.openai.com/docs/guides/structured-outputs
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      easy:   { type: "string", description: "ALL CAPS, exactly 4 letters, kid-friendly common word (no proper nouns or plurals)" },
      medium: { type: "string", description: "ALL CAPS, exactly 5 letters, kid-friendly common word (no proper nouns or plurals)" },
      hard:   { type: "string", description: "ALL CAPS, exactly 6 letters, kid-friendly common word (no proper nouns or plurals)" }
    },
    required: ["easy", "medium", "hard"]
  };
  
  const system = `You generate daily words for a kids' Wordle-style game.
  Output strictly valid JSON matching this schema:
{
  "easy": { "id": "MMDDYYYY-E", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "easy" } ], "notes": "string" },
  "medium": { "id": "MMDDYYYY-M", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "medium" } ], "notes": "string" },
  "hard": { "id": "MMDDYYYY-H", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "hard" } ], "notes": "string" }
}
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

  const user = `Date: ${id}.
Return fresh, school-safe words that fit the lengths and are recognizable to kids.`;

  // Chat Completions style (compatible with official SDK)
  const resp = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_schema", json_schema: { name: "DailyWords", schema } },
    reasoning_effort: "minimal", // preferred control knob
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  // Extract JSON object
  const content = resp.output[0]?.content?.[0]?.text;
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }

  // Validate lengths & characters; if invalid, throw (workflow will show logs)
  if (!isAlpha(data.easy)   || !hasLength(data.easy, 4)) throw new Error("Invalid EASY word");
  if (!isAlpha(data.medium) || !hasLength(data.medium, 5)) throw new Error("Invalid MEDIUM word");
  if (!isAlpha(data.hard)   || !hasLength(data.hard, 6)) throw new Error("Invalid HARD word");

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
