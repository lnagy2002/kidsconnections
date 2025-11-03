#!/usr/bin/env node
/**
 * Realtime Trading Timeline Viewer
 * --------------------------------
 * - Serves a live dashboard at http://localhost:3000
 * - Watches /mnt/data/debug.log, trades.csv, livestate.json
 * - Pushes parsed data via WebSocket to the browser
 *
 * Needs: npm i ws
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ----------------------- Config -----------------------
const PORT = 3000;
const PATH =  "./reports-vti/VTI-1d-trend";
const LOG_PATH    = `${PATH}/debug.log`;
const TRADES_PATH = `${PATH}/trades.csv`;
const STATE_PATH  = `${PATH}/livestate.json`;
const OUT_HTML    = `${PATH}/timeline-report.html`;


// Strategy defaults (overridden by state if present)
let RSI_LONG = 55;
let RSI_LONG_SOFT = 48;
const EMA_FAST = 50;
const EMA_SLOW = 200;
const RSI_LEN  = 14;
const ATR_LEN  = 21;
const ATR_K    = 2.0;

// -------------------- Small utils ---------------------
const ISO_RE   = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
const PX_RE    = /px=([0-9]+\.[0-9]+)/;
const EVENT_RE = /\|\s([a-z\-]+)\s\|\s(\{.*\})?$/i;

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function uniq(arr)   { return Array.from(new Set(arr)); }

function ema(values, period) {
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(null);
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) { out[i] = prev; continue; }
    if (prev == null) prev = v; else prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

// ATR proxy from close-to-close TR (in case we only have closes)
function atrProxy(closes, period = 21) {
  const tr = new Array(closes.length).fill(null);
  for (let i = 1; i < closes.length; i++) tr[i] = Math.abs(closes[i] - closes[i - 1]);
  const out = new Array(closes.length).fill(null);
  let atr = 0, count = 0;
  for (let i = 0; i < tr.length; i++) {
    const v = tr[i];
    if (v == null) continue;
    if (count < period) {
      atr += v; count++;
      if (count === period) {
        atr = atr / period;
        out[i] = atr;
      }
    } else {
      atr = ((atr * (period - 1)) + v) / period;
      out[i] = atr;
    }
  }
  return out;
}

function nearestIndex(tsArray, targetISO) {
  const t = new Date(targetISO).getTime();
  let lo = 0, hi = tsArray.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(tsArray[mid]).getTime() < t) lo = mid + 1; else hi = mid;
  }
  const i = lo;
  if (i === 0) return 0;
  const prev = new Date(tsArray[i - 1]).getTime();
  const curr = new Date(tsArray[i]).getTime();
  return Math.abs(prev - t) <= Math.abs(curr - t) ? i - 1 : i;
}

// Hourly grid between first and last timestamps
function toHourlyGrid(tsSorted) {
  if (tsSorted.length < 2) return tsSorted.slice();
  const start = new Date(tsSorted[0]).getTime();
  const end   = new Date(tsSorted[tsSorted.length - 1]).getTime();
  const out = [];
  for (let t = start; t <= end; t += 3600_000) out.push(new Date(t).toISOString());
  return out;
}

// Forward-fill close values onto the hourly grid
function ffillOnGrid(tsSorted, closes, tsGrid) {
  const map = new Map(tsSorted.map((ts, i) => [ts, closes[i]]));
  let last = null;
  return tsGrid.map(ts => {
    const v = map.has(ts) ? map.get(ts) : null;
    if (v != null) { last = v; return v; }
    return last;
  });
}

// -------------------- Data parsing --------------------
function readStateThresholds() {
  try {
    if (!fs.existsSync(STATE_PATH)) return;
    const st = safeJSON(fs.readFileSync(STATE_PATH, 'utf8'));
    if (st && st.strategy) {
      if (typeof st.strategy.rsiLong === 'number') RSI_LONG = st.strategy.rsiLong;
      if (typeof st.strategy.rsiLongSoft === 'number') RSI_LONG_SOFT = st.strategy.rsiLongSoft;
    }
  } catch {}
}

function parseLog() {
  const rows = [];        // {tsISO, close}
  const blocks = [];      // {tsISO, why}
  const enterFromLog = []; // {tsISO}

  if (!fs.existsSync(LOG_PATH)) return { rows, blocks, enterFromLog };

  const lines = fs.readFileSync(LOG_PATH, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const isoMatches = line.match(ISO_RE);
    const iso = isoMatches ? isoMatches[isoMatches.length - 1] : null;

    const mPx = line.match(PX_RE);
    const px = mPx ? parseFloat(mPx[1]) : null;
    if (iso && Number.isFinite(px)) rows.push({ tsISO: iso, close: px });

    const evtMatch = line.match(EVENT_RE);
    if (evtMatch) {
      const evt = (evtMatch[1] || '').trim();
      const payload = evtMatch[2] ? safeJSON(evtMatch[2]) || {} : {};
      if (evt === 'entry-blocked' && iso) blocks.push({ tsISO: iso, why: payload.why || 'unspecified' });
      if (evt === 'enter-exec' && iso) enterFromLog.push({ tsISO: iso });
    }
  }
  return { rows, blocks, enterFromLog };
}

function parseTrades() {
  if (!fs.existsSync(TRADES_PATH)) return [];
  const csv = fs.readFileSync(TRADES_PATH, 'utf8').trim();
  const lines = csv.split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length !== header.length) continue;
    const obj = {};
    header.forEach((h, idx) => obj[h] = parts[idx]);
    const ts = obj.time || obj.t || obj.timestamp || obj.date || obj.ts || null;
    const side = (obj.side || obj.action || obj.type || '').toUpperCase();
    const priceStr = obj.px || obj.price || obj.fill_price || obj.avgpx || obj.avg || obj['fill price'];
    const note = obj.note || obj.reason || obj.tag || '';
    if (!ts) continue;
    const px = priceStr ? parseFloat(priceStr) : null;
    out.push({ tsISO: new Date(ts).toISOString(), side, px, note });
  }
  return out;
}

// Build full snapshot for client
function buildSnapshot() {
  readStateThresholds();

  const { rows, blocks, enterFromLog } = parseLog();

  // collapse duplicate timestamps (take last close)
  const mapByTs = new Map();
  for (const r of rows) mapByTs.set(r.tsISO, r.close);
  const tsSorted = Array.from(mapByTs.keys()).sort();
  const closes   = tsSorted.map(ts => mapByTs.get(ts));

  const tsHourly = toHourlyGrid(tsSorted);
  const closesFF = ffillOnGrid(tsSorted, closes, tsHourly);

  const emaFast = ema(closesFF, EMA_FAST);
  const emaSlow = ema(closesFF, EMA_SLOW);
  const rsiArr  = rsi(closesFF, RSI_LEN);
  const atrArr  = atrProxy(closesFF, ATR_LEN);
  const atrU    = atrArr.map((a, i) => (a == null || closesFF[i] == null) ? null : closesFF[i] + ATR_K * a);
  const atrL    = atrArr.map((a, i) => (a == null || closesFF[i] == null) ? null : closesFF[i] - ATR_K * a);

  // trades
  let trades = parseTrades();
  if (!trades.length) trades = enterFromLog.map(e => ({ tsISO: e.tsISO, side: 'BUY', px: null, note: 'enter-exec (log)' }));

  // align trades & blocks to nearest hourly bar + attach price if missing
  const entries = [], exits = [];
  for (const t of trades) {
    const i = nearestIndex(tsHourly, t.tsISO);
    const rec = { tsISO: tsHourly[i], px: t.px ?? closesFF[i], note: t.note || '', side: t.side || '' };
    if (/SELL|EXIT/i.test(rec.side)) exits.push(rec); else entries.push(rec);
  }
  const blocksAligned = blocks.map(b => {
    const i = nearestIndex(tsHourly, b.tsISO);
    return { tsISO: tsHourly[i], why: b.why || 'unspecified' };
  });

  return {
    meta: { EMA_FAST, EMA_SLOW, RSI_LEN, ATR_LEN, ATR_K, RSI_LONG, RSI_LONG_SOFT },
    ts: tsHourly,
    close: closesFF,
    emaFast,
    emaSlow,
    rsi: rsiArr,
    atrU,
    atrL,
    entries,
    exits,
    blocks: blocksAligned
  };
}

// ------------------- HTTP + WebSocket -----------------
const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Realtime Trading Timeline</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:16px;background:#0b1220;color:#e6f4ff}
    .wrap{max-width:1200px;margin:0 auto}
    .card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:12px;margin-bottom:16px}
    .meta{opacity:.8;font-size:12px}
    .badge{display:inline-block;padding:2px 8px;border:1px solid #1e293b;border-radius:999px;margin-right:6px}
  </style>
</head>
<body>
<div class="wrap">
  <h1>Realtime Trading Timeline</h1>
  <div id="meta" class="meta"></div>
  <div class="card"><div id="price"></div></div>
  <div class="card"><div id="rsi"></div></div>
  <div class="card"><div id="blocks"></div></div>
</div>

<script>
const elMeta = document.getElementById('meta');
let inited = false;

function renderAll(s) {
  elMeta.innerHTML = [
    '<span class="badge">EMA(' + s.meta.EMA_FAST + '/' + s.meta.EMA_SLOW + ')</span>',
    '<span class="badge">RSI(' + s.meta.RSI_LEN + ')</span>',
    '<span class="badge">rsiLong=' + s.meta.RSI_LONG + '</span>',
    '<span class="badge">rsiLongSoft=' + s.meta.RSI_LONG_SOFT + '</span>',
    '<span class="badge">ATR×' + s.meta.ATR_K + ' len=' + s.meta.ATR_LEN + '</span>',
  ].join(' ');

  const priceTraces = [
    { x: s.ts, y: s.close, name: 'Close', mode: 'lines' },
    { x: s.ts, y: s.emaFast, name: 'EMA ' + s.meta.EMA_FAST, mode: 'lines' },
    { x: s.ts, y: s.emaSlow, name: 'EMA ' + s.meta.EMA_SLOW, mode: 'lines' },
    { x: s.ts, y: s.atrU, name: 'ATR Upper', mode: 'lines', line: { dash: 'dot' } },
    { x: s.ts, y: s.atrL, name: 'ATR Lower', mode: 'lines', line: { dash: 'dot' } },
  ];
  if (s.entries?.length) priceTraces.push({
    x: s.entries.map(e => e.tsISO),
    y: s.entries.map(e => e.px),
    mode: 'markers',
    name: 'Entry',
    marker: { symbol: 'triangle-up', size: 10 }
  });
  if (s.exits?.length) priceTraces.push({
    x: s.exits.map(e => e.tsISO),
    y: s.exits.map(e => e.px),
    mode: 'markers',
    name: 'Exit',
    marker: { symbol: 'triangle-down', size: 10 }
  });

  const priceLayout = {
    title: 'Price • EMA • ATR bands • Entries/Exits',
    paper_bgcolor: '#0f172a', plot_bgcolor: '#0f172a',
    xaxis: { gridcolor: '#1e293b' }, yaxis: { gridcolor: '#1e293b' },
    legend: { orientation: 'h' }
  };

  const rsiTraces = [
    { x: s.ts, y: s.rsi, name: 'RSI(' + s.meta.RSI_LEN + ')', mode: 'lines' },
    { x: [s.ts[0], s.ts[s.ts.length-1]], y: [s.meta.RSI_LONG_SOFT, s.meta.RSI_LONG_SOFT], mode: 'lines', name: 'rsiLongSoft', line: { dash: 'dash' } },
    { x: [s.ts[0], s.ts[s.ts.length-1]], y: [s.meta.RSI_LONG, s.meta.RSI_LONG], mode: 'lines', name: 'rsiLong', line: { dash: 'dashdot' } },
    { x: [s.ts[0], s.ts[s.ts.length-1]], y: [70, 70], mode: 'lines', name: 'RSI 70', line: { dash: 'dot' } },
    { x: [s.ts[0], s.ts[s.ts.length-1]], y: [30, 30], mode: 'lines', name: 'RSI 30', line: { dash: 'dot' } },
  ];
  const rsiLayout = {
    title: 'RSI with Strategy Thresholds',
    paper_bgcolor: '#0f172a', plot_bgcolor: '#0f172a',
    xaxis: { gridcolor: '#1e293b' }, yaxis: { gridcolor: '#1e293b', range: [10, 90] },
    legend: { orientation: 'h' }
  };

  const blkX = s.blocks?.map(b => b.tsISO) || [];
  const blkY = blkX.map(() => 1);
  const blkText = s.blocks?.map(b => b.why) || [];
  const blocksTraces = [
    { x: blkX, y: blkY, mode: 'markers+text', name: 'entry-blocked', text: blkText, textposition: 'top center' }
  ];
  const blocksLayout = {
    title: 'Entry-blocked Reasons over Time',
    paper_bgcolor: '#0f172a', plot_bgcolor: '#0f172a',
    xaxis: { gridcolor: '#1e293b' }, yaxis: { visible: false }
  };

  if (!inited) {
    Plotly.newPlot('price', priceTraces, priceLayout);
    Plotly.newPlot('rsi', rsiTraces, rsiLayout);
    Plotly.newPlot('blocks', blocksTraces, blocksLayout);
    inited = true;
  } else {
    Plotly.react('price', priceTraces, priceLayout);
    Plotly.react('rsi', rsiTraces, rsiLayout);
    Plotly.react('blocks', blocksTraces, blocksLayout);
  }
}

// WebSocket for live updates
const ws = new WebSocket('ws://' + location.host + '/ws');
ws.onmessage = (ev) => {
  try {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'snapshot') renderAll(msg.data);
  } catch(e) { console.error(e); }
};
</script>
</body>
</html>`;

// Create HTTP server (serves HTML and WS upgrade)
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

const wss = new WebSocket.Server({ noServer: true });

function broadcastSnapshot() {
  const snapshot = buildSnapshot();
  const payload = JSON.stringify({ type: 'snapshot', data: snapshot });
  wss.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(payload); });
}

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  // send initial snapshot on connect
  try { ws.send(JSON.stringify({ type: 'snapshot', data: buildSnapshot() })); } catch {}
});

server.listen(PORT, () => {
  console.log(`Realtime timeline: http://localhost:${PORT}`);
});

// ---------------------- File watching ----------------------
function watchFile(p) {
  try {
    if (!fs.existsSync(p)) return;
    fs.watch(p, { persistent: true }, (eventType) => {
      // Re-parse on any change or rename
      if (eventType === 'change' || eventType === 'rename') {
        broadcastSnapshot();
      }
    });
  } catch {}
}

// Watch the three files (if/when they appear)
[LOG_PATH, TRADES_PATH, STATE_PATH].forEach(watchFile);

// Also push a snapshot on an interval in case some OS misses fs.watch events
setInterval(broadcastSnapshot, 5000);
