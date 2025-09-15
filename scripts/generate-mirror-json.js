/**
 * Generates kid-friendly daily Mirror images WITHOUT external AI calls.
 * Writes: docs/data/mirror-YYYYMMDD.json
 * Output format: { easy: [dataURL...], medium: [...], hard: [...] }
 *
 * Usage:
 *   node scripts/generate-mirror-json.js --count 3 --outDir docs/data --date 2025-09-15 --seed 42
 *
 * No dependencies. Pure Node + inline SVG (base64).
 */

import fs from "node:fs/promises";
import path from "node:path";

// ------------------------ Config & CLI ------------------------
const DEFAULT_COUNT_PER_LEVEL = getArg("--count", 3, Number);
const OUT_DIR = getArg("--outDir", "docs/data");
const DATE_STR = getArg("--date", todayInTZ("America/Los_Angeles")); // YYYY-MM-DD
const SEED = getArg("--seed", null, (v) => Number(v));

// We render square SVGs. They scale nicely in your canvas code.
const CANVAS_SIZE = 768;

const COUNTS = {
  easy: DEFAULT_COUNT_PER_LEVEL,
  medium: DEFAULT_COUNT_PER_LEVEL,
  hard: DEFAULT_COUNT_PER_LEVEL
};

// ------------------------ Randomness (seedable) ------------------------
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = SEED == null ? Math.random : mulberry32(SEED);
const rand = () => rng();
const choice = (arr) => arr[Math.floor(rand() * arr.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i);

// ------------------------ Palettes ------------------------
const PALETTES = [
  ["#0aa7b1", "#f7b32b", "#f45d01", "#2d3047", "#e0fbfc"],
  ["#6dd3ce", "#c8e9a0", "#f7a278", "#a13d63", "#0b3954"],
  ["#00a6fb", "#ffd166", "#ef476f", "#06d6a0", "#26547c"],
  ["#f4a261", "#2a9d8f", "#e76f51", "#264653", "#e9c46a"],
  ["#8ecae6", "#219ebc", "#023047", "#ffb703", "#fb8500"]
];

// ------------------------ SVG Helpers ------------------------
function svgDoc(children, bg = "#ffffff") {
  const s = CANVAS_SIZE;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="40" ry="40" fill="${bg}" />
  ${children.join("\n")}
</svg>`.trim();
}
function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
function rnd(min, max) {
  return min + rand() * (max - min);
}
function rndInt(min, max) {
  return Math.floor(rnd(min, max + 1));
}
function polar(cx, cy, r, a) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// Soft shadow filter (optional subtle depth)
function softShadowDef(id = "sh") {
  return `
  <defs>
    <filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
      <feOffset in="blur" dx="0" dy="4" result="off"/>
      <feMerge>
        <feMergeNode in="off"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>`;
}

// ------------------------ Generators ------------------------
/**
 * EASY: 1 big friendly creature/vehicle with ONE obvious one-sided feature.
 * - Centered body, looking RIGHT
 * - Asymmetry: patch/spot/star ONLY on RIGHT (or LEFT) side
 * - 3–5 bold colors
 */
function genEasySVG() {
  const pal = choice(PALETTES);
  const bg = pal[4];
  const body = pal[0];
  const accent = pal[1];
  const detail = pal[2];
  const eye = "#20242c";

  const s = CANVAS_SIZE;
  const cx = s / 2;
  const cy = s / 2;
  const bodyW = rndInt(380, 480);
  const bodyH = rndInt(300, 420);
  const rx = Math.min(bodyW, bodyH) / 3;

  const lookingRight = true;
  const faceX = cx + bodyW * 0.18; // rightward face
  const faceY = cy - bodyH * 0.08;

  // One-side patch (RIGHT only)
  const patchX = cx + bodyW * rnd(0.15, 0.28);
  const patchY = cy + bodyH * rnd(0.05, 0.22);
  const patchR = rndInt(20, 42);

  const finY = cy + bodyH * 0.25;
  const finW = bodyW * 0.28;

  const svg = svgDoc(
    [
      softShadowDef(),
      // simple background blobs
      `<circle cx="${cx - 220}" cy="${cy - 220}" r="120" fill="${pal[3]}22"/>`,
      `<circle cx="${cx + 240}" cy="${cy + 180}" r="140" fill="${pal[3]}22"/>`,

      // body
      `<rect x="${cx - bodyW / 2}" y="${cy - bodyH / 2}" width="${bodyW}" height="${bodyH}" rx="${rx}" ry="${rx}" fill="${body}" filter="url(#sh)"/>`,

      // fin/tail-ish shape on LEFT to keep it playful
      `<path d="M ${cx - bodyW/2} ${finY}
               q -${finW*0.6} -30, 0 -60
               q ${finW*0.6} 30, 0 60 Z"
            fill="${accent}" opacity="0.9"/>`,

      // face (looking right)
      `<circle cx="${faceX}" cy="${faceY}" r="14" fill="${eye}"/>`,
      `<circle cx="${faceX + 30}" cy="${faceY + 22}" r="10" fill="${eye}"/>`,

      // one-side patch (RIGHT side only)
      `<circle cx="${patchX}" cy="${patchY}" r="${patchR}" fill="${detail}" stroke="${eye}15" stroke-width="6"/>`,

      // stripe only on LEFT? (keep one real one-sided clue)
      `<rect x="${cx - bodyW/2 + 16}" y="${cy - bodyH/2 + 24}" width="16" height="${bodyH - 48}" fill="${accent}" opacity="0.7"/>`
    ],
    bg
  );
  return svg;
}

/**
 * MEDIUM: 2–3 objects arranged asymmetrically + character looking RIGHT.
 * - Balloons on LEFT vs. kite on RIGHT, etc.
 */
function genMediumSVG() {
  const pal = choice(PALETTES);
  const bg = pal[0] + "11";
  const primary = pal[1];
  const secondary = pal[2];
  const tertiary = pal[3];
  const eye = "#1a1d24";

  const s = CANVAS_SIZE;
  const cx = s / 2;
  const ground = s * 0.78;

  // Character body
  const bodyW = 220;
  const bodyH = 260;

  // LEFT: 3 balloons
  const balloons = range(3).map((i) => {
    const bx = cx - 220 + rnd(-30, 10);
    const by = 200 + i * rnd(60, 80);
    const br = rnd(26, 34);
    const col = choice([primary, secondary, tertiary]);
    return `
      <line x1="${bx}" y1="${by + br}" x2="${bx + 40}" y2="${ground - 60}" stroke="${col}aa" stroke-width="4"/>
      <ellipse cx="${bx}" cy="${by}" rx="${br}" ry="${br * 1.2}" fill="${col}" />
    `;
  });

  // RIGHT: 1 kite + tail
  const kx = cx + 230;
  const ky = 260;
  const kite = `
    <polygon points="${kx},${ky - 30} ${kx + 30},${ky} ${kx},${ky + 30} ${kx - 30},${ky}" fill="${secondary}"/>
    ${range(6)
      .map((i) => {
        const [tx, ty] = polar(kx - 20 - i * 28, ky + 20 + i * 4, 0, 0);
        return `<circle cx="${tx}" cy="${ty}" r="6" fill="${tertiary}"/>`;
      })
      .join("")}
    <path d="M ${kx - 30} ${ky + 10} Q ${kx - 110} ${ky + 140}, ${kx - 190} ${ky + 200}" fill="none" stroke="${tertiary}cc" stroke-width="4"/>
  `;

  const svg = svgDoc(
    [
      softShadowDef(),

      // Sky and ground bands
      `<rect x="0" y="0" width="${s}" height="${s}" fill="${bg}"/>`,
      `<rect x="0" y="${ground}" width="${s}" height="${s - ground}" fill="${pal[4]}"/>`,

      // Character (looking right)
      `<rect x="${cx - bodyW / 2}" y="${ground - bodyH}" width="${bodyW}" height="${bodyH}" rx="28" fill="${primary}" filter="url(#sh)"/>`,
      `<circle cx="${cx + 30}" cy="${ground - bodyH + 50}" r="10" fill="${eye}"/>`,
      `<rect x="${cx - 40}" y="${ground - 120}" width="18" height="40" rx="8" fill="${secondary}" />`, // one-side pocket (LEFT only)

      // LEFT balloons
      ...balloons,

      // RIGHT kite
      kite
    ],
    "#ffffff"
  );
  return svg;
}

/**
 * HARD: playful “playground” with multiple subtle left/right-only clues.
 * - Several shapes/props scattered; a couple of one-sided pads/patches.
 */
function genHardSVG() {
  const pal = choice(PALETTES);
  const bg = pal[0] + "10";
  const main = pal[1];
  const alt = pal[2];
  const extra = pal[3];
  const eye = "#0e1116";

  const s = CANVAS_SIZE;
  const cx = s / 2;
  const ground = s * 0.8;

  // scattered props (benches/blocks)
  const props = range(6).map(() => {
    const w = rndInt(80, 140);
    const h = rndInt(24, 36);
    const x = rndInt(40, s - w - 40);
    const y = rndInt(ground - 140, ground - 40);
    const col = choice([main, alt, extra]);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${col}" opacity="0.9"/>`;
  });

  // two “characters” facing different directions
  const char = (x, faceRight, color) => {
    const w = 170, h = 210;
    const y = ground - h;
    const eyeX = faceRight ? x + w * 0.65 : x + w * 0.35;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${color}" filter="url(#sh)"/>
      <circle cx="${eyeX}" cy="${y + 46}" r="9" fill="${eye}"/>
    `;
  };

  // left-only kneepad on char A; right-only shoulder patch on char B
  const charA_X = cx - 260;
  const charB_X = cx + 80;

  const leftKnee = `
    <circle cx="${charA_X + 40}" cy="${ground - 26}" r="12" fill="${alt}" stroke="${eye}10" stroke-width="5"/>
  `;
  const rightShoulder = `
    <rect x="${charB_X + 120}" y="${ground - 210 + 32}" width="22" height="28" rx="6" fill="${extra}" />
  `;

  // asym objects further: slide on LEFT, bench on RIGHT
  const slide = `
    <path d="M ${cx - 330} ${ground - 30} L ${cx - 210} ${ground - 170} L ${cx - 180} ${ground - 170} L ${cx - 300} ${ground - 30} Z"
          fill="${extra}aa" />
    <rect x="${cx - 300}" y="${ground - 30}" width="140" height="16" rx="8" fill="${extra}"/>
  `;
  const bench = `
    <rect x="${cx + 220}" y="${ground - 50}" width="160" height="18" rx="9" fill="${alt}"/>
    <rect x="${cx + 230}" y="${ground - 32}" width="12" height="26" fill="${alt}"/>
    <rect x="${cx + 360}" y="${ground - 32}" width="12" height="26" fill="${alt}"/>
  `;

  const svg = svgDoc(
    [
      softShadowDef(),
      `<rect x="0" y="0" width="${s}" height="${s}" fill="${bg}"/>`,
      `<rect x="0" y="${ground}" width="${s}" height="${s - ground}" fill="${pal[4]}"/>`,

      slide,
      bench,
      ...props,

      char(charA_X, true, main),   // looking right
      leftKnee,                    // LEFT-only clue

      char(charB_X, false, alt),   // looking left
      rightShoulder                // RIGHT-only clue
    ],
    "#ffffff"
  );
  return svg;
}

// ------------------------ Main ------------------------
(async () => {
  try {
    console.log(`🎨 Generating (non-AI) Mirror images for ${DATE_STR} ...`);
    const result = { easy: [], medium: [], hard: [] };

    const levels = /** @type {const} */ (["easy", "medium", "hard"]);
    for (const level of levels) {
      const n = COUNTS[level];
      if (n <= 0) continue;

      for (let i = 0; i < n; i++) {
        let svg;
        if (level === "easy") svg = genEasySVG();
        else if (level === "medium") svg = genMediumSVG();
        else svg = genHardSVG();

        result[level].push(toDataUrl(svg));
      }
    }

    await fs.mkdir(OUT_DIR, { recursive: true });
    const today = new Date();
    const stamp = mmddyyyy(today);
    const outPath = path.join(OUT_DIR, `mirror-${stamp}.json`);
    await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");

    console.log(`✅ Wrote ${outPath}`);
  } catch (err) {
    console.error("❌ Failed to generate daily Mirror images");
    console.error(err);
    process.exitCode = 1;
  }
})();

// ------------------------ Utils ------------------------
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
function getArg(flag, fallback, map = (v) => v) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return map(process.argv[i + 1]);
  return fallback;
}
