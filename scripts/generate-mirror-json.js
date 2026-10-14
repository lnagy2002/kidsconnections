/**
 * Generates kid-friendly daily Mirror Match pictures WITHOUT external AI calls.
 * Writes: docs/data/mirror-MMDDYYYY.json
 * Output format: { easy: [dataURL...], medium: [...], hard: [...] }
 *
 * Each picture is a small scene built from objects that clearly face one way
 * (cars, ducks, snails, fish, boats, flags...). The game shows the picture
 * mirrored, flipped upside down and turned 180°, so every candidate picture is
 * rendered to pixels and rejected unless all four versions look clearly different.
 *
 * CLI:
 *   --count N   pictures per level (default 1)
 *   --seed N    make the run repeatable
 *   --out FILE  write somewhere else (handy for previews)
 */

import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

// ------------------------ Config & CLI ------------------------
const DEFAULT_COUNT_PER_LEVEL = getArg("--count", 1, Number);
const SEED = getArg("--seed", null, (v) => Number(v));
const OUT = getArg("--out", null);

// We render square SVGs. They scale nicely in the game's canvas code.
const CANVAS_SIZE = 768;

const LEVELS = ["easy", "medium", "hard"];

// How many objects each level gets, how big they are, and how different the
// four versions of the picture must look (share of pixels that change).
const LEVEL_RULES = {
  easy: { objects: 1, scale: [1.9, 2.2], minDiff: 0.12, sun: true },
  medium: { objects: 2, scale: [1.25, 1.4], minDiff: 0.08, sun: true },
  hard: { objects: 3, scale: [0.9, 1.0], minDiff: 0.05, sun: false }
};

const MAX_ATTEMPTS = 60;
const CHECK_SIZE = 128; // pixels used for the similarity check

