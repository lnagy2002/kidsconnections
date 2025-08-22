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

// Simple validators
const isAlpha = s => /^[A-Z]+$/.test(s);
const hasLength = (s, n) => s.length === n;

async function main() {
  const today = new Date();
  const stamp = mmddyyyy(today);

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

  const system = `
You generate daily words for a kids' Wordle-style game.
Rules:
- EASY: 4-letter common word.
- MEDIUM: 5-letter common word.
- HARD: 6-letter common word.
- ALL CAPS A–Z. No hyphens, accents, numbers, or punctuation.
- No proper nouns, no brand names, no slang, no offensive terms.
- Age-appropriate (grades 2+).
- Output JSON ONLY per the given schema.`;

  const user = `Date: ${stamp}.
Return fresh, school-safe words that fit the lengths and are recognizable to kids.`;

  // Create a response with JSON structured output
  const resp = await client.responses.create({
    model: "gpt-5-nano",
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_schema", json_schema: { name: "DailyWords", schema } }
  }); // Responses API ref: https://platform.openai.com/docs/api-reference/responses

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
