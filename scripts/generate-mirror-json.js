// scripts/generate-mirror-json.js
// Generates kid-friendly daily Mirror images via OpenAI and writes docs/data/mirror-YYYYMMDD.json

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ------------------------ Config ------------------------
const DEFAULT_COUNT_PER_LEVEL = getArg("--count", 3, Number);
const OUT_DIR = getArg("--outDir", "docs/data");
const DATE_STR = getArg("--date", todayInTZ("America/Los_Angeles")); // YYYY-MM-DD
const SIZE = getArg("--size", "768x768"); // OpenAI image size, e.g. "512x512","768x768","1024x1024"
const MODEL = getArg("--model", "gpt-image-1"); // OpenAI image model

// Prompts tuned for kid-friendly, mirror-test images.
// No text/letters/numbers/logos to keep it classroom-safe and universally readable.
const PROMPTS = {
  easy: `
A bright, kid-friendly, square illustration with clear LEFT/RIGHT asymmetry:
- One big cartoon subject (animal or vehicle) facing RIGHT
- One obvious feature ONLY on one side (e.g., a single cheek spot on the RIGHT, one star on the LEFT ear, one stripe only on one side)
- Simple background, 3–5 bold colors, high contrast
- NO text, NO numbers, NO logos, NO watermarks, NO frames
- Centered composition, soft shading, clean outlines
  `.trim(),

  medium: `
A kid-friendly scene with multiple LEFT/RIGHT clues:
- Two or three distinct objects arranged asymmetrically (e.g., three balloons on the LEFT, one kite on the RIGHT)
- Character looking to the RIGHT; small features (like a single pocket or patch) only on one side
- Slightly busier background than easy, 5–8 colors, still clear shapes
- NO text, NO numbers, NO logos, NO watermarks, NO frames
- Balanced but clearly asymmetric layout
  `.trim(),

  hard: `
A busy, playful playground scene with subtle LEFT/RIGHT asymmetries:
- Several characters facing different directions; some props appear only on one side (e.g., a slide on LEFT, a bench on RIGHT)
- Small off-center details (one knee pad, one glove, one shoulder patch) limited to one side on some characters
- Rich background with depth, 8–12 colors but keep shapes readable
- NO text, NO numbers, NO logos, NO watermarks, NO frames
- Make asymmetries real but not too obvious
  `.trim()
};

// How many images per level?
const COUNTS = {
  easy: DEFAULT_COUNT_PER_LEVEL,
  medium: DEFAULT_COUNT_PER_LEVEL,
  hard: DEFAULT_COUNT_PER_LEVEL
};

// ------------------------ Main ------------------------
(async () => {
  try {
    requireKey();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log(`🖼  Generating Mirror images for ${DATE_STR} ...`);
    const result = { easy: [], medium: [], hard: [] };

    for (const level of /** @type {Array<keyof typeof PROMPTS>} */ (["easy","medium","hard"])) {
      const n = COUNTS[level];
      if (n <= 0) continue;
      console.log(`   • ${level}: ${n} × ${SIZE}`);

      // Generate in small batches to be gentle on rate limits.
      const batchSize = 3;
      let remaining = n;

      while (remaining > 0) {
        const take = Math.min(batchSize, remaining);
        const images = await generateImages({
          client,
          model: MODEL,
          prompt: PROMPTS[level],
          n: take,
          size: SIZE
        });

        // Convert to data URLs (PNG)
        const urls = images.map(b64 => `data:image/png;base64,${b64}`);
        result[level].push(...urls);
        remaining -= take;
      }
    }

    // Ensure out dir and write file
    await fs.mkdir(OUT_DIR, { recursive: true });
    const yyyymmdd = DATE_STR.replaceAll("-", "");
    const outPath = path.join(OUT_DIR, `mirror-${yyyymmdd}.json`);

    // Store a compact structure your game already understands:
    // { easy: [...], medium: [...], hard: [...] }
    const json = JSON.stringify(result, null, 2);
    await fs.writeFile(outPath, json, "utf8");

    console.log(`✅ Wrote ${outPath}`);
  } catch (err) {
    console.error("❌ Failed to generate daily Mirror images");
    console.error(err?.response?.data ?? err);
    process.exitCode = 1;
  }
})();

// ------------------------ Helpers ------------------------

/**
 * Call OpenAI Images API with retries.
 * Returns an array of base64 strings (without data URL prefix).
 */
async function generateImages({ client, model, prompt, n, size }) {
  const maxRetries = 3;
  let attempt = 0;
  // Basic jitter for retries
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // The official API returns { data: [{ b64_json }, ...] }
  // Ref: OpenAI Image generation docs (Node). :contentReference[oaicite:0]{index=0}
  while (true) {
    try {
      const res = await client.images.generate({
        model,
        prompt,
        n,
        size
      });
      return res.data.map(d => d.b64_json);
    } catch (e) {
      attempt++;
      if (attempt > maxRetries) throw e;
      const backoff = 500 * attempt + Math.floor(Math.random() * 300);
      console.warn(`   …retrying (${attempt}/${maxRetries}) in ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

/** Ensure an API key exists. */
function requireKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY env var is required.");
  }
}

/** Return today’s date in given IANA TZ as YYYY-MM-DD. */
function todayInTZ(tz) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const d = parts.find(p => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

/** Tiny CLI arg getter with default + transform. */
function getArg(flag, fallback, map = (v) => v) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) {
    return map(process.argv[i + 1]);
  }
  return fallback;
}