function mmddyyyy(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

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
const rnd = (min, max) => min + rand() * (max - min);
const choice = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ------------------------ Colors ------------------------
const BRIGHT = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac", "#38d9a9"];
const pickColors = (n) => shuffle(BRIGHT).slice(0, n);
const INK = "#22303c";

// ------------------------ Objects ------------------------
// Every object is drawn facing RIGHT, around its own origin.
// Grounded objects stand on y = 0 (they extend upward, into negative y).
// Floating objects (fish, bird) are centered on the origin.

const OBJECTS = {
  car: {
    scene: "land",
    grounded: true,
    draw() {
      const [body] = pickColors(1);
      return `
        <circle cx="-138" cy="-42" r="10" fill="#ffffffcc"/>
        <circle cx="-160" cy="-52" r="7" fill="#ffffffaa"/>
        <rect x="-112" y="-86" width="224" height="56" rx="20" fill="${body}"/>
        <path d="M -72 -84 L -50 -134 L 34 -134 L 66 -84 Z" fill="${body}"/>
        <path d="M -58 -88 L -42 -124 L -8 -124 L -8 -88 Z" fill="#d6f1ff"/>
        <path d="M 2 -88 L 2 -124 L 28 -124 L 52 -88 Z" fill="#d6f1ff"/>
        <circle cx="22" cy="-106" r="11" fill="#ffcf99"/>
        <circle cx="104" cy="-64" r="9" fill="#fff3a6"/>
        <rect x="-114" y="-76" width="9" height="16" rx="3" fill="#e03131"/>
        <circle cx="-62" cy="-30" r="28" fill="${INK}"/>
        <circle cx="-62" cy="-30" r="11" fill="#dee2e6"/>
        <circle cx="62" cy="-30" r="28" fill="${INK}"/>
        <circle cx="62" cy="-30" r="11" fill="#dee2e6"/>`;
    }
  },

  duck: {
    scene: "land",
    grounded: true,
    draw() {
      const body = choice(["#ffd43b", "#ffe066", "#ffffff"]);
      return `
        <path d="M -20 -14 L -20 -2 M 20 -14 L 20 -2" stroke="#fd7e14" stroke-width="6"/>
        <path d="M -20 -4 L -34 0 L -8 0 Z M 20 -4 L 6 0 L 32 0 Z" fill="#fd7e14"/>
        <path d="M -66 -78 L -108 -112 L -58 -50 Z" fill="${body}" stroke="#00000022" stroke-width="3"/>
        <ellipse cx="-4" cy="-56" rx="74" ry="48" fill="${body}" stroke="#00000022" stroke-width="3"/>
        <ellipse cx="-16" cy="-62" rx="36" ry="22" fill="#00000018"/>
        <circle cx="50" cy="-118" r="34" fill="${body}" stroke="#00000022" stroke-width="3"/>
        <path d="M 78 -124 L 120 -112 L 78 -100 Z" fill="#fd7e14"/>
        <circle cx="60" cy="-126" r="6" fill="${INK}"/>`;
    }
  },

  snail: {
    scene: "land",
    grounded: true,
    draw() {
      const [shell] = pickColors(1);
      const skin = "#a9e34b";
      return `
        <rect x="-96" y="-32" width="200" height="32" rx="16" fill="${skin}"/>
        <rect x="72" y="-86" width="32" height="66" rx="16" fill="${skin}"/>
        <line x1="82" y1="-82" x2="72" y2="-118" stroke="${skin}" stroke-width="7" stroke-linecap="round"/>
        <line x1="96" y1="-82" x2="106" y2="-120" stroke="${skin}" stroke-width="7" stroke-linecap="round"/>
        <circle cx="72" cy="-120" r="8" fill="#fff"/><circle cx="74" cy="-120" r="4" fill="${INK}"/>
        <circle cx="106" cy="-122" r="8" fill="#fff"/><circle cx="108" cy="-122" r="4" fill="${INK}"/>
        <circle cx="-18" cy="-82" r="58" fill="${shell}"/>
        <path d="M -18 -82 m -10 0 a 10 10 0 1 1 20 0 a 22 22 0 1 1 -44 0 a 36 36 0 1 1 72 0"
              fill="none" stroke="#00000033" stroke-width="7" stroke-linecap="round"/>`;
    }
  },

  flag: {
    scene: "land",
    grounded: true,
    draw() {
      const [a, b] = pickColors(2);
      return `
        <rect x="-8" y="-236" width="12" height="236" rx="4" fill="#8d6e63"/>
        <circle cx="-2" cy="-242" r="11" fill="#fcc419"/>
        <path d="M 4 -228 L 132 -192 L 4 -156 Z" fill="${a}"/>
        <path d="M 4 -206 L 56 -192 L 4 -178 Z" fill="${b}"/>
        <ellipse cx="-2" cy="0" rx="34" ry="8" fill="#00000022"/>`;
    }
  },

  house: {
    scene: "land",
    grounded: true,
    draw() {
      const [wall, roof] = pickColors(2);
      return `
        <rect x="-96" y="-160" width="192" height="160" fill="${wall}"/>
        <rect x="-70" y="-236" width="26" height="60" fill="#868e96"/>
        <path d="M -116 -156 L 0 -240 L 116 -156 Z" fill="${roof}"/>
        <rect x="34" y="-86" width="44" height="86" rx="6" fill="#8d6e63"/>
        <circle cx="68" cy="-42" r="4" fill="#fcc419"/>
        <rect x="-72" y="-120" width="60" height="50" rx="4" fill="#d6f1ff" stroke="#fff" stroke-width="6"/>`;
    }
  },

  bird: {
    scene: "sky",
    grounded: false,
    draw() {
      const [body, wing] = pickColors(2);
      return `
        <path d="M -40 -4 L -84 -26 L -78 14 Z" fill="${wing}"/>
        <ellipse cx="0" cy="0" rx="50" ry="30" fill="${body}"/>
        <path d="M -16 -6 Q -2 -70 34 -40 Q 10 -22 -16 -6 Z" fill="${wing}"/>
        <circle cx="42" cy="-14" r="22" fill="${body}"/>
        <path d="M 60 -20 L 88 -12 L 60 -4 Z" fill="#fd7e14"/>
        <circle cx="48" cy="-20" r="5" fill="${INK}"/>`;
    }
  },

  fish: {
    scene: "sea",
    grounded: false,
    draw() {
      const [body, fin] = pickColors(2);
      return `
        <path d="M -60 0 L -116 -46 L -104 0 L -116 46 Z" fill="${fin}"/>
        <path d="M -20 -38 Q 10 -78 40 -36 Z" fill="${fin}"/>
        <ellipse cx="0" cy="0" rx="76" ry="44" fill="${body}"/>
        <path d="M -24 -40 Q -36 0 -24 40" fill="none" stroke="#ffffff88" stroke-width="8"/>
        <circle cx="40" cy="-10" r="12" fill="#fff"/><circle cx="44" cy="-10" r="6" fill="${INK}"/>
        <path d="M 62 12 Q 70 18 76 10" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="98" cy="-20" r="7" fill="none" stroke="#ffffffaa" stroke-width="3"/>
        <circle cx="112" cy="-44" r="5" fill="none" stroke="#ffffffaa" stroke-width="3"/>`;
    }
  },

  boat: {
    scene: "surface",
    grounded: true,
    draw() {
      const [hull, sail] = pickColors(2);
      return `
        <path d="M -110 -50 L 120 -50 L 86 0 L -80 0 Z" fill="${hull}"/>
        <rect x="-14" y="-230" width="10" height="182" fill="#8d6e63"/>
        <path d="M -4 -224 L 96 -64 L -4 -64 Z" fill="${sail}"/>
        <path d="M -14 -226 L -14 -196 L -50 -211 Z" fill="#e03131"/>
        <circle cx="60" cy="-28" r="9" fill="#fff"/>`;
    }
  }
};

// ------------------------ Scenery ------------------------
function sun(side) {
  const x = side === "left" ? 110 : CANVAS_SIZE - 110;
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<line x1="${x + Math.cos(a) * 62}" y1="${110 + Math.sin(a) * 62}" x2="${x + Math.cos(a) * 84}" y2="${110 + Math.sin(a) * 84}"
                  stroke="#ffd43b" stroke-width="9" stroke-linecap="round"/>`;
  }).join("");
  return `${rays}<circle cx="${x}" cy="110" r="50" fill="#ffd43b"/>`;
}

function cloud(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="#ffffff" opacity="0.9">
    <circle cx="-40" cy="8" r="30"/><circle cx="0" cy="-12" r="40"/><circle cx="46" cy="6" r="28"/>
    <rect x="-70" y="8" width="140" height="30" rx="15"/></g>`;
}

function landBackground() {
  const sky = choice(["#bfe6ff", "#d0ebff", "#ffe8cc", "#e5dbff"]);
  const grass = choice(["#8ce99a", "#69db7c", "#b2f2bb"]);
  return {
    groundY: 540,
    svg: `<rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="${sky}"/>
          <rect y="540" width="${CANVAS_SIZE}" height="${CANVAS_SIZE - 540}" fill="${grass}"/>`
  };
}

function seaBackground() {
  return {
    waterY: 400,
    svg: `<rect width="${CANVAS_SIZE}" height="400" fill="#d0ebff"/>
          <rect y="400" width="${CANVAS_SIZE}" height="${CANVAS_SIZE - 400}" fill="#339af0"/>
          <rect y="690" width="${CANVAS_SIZE}" height="78" fill="#ffe8a3"/>`
  };
}

// ------------------------ Scene building ------------------------
function place(obj, x, y, scale, facingRight) {
  const sx = facingRight ? scale : -scale;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sx.toFixed(3)} ${scale.toFixed(3)})">${obj.draw()}</g>`;
}

