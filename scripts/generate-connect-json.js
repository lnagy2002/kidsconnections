// scripts/generate-json.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Helpers ----------
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

// ---------- NEW: History Loader ----------
function loadRecentCategories(limit = 200) {
  const dir = path.join(process.cwd(), "docs", "data");
  if (!fs.existsSync(dir)) return [];

  // Get all daily-*.json files
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith("daily-") && f.endsWith(".json"))
    .sort(); // Sorts by date string roughly (good enough for file names)

  // Take the last 30 files (approx 1 month)
  const recentFiles = files.slice(-30);
  
  const categories = new Set();

  for (const file of recentFiles) {
    try {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const json = JSON.parse(content);
      
      // Extract group names from easy, medium, and hard
      ["easy", "medium", "hard"].forEach(level => {
        if (json[level] && Array.isArray(json[level].groups)) {
          json[level].groups.forEach(g => {
            if (g.name) categories.add(g.name);
          });
        }
      });
    } catch (err) {
      console.warn(`Warning: Could not parse ${file}:`, err.message);
    }
  }

  // Convert to array and slice to limit token usage
  return Array.from(categories).slice(-limit);
}

// ---------- Logic ----------
async function generatePuzzleJSON(client) {
  // 1. Get the blocklist
  const blockedCategories = loadRecentCategories();
  console.log(`Loaded ${blockedCategories.length} previous categories to avoid.`);

  // 2. Construct the prompt
  const system = `
You generate kid-friendly "Connections"-style puzzles.

### INPUT CONTEXT
The following is a list of categories used in the last 30 days. 
**CRITICAL RULE:** Do NOT use any of these exact category names, and avoid themes that are too similar to these:
${JSON.stringify(blockedCategories)}

### OUTPUT SCHEMA
Return strictly valid JSON.
{
  "easy":   { "id": "MMDDYYYY-E", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "easy" } ], "notes": "string" },
  "medium": { "id": "MMDDYYYY-M", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "medium" } ], "notes": "string" },
  "hard":   { "id": "MMDDYYYY-H", "generatedAt": "ISO timestamp", "groups": [ { "name": "string", "items": ["a","b","c","d"], "difficulty": "hard" } ], "notes": "string" }
}

### GLOBAL RULES
1. **Structure:** Each difficulty MUST have exactly 4 groups. Each group MUST have exactly 4 items.
2. **Uniqueness:** No item (word) can be repeated anywhere in the entire JSON (not within a puzzle, and not across difficulties).
3. **Freshness:** Categories must be distinct from the provided blocklist.
4. **Content:** Kid-appropriate (Grades 2-6). No adult trivia.
5. **Difficulty:**
   - Easy: Concrete, visual themes (e.g., "Things that are Red").
   - Medium: Simple wordplay or compound words.
   - Hard: Abstract connections or multi-meaning words.

### "TRICKY" REQUIREMENT
For Medium/Hard, ensure there is some "cross-over temptation" (words that *seem* like they fit another group) but strictly only belong to one correct group.
`;

  const today = new Date();
  const id = mmddyyyy(today);
  const user = `Generate 3 puzzles (easy, medium, hard) for date ${id}. ensure complete freshness.`;

  // 3. Call AI
  const resp = await client.chat.completions.create({
    model: "gpt-5-nano", // Ensure this model supports response_format, otherwise use gpt-4o or gpt-3.5-turbo-1106
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    // NEW: Enforce JSON mode to prevent syntax errors
    response_format: { type: "json_object" },
    reasoning_effort: "medium", // bumped to medium for better duplicate checking
  });

  const text = resp.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model.");

  console.log("AI Response received. Parsing...");
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Failed JSON:", text);
    throw new Error("AI returned invalid JSON.");
  }

  // 4. Validate Structure & Uniqueness
  const allItems = new Set();
  
  ["easy", "medium", "hard"].forEach(level => {
    // Check structure
    if (!data[level] || !Array.isArray(data[level].groups) || data[level].groups.length !== 4) {
      throw new Error(`Validation failed: "${level}" must have exactly 4 groups.`);
    }

    // Check internal groups and item uniqueness
    data[level].groups.forEach(group => {
      if (!Array.isArray(group.items) || group.items.length !== 4) {
        throw new Error(`Validation failed: Group "${group.name}" in ${level} must have exactly 4 items.`);
      }

      group.items.forEach(item => {
        const normalized = item.trim().toLowerCase();
        if (allItems.has(normalized)) {
          throw new Error(`Validation failed: Item "${item}" appears more than once in this day's puzzles.`);
        }
        allItems.add(normalized);
      });
    });
    
    // Inject timestamps
    data[level].id = `${id}-${level.charAt(0).toUpperCase()}`;
    data[level].generatedAt = today.toISOString();
  });

  return data;
}

// ---------- Main Loop ----------
(async () => {
  try {
    assertEnv("OPENAI_API_KEY");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const outDir = path.join(process.cwd(), "docs", "data");
    fs.mkdirSync(outDir, { recursive: true });

    const stamp = mmddyyyy();
    const outFile = path.join(outDir, `daily-${stamp}.json`);

    // Idempotency
    if (fs.existsSync(outFile)) {
      console.log(`Already exists: ${outFile}`);
      process.exit(0);
    }

    // Retry loop
    let lastErr;
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Attempt ${i + 1} of 3...`);
        const payload = await generatePuzzleJSON(client);
        fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
        console.log(`✅ Wrote ${outFile}`);
        process.exit(0);
      } catch (e) {
        lastErr = e;
        console.warn(`⚠️ Attempt ${i + 1} failed: ${e.message}`);
        // Backoff: 2s, 4s, 6s
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw lastErr;
  } catch (err) {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
  }
})();
