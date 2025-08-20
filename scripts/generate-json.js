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
  const system = `You generate daily kid-friendly "Connections"-style puzzles.
Output strictly valid JSON that matches this schema:
{
  "id": "MMDDYYYY",
  "generatedAt": "ISO-8601 timestamp",
  "groups": [
    {"name": "string", "items": ["a","b","c","d"], "difficulty": "easy|medium|hard"}
  ],
  "notes": "string"
}
Rules: 
- Items must be unambiguous for grades 2-5.
- No brand names or sensitive topics.
- Vary categories daily; avoid repeats within a week.
Return ONLY JSON.`;

  const today = new Date();
  const id = mmddyyyy(today);

  const user = `Create 4 groups of 4 items each for date ${id}.
One group should be animals, one colors or shapes, the others open but kid-safe.
Do not repeat items across groups.`;

  // Chat Completions style (compatible with official SDK)
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.7
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  // Basic JSON guard: strip code fences if present
  const jsonString = text.replace(/^```json\s*|\s*```$/g, "");
  const data = JSON.parse(jsonString);

  // Minimal shape check
  if (!Array.isArray(data.groups) || data.groups.length !== 4) {
    throw new Error("JSON validation failed: expected 4 groups.");
  }

  data.id = id;
  data.generatedAt = today.toISOString();

  return data;
}

(async () => {
  assertEnv("OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const outDir = path.join(process.cwd(), "data");
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
