/**
 * scripts/generate-images-json.js
 * -------------------------------------------------------
 * Generates a JSON file with multiple random, valid image LINKS (no downloads).
 * Uses providers that don't 404 and don't need API keys.
 *
 * Output: docs/data/images-YYYY-MM-DD.json
 * Shape:  { "images": [ { id, title, src }, ... ] }
 */

import fs from "node:fs";
import path from "node:path";

// ------- Defaults (no CLI) -------
const OUTPUT_DIR   = path.join(process.cwd(), "docs", "data");
const IMAGE_COUNT  = 6;        // images per run
const WIDTH        = 1200;
const HEIGHT       = 800;

// ------- Helpers -------
function yyyymmdd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) { return arr[randInt(0, arr.length - 1)]; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Kid-friendly keyword pool
const KEYWORDS = [
  "mountain","forest","lake","river","robot","kite","castle","bridge","tree",
  "fox","balloon","sunset","playground","beach","flower","sky","train","city","butterfly"
];

// Providers that always resolve without real IDs or keys
function unsplashUrl(keyword, seed) {
  // Random by keyword; `sig` nudges a new result each time
  return `https://source.unsplash.com/random/${WIDTH}x${HEIGHT}?${encodeURIComponent(keyword)}&sig=${seed}`;
}
function loremFlickrUrl(keyword, seed) {
  // Random by keyword; `lock` pins to a specific but varied image per seed
  return `https://loremflickr.com/${WIDTH}/${HEIGHT}/${encodeURIComponent(keyword)}?lock=${seed}`;
}
function picsumUrl(seed) {
  // No keyword, but great quality randomness via seed
  return `https://picsum.photos/seed/${seed}/${WIDTH}/${HEIGHT}`;
}

function randomImageUrl(keyword, idx) {
  // Mix providers to guarantee valid links and variety
  const seed = `${Date.now()}_${idx}_${randInt(1000, 999999)}`;
  const providers = [
    unsplashUrl(keyword, seed),
    loremFlickrUrl(keyword, seed),
    picsumUrl(seed)
  ];
  return choice(providers);
}

// ------- Main -------
(() => {
  const stamp = yyyymmdd(new Date());

  const images = [];
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const keyword = choice(KEYWORDS);
    const id = slug(`${keyword}-${i + 1}-${stamp}`);
    const title = `${cap(keyword)} Scene`;
    const src = randomImageUrl(keyword, i);
    images.push({ id, title, src });
  }

  const payload = { images };
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `images-${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`✅ Generated ${images.length} random images → ${outFile}`);
})();