// Spread n objects across the width, each in its own slot, with a little jitter.
function slotXs(n) {
  const margin = n === 2 ? 200 : 150;
  const span = CANVAS_SIZE - margin * 2;
  if (n === 1) return [CANVAS_SIZE / 2 + choice([-1, 1]) * rnd(20, 60)];
  return Array.from({ length: n }, (_, i) => margin + (span * i) / (n - 1) + rnd(-20, 20));
}

function buildScene(level) {
  const rules = LEVEL_RULES[level];
  const isSea = rand() < 0.35;
  const parts = [];
  let groundedKinds, floatingKinds;

  if (isSea) {
    const bg = seaBackground();
    parts.push(bg.svg);
    const xs = shuffle(slotXs(rules.objects));
    // One boat on the surface at most, everything else is fish
    const withBoat = rules.objects > 1 || rand() < 0.4;
    xs.forEach((x, i) => {
      const s = rnd(...rules.scale);
      if (withBoat && i === 0) {
        // keep the whole sail inside the picture
        parts.push(place(OBJECTS.boat, x, bg.waterY + 10, Math.min(s * 0.9, 1.5), rand() < 0.5));
      } else {
        parts.push(place(OBJECTS.fish, x, rnd(510, 600), s, rand() < 0.5));
      }
    });
    if (rules.sun) parts.push(sun(choice(["left", "right"])));
  } else {
    const bg = landBackground();
    parts.push(bg.svg);
    if (rules.sun) parts.push(sun(choice(["left", "right"])));
    parts.push(cloud(rnd(250, 520), rnd(90, 180), rnd(0.8, 1.2)));

    groundedKinds = ["car", "duck", "snail", "flag"];
    if (level === "hard") groundedKinds.push("house");
    floatingKinds = ["bird"];

    const xs = slotXs(rules.objects);
    // Hard: allow the same kind twice, facing opposite ways, so kids have to look at details
    const kinds = level === "hard"
      ? xs.map(() => choice(groundedKinds))
      : shuffle(groundedKinds).slice(0, xs.length);
    xs.forEach((x, i) => {
      const s = rnd(...rules.scale);
      parts.push(place(OBJECTS[kinds[i]], x, bg.groundY + rnd(60, 130), s, rand() < 0.5));
    });
    if (level !== "easy" && rand() < 0.6) {
      parts.push(place(OBJECTS[choice(floatingKinds)], rnd(180, 590), rnd(230, 330), rnd(0.6, 0.8), rand() < 0.5));
    }
  }

  return svgDoc(parts);
}

