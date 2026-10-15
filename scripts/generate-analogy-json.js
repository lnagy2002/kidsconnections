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
// Accepts the shapes models tend to return: "a : b", "a:b", "a -> b", "a → b", "a is to b"
function cleanPair(text) {
  const t = norm(text).replace(/\s*::\s*$/, "").replace(/\s*(?:->|→|=>|\bis to\b)\s*/g, " : ");
  const parts = t.split(":").map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const ok = (w) => /^[a-z0-9' -]{1,30}$/.test(w);
  return ok(parts[0]) && ok(parts[1]) ? `${parts[0]} : ${parts[1]}` : null;
}

// Returns { item } or { reason } so failures can be counted and logged
function cleanItem(raw) {
  if (!raw || typeof raw !== "object") return { reason: "not an object" };
  const q = cleanPair(raw.q ?? raw.question ?? raw.prompt ?? raw.pair);
  if (!q) return { reason: "bad question pair" };
  const rawChoices = raw.choices ?? raw.options ?? raw.answers;
  if (!Array.isArray(rawChoices) || rawChoices.length !== 4) return { reason: "not 4 choices" };
  const choices = rawChoices.map((c) => cleanPair(typeof c === "object" && c ? (c.text ?? c.pair ?? "") : c));
  if (choices.some((c) => !c)) return { reason: "bad choice pair" };
  if (new Set(choices).size !== 4 || choices.includes(q)) return { reason: "repeated choice" };

  // The answer may come as an index (0-3 or "2"), a letter ("C"), or the text of the right choice
  let a = raw.answer ?? raw.correct ?? raw.answer_index ?? raw.correct_index ?? raw.correct_answer;
  let answer = -1;
  if (typeof a === "number" || /^\d$/.test(String(a ?? "").trim())) answer = Number(a);
  else if (/^[a-d]$/i.test(String(a ?? "").trim())) answer = String(a).trim().toLowerCase().charCodeAt(0) - 97;
  else if (typeof a === "string") answer = choices.indexOf(cleanPair(a));
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) return { reason: "bad answer" };

  return { item: { q: `${q} ::`, choices, answer } };
}

// ---------- Model ----------
async function askModel(client, { date, need, avoid }) {
  const system = [
    "You write word analogy questions for a kids' daily puzzle game.",
    "Return STRICT JSON ONLY with keys \"easy\", \"medium\", \"hard\"; each is an array of objects { \"q\", \"choices\", \"answer\" }.",
    "Example of ONE item: {\"q\": \"cat : kitten ::\", \"choices\": [\"cow : milk\", \"dog : puppy\", \"bird : nest\", \"fish : water\"], \"answer\": 1}",
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
  const reasons = {};
  let example = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const need = {};
    for (const l of LEVELS) if (accepted[l].length < COUNT) need[l] = COUNT - accepted[l].length;
    if (!Object.keys(need).length) break;

    // Ask for a few extra, since some answers get filtered out
    const ask = Object.fromEntries(Object.entries(need).map(([l, n]) => [l, n + 3]));
    const reply = await askModel(client, { date, need: ask, avoid: [...used] });

    const levels = reply.levels && typeof reply.levels === "object" ? reply.levels : reply;
    for (const l of Object.keys(need)) {
      const list = Array.isArray(levels[l]) ? levels[l] : Array.isArray(levels[l]?.questions) ? levels[l].questions : [];
      if (!list.length) reasons[`no ${l} list`] = (reasons[`no ${l} list`] || 0) + 1;
      for (const raw of list) {
        if (accepted[l].length >= COUNT) break;
        const { item, reason } = cleanItem(raw);
        const why = reason || (used.has(keyOf(item)) ? "already used" : null);
        if (why) {
          reasons[why] = (reasons[why] || 0) + 1;
          if (!example) example = { why, raw };
          continue;
        }
        accepted[l].push(item);
        used.add(keyOf(item));
      }
    }
    console.log(`Attempt ${attempt}: ` + LEVELS.map((l) => `${l} ${accepted[l].length}/${COUNT}`).join(", ") +
      (Object.keys(reasons).length ? ` | rejected so far: ${JSON.stringify(reasons)}` : ""));
    if (example && attempt === 1) console.log("  example of a rejected item:", JSON.stringify(example).slice(0, 300));
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
