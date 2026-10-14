// scripts/generate-analogy-json.js
// Node 20+, ESM. Requires OPENAI_API_KEY in repo secrets.
// Outputs:
//   - docs/data/analogy-MMDDYYYY.json (named by the UTC date, like the Wordle file)
//     shape: { date, levels: { easy: [{ q, choices[4], answer }], medium: [...], hard: [...] } }
//   - docs/data/analogy-history.json (every analogy used so far; never reused)

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

// ---------- Config ----------
const OUT_DIR = path.join("docs", "data");
const HISTORY_FILE = path.join(OUT_DIR, "analogy-history.json");
const STATIC_FILE = path.join(OUT_DIR, "daily-analogies.json"); // the old fixed set; never reuse it either
const LEVELS = ["easy", "medium", "hard"];
const COUNT = 10;          // questions per level per day (the game shows 10)
const MIN_QUESTIONS = 6;   // fewer than this fails the run, so the game falls back to yesterday's file
const MAX_ATTEMPTS = 5;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const LEVEL_GUIDE = {
  easy: "ages 6–8: everyday things, animals and their babies, opposites, colors, simple 'what it does' pairs",
  medium: "ages 8–10: part/whole, tool/use, worker/workplace, category/member, measurement/what it measures",
  hard: "ages 10–12: cause/effect, degree (warm : hot), shapes and numbers, nature and science facts, synonyms"
};

// UTC date, so the run right after midnight UTC writes today's file (not yesterday's)
function todayStr() {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${m}${d}${now.getUTCFullYear()}`;
}

// ---------- History ----------
// An analogy is identified by its question plus its correct pair, ignoring case and spacing
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const keyOf = (item) => `${norm(item.q)} ${norm(item.choices[item.answer])}`;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function loadUsed() {
  const history = readJson(HISTORY_FILE, { easy: [], medium: [], hard: [] });
  const used = new Set(LEVELS.flatMap((l) => history[l] || []));
  const staticSet = readJson(STATIC_FILE, { levels: {} });
  for (const l of LEVELS) for (const item of staticSet.levels?.[l] || []) used.add(keyOf(item));
  return { history, used };
}

function saveHistory(history, accepted) {
  const merged = {};
  for (const l of LEVELS) merged[l] = [...new Set([...(history[l] || []), ...accepted[l].map(keyOf)])];
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(merged, null, 2) + "\n");
}

// ---------- Validation ----------
const PAIR = /^[a-z0-9' -]{2,30} : [a-z0-9' -]{1,30}$/;

function cleanItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const q = norm(raw.q).replace(/\s*::\s*$/, "");
  const choices = Array.isArray(raw.choices) ? raw.choices.map(norm) : [];
  const answer = Number(raw.answer);
  if (!PAIR.test(q)) return null;
  if (choices.length !== 4 || !choices.every((c) => PAIR.test(c))) return null;
  if (new Set(choices).size !== 4 || choices.includes(q)) return null;
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
  return { q: `${q} ::`, choices, answer };
}

// ---------- Model ----------
async function askModel(client, { date, need, avoid }) {
  const system = [
    "You write word analogy questions for a kids' daily puzzle game.",
    "Return STRICT JSON ONLY with keys \"easy\", \"medium\", \"hard\"; each is an array of objects { \"q\", \"choices\", \"answer\" }.",
    "Format:",
    "- q is one pair followed by \" ::\", e.g. \"cat : kitten ::\".",
    "- choices is exactly 4 pairs written \"word : word\"; exactly one has the SAME relationship as q.",
    "- answer is the 0-based index of the correct choice. Put the correct choice in different positions.",
    "- lowercase words only (digits allowed, e.g. \"hexagon : 6 sides\"); no punctuation besides \" : \".",
    "- The 3 wrong choices must be clearly wrong, but still use sensible real words.",
    "Content:",
    `- EASY: ${LEVEL_GUIDE.easy}`,
    `- MEDIUM: ${LEVEL_GUIDE.medium}`,
    `- HARD: ${LEVEL_GUIDE.hard}`,
    "- School-safe, kind, and correct. Mix many different relationships in each level.",
    "- Never repeat any analogy listed in AVOID (format: \"question correct-pair\")."
  ].join("\n");

  const user = JSON.stringify({ date, how_many: need, AVOID: avoid });

  const resp = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.9,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const text = resp.choices?.[0]?.message?.content?.trim() || "";
  try {
    return JSON.parse(text);
  } catch {
    console.warn("Model did not return valid JSON:", text.slice(0, 200));
    return {};
  }
}

// ---------- Main ----------
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY");
    process.exit(1);
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const date = todayStr();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { history, used } = loadUsed();
  const accepted = { easy: [], medium: [], hard: [] };
  let rejected = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const need = {};
    for (const l of LEVELS) if (accepted[l].length < COUNT) need[l] = COUNT - accepted[l].length;
    if (!Object.keys(need).length) break;

    // Ask for a few extra, since some answers get filtered out
    const ask = Object.fromEntries(Object.entries(need).map(([l, n]) => [l, n + 3]));
    const reply = await askModel(client, { date, need: ask, avoid: [...used] });

    for (const l of Object.keys(need)) {
      for (const raw of Array.isArray(reply[l]) ? reply[l] : []) {
        if (accepted[l].length >= COUNT) break;
        const item = cleanItem(raw);
        if (!item || used.has(keyOf(item))) { rejected++; continue; }
        accepted[l].push(item);
        used.add(keyOf(item));
      }
    }
    console.log(`Attempt ${attempt}: ` + LEVELS.map((l) => `${l} ${accepted[l].length}/${COUNT}`).join(", ") + ` (rejected so far: ${rejected})`);
  }

  const short = LEVELS.filter((l) => accepted[l].length < MIN_QUESTIONS);
  if (short.length) throw new Error(`Not enough new valid analogies for: ${short.join(", ")}`);

  const outFile = path.join(OUT_DIR, `analogy-${date}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ date, levels: accepted }, null, 2) + "\n");
  saveHistory(history, accepted);
  console.log(`✅ Generated:\n - ${outFile}\n - updated ${HISTORY_FILE}`);
}

main().catch((err) => {
  console.error("❌ Generation failed:", err?.message || err);
  process.exit(1);
});
