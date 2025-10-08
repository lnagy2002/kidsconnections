/**
 * generate-random-images-json.js
 * -------------------------------------------------------
 * Generates a JSON file with several random, safe image links.
 * Each run produces different results.
 *
 * Output file: docs/data/images-YYYY-MM-DD.json
 *
 * Example:
 * {
 *   "images": [
 *     {
 *       "id": "forest-1-2025-10-08",
 *       "title": "Peaceful Forest",
 *       "src": "https://cdn.pixabay.com/photo/2016/11/14/03/16/forest-1822636_1280.jpg"
 *     }
 *   ]
 * }
 */

import fs from "node:fs";
import path from "node:path";

// -------- Defaults --------
const OUTPUT_DIR = path.join(process.cwd(), "docs", "data");
const IMAGE_COUNT = 1; //  how  many images per  run
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;

// -------- Helper functions --------
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
function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// -------- Keyword ideas --------
const KEYWORDS = [
  "mountain", "forest", "lake", "river", "robot", "kite",
  "castle", "bridge", "tree", "fox", "balloon", "sunset",
  "playground", "beach", "flower", "sky", "train", "city", "butterfly"
];

// Pixabay & Pexels base URLs with placeholders for keywords
function randomImageUrl(keyword) {
  const sources = [
    // Pixabay safe stock
    `https://cdn.pixabay.com/photo/${randInt(2015, 2025)}/0${randInt(1,9)}/random/${keyword}-${randInt(100000,999999)}_1280.jpg`,
    // Pexels CDN style randomizer
    `https://images.pexels.com/photos/${randInt(100,999) * randInt(100,999)}/pexels-photo.jpeg?w=${IMAGE_WIDTH}&h=${IMAGE_HEIGHT}&keyword=${keyword}`,
    // Unsplash fallback
    `https://source.unsplash.com/random/${IMAGE_WIDTH}x${IMAGE_HEIGHT}?${keyword}&sig=${randInt(1000,9999)}`
  ];
  return choice(sources);
}

// -------- Main --------
(() => {
  const today = new Date();
  const stamp = yyyymmdd(today);

  const images = [];
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const keyword = choice(KEYWORDS);
    const id = slug(`${keyword}-${i + 1}-${stamp}`);
    const title = `${capitalize(keyword)} Scene`;
    const src = randomImageUrl(keyword);
    images.push({ id, title, src });
  }

  const payload = { images };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, `images-${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`✅ Generated ${images.length} random images → ${outFile}`);
})();
