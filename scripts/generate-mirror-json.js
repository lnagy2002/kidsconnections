/**
 * Generates kid-friendly daily Mirror images WITHOUT external AI calls.
 * Writes: docs/data/mirror-MMDDYYYY.json
 * Output format: { easy: [dataURL...], medium: [...], hard: [...] }
 *
 * NOTE: Images are generated with three distinct themes (Creature, Scene, Landscape)
 * and random global mirroring for maximum visual difference.
 */

import fs from "node:fs";
import path from "node:path";

// ------------------------ Config & CLI ------------------------
const DEFAULT_COUNT_PER_LEVEL = getArg("--count", 1, Number);
const SEED = getArg("--seed", null, (v) => Number(v));

// We render square SVGs. They scale nicely in your canvas code.
const CANVAS_SIZE = 768;

const COUNTS = {
  easy: DEFAULT_COUNT_PER_LEVEL,
  medium: DEFAULT_COUNT_PER_LEVEL,
  hard: DEFAULT_COUNT_PER_LEVEL
};

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
const choice = (arr) => arr[Math.floor(rand() * arr.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i);

// ------------------------ Palettes ------------------------
// Increased diversity and separation for different themes
const PALETTES = [
  // Group A (for Creature/Scene)
  ["#0aa7b1", "#f7b32b", "#f45d01", "#2d3047", "#e0fbfc"],
  ["#6dd3ce", "#c8e9a0", "#f7a278", "#a13d63", "#0b3954"],
  ["#00a6fb", "#ffd166", "#ef476f", "#06d6a0", "#26547c"],
  // Group B (for Landscape/Skyline)
  ["#f4a261", "#2a9d8f", "#e76f51", "#264653", "#e9c46a"],
  ["#8ecae6", "#219ebc", "#023047", "#ffb703", "#fb8500"],
  ["#581845", "#c70039", "#ff5733", "#ffc300", "#ffd700"],
];

function getPalette(level) {
    const allPalettes = PALETTES;
    // Choose randomly from a different block of palettes for high-level variance
    let start, end;

    if (level === 'easy') {
        start = 0;
        end = 3; 
    } else if (level === 'medium') {
        start = 2;
        end = 5; 
    } else { // hard
        start = 4;
        end = allPalettes.length; 
    }
    
    const relevantPalettes = allPalettes.slice(start, end);
    return choice(relevantPalettes);
}

// ------------------------ SVG Helpers ------------------------
// UPDATED: Added transform parameter for global rotation/mirroring
function svgDoc(children, bg = "#ffffff", transform = "") {
  const s = CANVAS_SIZE;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="40" ry="40" fill="${bg}" />
  <g transform="${transform}">
    ${children.join("\n")}
  </g>
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

// Soft shadow filter
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

// ------------------------ Generators (Refactored) ------------------------

/**
 * THEME: Creature/Vehicle (Your original easy concept)
 */
function genThemeCreature(i, level) {
  const pal = getPalette(level); // Use level-specific palette
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

  const faceX = cx + bodyW * 0.18; 
  const faceY = cy - bodyH * 0.08;

  // Asymmetry: One-side patch (RIGHT only, for this theme)
  const patchX = cx + bodyW * rnd(0.15, 0.28);
  const patchY = cy + bodyH * rnd(0.05, 0.22);
  const patchR = rndInt(20, 42);

  const finY = cy + bodyH * 0.25;
  const finW = bodyW * 0.28;

  const children = [
    softShadowDef(),
    // simple background blobs
    `<circle cx="${cx - 220}" cy="${cy - 220}" r="120" fill="${pal[3]}22"/>`,
    `<circle cx="${cx + 240}" cy="${cy + 180}" r="140" fill="${pal[3]}22"/>`,

    // body
    `<rect x="${cx - bodyW / 2}" y="${cy - bodyH / 2}" width="${bodyW}" height="${bodyH}" rx="${rx}" ry="${rx}" fill="${body}" filter="url(#sh)"/>`,

    // fin/tail-ish shape on LEFT
    `<path d="M ${cx - bodyW/2} ${finY}
             q -${finW*0.6} -30, 0 -60
             q ${finW*0.6} 30, 0 60 Z"
             fill="${accent}" opacity="0.9"/>`,

    // face (looking right)
    `<circle cx="${faceX}" cy="${faceY}" r="14" fill="${eye}"/>`,
    `<circle cx="${faceX + 30}" cy="${faceY + 22}" r="10" fill="${eye}"/>`,

    // one-side patch (RIGHT side only)
    `<circle cx="${patchX}" cy="${patchY}" r="${patchR}" fill="${detail}" stroke="${eye}15" stroke-width="6"/>`,

    // stripe only on LEFT
    `<rect x="${cx - bodyW/2 + 16}" y="${cy - bodyH/2 + 24}" width="16" height="${bodyH - 48}" fill="${accent}" opacity="0.7"/>`
  ];
  
  return { children, bg };
}

/**
 * THEME: Scene (Your original medium concept)
 */
function genThemeScene(i, level) {
  const pal = getPalette(level);
  const bg = pal[0] + "11";
  const primary = pal[1];
  const secondary = pal[2];
  const tertiary = pal[3];
  const eye = "#1a1d24";

  const s = CANVAS_SIZE;
  const cx = s / 2;
  const ground = s * 0.78;

  const bodyW = 220;
  const bodyH = 260;

  // LEFT: 3 balloons
  const balloons = range(3).map((k) => {
    const bx = cx - 220 + rnd(-30, 10);
    const by = 200 + k * rnd(60, 80);
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
      .map((k) => {
        const [tx, ty] = polar(kx - 20 - k * 28, ky + 20 + k * 4, 0, 0);
        return `<circle cx="${tx}" cy="${ty}" r="6" fill="${tertiary}"/>`;
      })
      .join("")}
    <path d="M ${kx - 30} ${ky + 10} Q ${kx - 110} ${ky + 140}, ${kx - 190} ${ky + 200}" fill="none" stroke="${tertiary}cc" stroke-width="4"/>
  `;

  const children = [
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
  ];
  
  return { children, bg: "#ffffff" };
}

/**
 * THEME: Landscape/Skyline (New concept for maximum difference)
 */
function genThemeLandscape(i, level) {
    const s = CANVAS_SIZE;
    // Introduce thematic variation: City vs. Countryside
    const isCity = level === "hard" || rand() > 0.4; // Hard favors City, others random
    const pal = getPalette(level);
    const bg = pal[0] + "10";
    const groundColor = isCity ? pal[3] : pal[2]; 
    const accent = pal[1];
    const detail = pal[4];
    const groundLevel = isCity ? s * 0.8 : s * 0.7; // Lower ground for countryside
    
    let svgChildren = [softShadowDef()];

    // --- Sky Setup (Darker blue for City, lighter for Country) ---
    const skyColor = isCity ? "#345070" : "#8ecae6";
    svgChildren.push(`<rect x="0" y="0" width="${s}" height="${s}" fill="${skyColor}"/>`);
    
    // --- Ground/Foreground ---
    svgChildren.push(`<rect x="0" y="${groundLevel}" width="${s}" height="${s - groundLevel}" fill="${groundColor}"/>`);
    
    // --- Randomized Elements ---
    const elementCount = (level === "easy" ? 4 : level === "medium" ? 6 : 8);
    const asymmetricSide = rand() > 0.5 ? "LEFT" : "RIGHT";

    for (let k = 0; k < elementCount; k++) {
        const x = rndInt(50 + k * 80, 50 + k * 80 + 50); // Spread elements out
        const w = rndInt(40, 70);
        
        let h, element, fill;
        
        if (isCity) {
            // TALL CITY BUILDINGS
            h = rndInt(300, 500);
            fill = pal[4];
            element = `<rect x="${x}" y="${groundLevel - h}" width="${w}" height="${h}" fill="${fill}" opacity="0.9" filter="url(#sh)"/>`;
            
            // Add many random windows
            for(let row = 0; row < h / 50; row++) {
                for(let col = 0; col < w / 20; col++) {
                    const winX = x + 5 + col * 15;
                    const winY = groundLevel - h + 10 + row * 25;
                    element += `<rect x="${winX}" y="${winY}" width="8" height="12" fill="${accent}" opacity="0.3"/>`;
                }
            }
            
            // Subtle Asymmetry: A single red light/logo on the designated side
            if (k === elementCount - 1) { // Apply clue to the last building
                const lightX = asymmetricSide === "RIGHT" ? x + w - 10 : x + 10;
                element += `<circle cx="${lightX}" cy="${groundLevel - h + 10}" r="4" fill="#ff0000"/>`;
            }

        } else {
            // COUNTRYSIDE HOUSES/TREES/HILLS
            h = rndInt(80, 150);
            fill = pal[4];
            element = `<rect x="${x}" y="${groundLevel - h}" width="${w}" height="${h}" rx="16" fill="${fill}" opacity="0.9" filter="url(#sh)"/>`;
            // Add a roof
            element += `<polygon points="${x - 10},${groundLevel - h} ${x + w + 10},${groundLevel - h} ${x + w/2},${groundLevel - h - 50}" fill="${accent}"/>`;
            
            // Subtle Asymmetry: A single small fence on the designated side of the property
            if (k === elementCount - 2) { 
                const fenceX = asymmetricSide === "RIGHT" ? x + w + 5 : x - 15;
                element += `<rect x="${fenceX}" y="${groundLevel - 30}" width="10" height="30" fill="${pal[1]}"/>`;
            }
        }
        svgChildren.push(element);
    }
    
    return { 
        children: svgChildren, 
        bg: "#ffffff" 
    };
}


// --- Utility: Determine which generator to call ---
function getGeneratorOutput(level, i) {
    // Force Easy to always be the Creature theme for structural consistency
    // Others randomly pick from Scene or the new Landscape theme for max diversity
    const themes = ["Creature", "Scene", "Landscape"];
    let theme;
    
    if (level === "easy") {
        theme = "Creature"; 
    } else {
        theme = choice(themes.filter(t => t !== "Creature")); 
    }

    if (theme === "Creature") return genThemeCreature(i, level);
    if (theme === "Scene") return genThemeScene(i, level);      
    if (theme === "Landscape") return genThemeLandscape(i, level); 
    
    // Fallback to the original "easy" concept
    return genThemeCreature(i, level);
}


// ------------------------ Main ------------------------
(async () => {
  try {
    console.log(`🎨 Generating (non-AI) Mirror images`);
    const result = { easy: [], medium: [], hard: [] };

    const levels = /** @type {const} */ (["easy", "medium", "hard"]);
    for (const level of levels) {
      const n = COUNTS[level];
      if (n <= 0) continue;

      for (let i = 0; i < n; i++) {
        const { children, bg } = getGeneratorOutput(level, i);

        // *** Global Transformation for Visual Variety ***
        const center = CANVAS_SIZE / 2;
        // Randomly flip the image horizontally 
        const flipX = rand() > 0.5 ? `scale(-1, 1) translate(-${CANVAS_SIZE}, 0)` : "";
        const transform = flipX; 

        const svg = svgDoc(children, bg, transform);
        result[level].push(toDataUrl(svg));
      }
    }

    const today = new Date();
    const stamp = mmddyyyy(today);

    const outDir = path.join(process.cwd(), "docs", "data");
    const outFile = path.join(outDir, `mirror-${stamp}.json`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n", "utf8");
    
    console.log(`✅ Wrote ${outFile}`);
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