function svgDoc(children) {
  const s = CANVAS_SIZE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><clipPath id="frame"><rect width="${s}" height="${s}" rx="40" ry="40"/></clipPath></defs>
  <g clip-path="url(#frame)">
    ${children.join("\n")}
  </g>
</svg>`;
}

function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

// ------------------------ Mirror check ------------------------
// Render the picture small, then compare the four versions the game shows:
// original, mirror (the answer), upside-down, and turned 180°.
function renderPixels(svg) {
  const img = new Resvg(svg, { fitTo: { mode: "width", value: CHECK_SIZE }, background: "#ffffff" }).render();
  return { data: img.pixels, w: img.width, h: img.height };
}

function transformPixels({ data, w, h }, flipX, flipY) {
  const out = new Uint8Array(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = flipX ? w - 1 - x : x;
      const sy = flipY ? h - 1 - y : y;
      const si = (sy * w + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return out;
}

// Share of pixels whose color changes noticeably between two versions
function difference(a, b) {
  let changed = 0;
  const n = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d > 60) changed++;
  }
  return changed / n;
}

// The smallest difference between any two of the four versions
function mirrorScore(svg) {
  const px = renderPixels(svg);
  const versions = [
    transformPixels(px, false, false), // original
    transformPixels(px, true, false), // mirror
    transformPixels(px, false, true), // upside-down
    transformPixels(px, true, true) // turned 180°
  ];
  let min = 1;
  for (let i = 0; i < versions.length; i++) {
    for (let j = i + 1; j < versions.length; j++) {
      min = Math.min(min, difference(versions[i], versions[j]));
    }
  }
  return min;
}

function generatePicture(level) {
  const { minDiff } = LEVEL_RULES[level];
  let best = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const svg = buildScene(level);
    const score = mirrorScore(svg);
    if (!best || score > best.score) best = { svg, score, attempt };
    if (score >= minDiff) return { svg, score, attempt };
  }
  console.warn(`⚠️  ${level}: no picture reached ${minDiff} after ${MAX_ATTEMPTS} tries, using the best (${best.score.toFixed(3)})`);
  return best;
}

// ------------------------ Main ------------------------
(async () => {
  try {
    console.log(`🎨 Generating (non-AI) Mirror images`);
    const result = { easy: [], medium: [], hard: [] };

    for (const level of LEVELS) {
      for (let i = 0; i < DEFAULT_COUNT_PER_LEVEL; i++) {
        const { svg, score, attempt } = generatePicture(level);
        console.log(`  ${level} #${i + 1}: difference ${score.toFixed(3)} (try ${attempt})`);
        result[level].push(toDataUrl(svg));
      }
    }

    const outFile = OUT
      ? path.resolve(OUT)
      : path.join(process.cwd(), "docs", "data", `mirror-${mmddyyyy()}.json`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n", "utf8");

    console.log(`✅ Wrote ${outFile}`);
  } catch (err) {
    console.error("❌ Failed to generate daily Mirror images");
    console.error(err);
    process.exitCode = 1;
  }
})();

// ------------------------ Utils ------------------------
function getArg(flag, fallback, map = (v) => v) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return map(process.argv[i + 1]);
  return fallback;
}
