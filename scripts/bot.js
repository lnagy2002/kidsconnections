// bot-unified.js — unified backtest + live-paper (CCXT/Alpaca)
// MeanReversion & Trend, HTF filter (close-aligned), ATR trailing,
// robust HTF warmup, optional session filter, richer logs, state/CSV.
// Enhanced: robust blocked logs, LIVE uPnL/R, close-only trailing, pyramiding.

const fs = require("fs");
const path = require("path");
const ccxt = require("ccxt");
const { EMA, RSI, ATR } = require("technicalindicators");

// ---------- small utils ----------
function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function tsISO(ms){ if(!Number.isFinite(ms)) return "InvalidDate"; return new Date(ms).toISOString(); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

const TF_MS = { "1m":60e3, "3m":180e3, "5m":300e3, "15m":900e3, "30m":1800e3, "1h":3600e3, "2h":7200e3, "4h":14400e3, "1d":86400e3 };
function tfMs(tf){ const v=TF_MS[tf]; if(!v) throw new Error(`Unsupported timeframe: ${tf}`); return v; }

// Align bar close timestamps (special-case Alpaca 1D bars)
function alignCloseTs(tOpenMs, timeframe, backendType){
  if (backendType === "alpaca" && timeframe === "1d") {
    const SIXTEEN_HOURS = 16 * 3600 * 1000;
    return tOpenMs + SIXTEEN_HOURS - 1; // ~15:59:59.999 ET
  }
  return tOpenMs + tfMs(timeframe) - 1;
}

// US session helper (configurable grace minutes)
function isUSSession(tMs, {open="09:30", close="16:00", tz="America/New_York", graceMin=2}={}){
  const d = new Date(tMs);
  const opts = { timeZone: tz, hour12: false };
  const [hh,mm] = d.toLocaleTimeString("en-US", opts).split(":").map(Number);
  const cur = hh*60 + mm;
  const [oh,om] = open.split(":").map(Number);
  const [ch,cm] = close.split(":").map(Number);
  const lo = oh*60 + om - graceMin;
  const hi = ch*60 + cm + graceMin;
  return cur >= lo && cur <= hi;
}

// generic retry
async function withRetries(fn, {tries=5, baseMs=500, factor=2, jitter=true, tag=""}={}){
  let lastErr;
  for(let i=0;i<tries;i++){
    try{ return await fn(); }catch(e){
      lastErr = e;
      const delay = Math.min(30_000, baseMs * Math.pow(factor,i)) * (jitter ? (0.7 + 0.6*Math.random()) : 1);
      console.warn(`[retry${tag?":" + tag:""}] attempt ${i+1}/${tries} failed: ${e.message}; wait ${(delay/1000).toFixed(2)}s`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

// ---------- config ----------
const configFile = process.argv[2];
if(!configFile){ console.error("❌ Usage: node bot-unified.js <config.json> [symbol]"); process(1); }
let P;
try{ P = JSON.parse(fs.readFileSync(configFile,"utf-8")); console.log("✅ Loaded config", P); }
catch(e){ console.error("❌ Failed to load config:", e.message); process.exit(1); }

const cliSymbol = process.argv[3];

// defaults / safeguards
P.mode = P.mode || "backtest"; // backtest | live-paper
P.reportsDir = P.reportsDir || "reports";
P.csv = Object.assign({ enable:true, trades:"trades.csv", equity:"equity.csv" }, P.csv||{});
P.html = Object.assign({ enable:false, file:"report.html" }, P.html||{});
P.debugSignals = P.debugSignals ?? true;
P.debugToFile = P.debugToFile ?? true;
P.statePersistence = Object.assign({ enable:true, file:"livestate.json"}, P.statePersistence||{});
P.strategy = P.strategy || { style: "trend" };
P.trailingStop = Object.assign({ enabled:true, mode:"barATR", atrMult:2.2, percent:4, onCloseOnly:true }, P.trailingStop||{});
P.trailStartR = Number(P.trailStartR ?? 1.5);
P.minBarsBetweenTrades = Number(P.minBarsBetweenTrades ?? 2);
P.cooldownBarsAfterLoss = Number(P.cooldownBarsAfterLoss ?? 3);
P.reentryATR = Number(P.reentryATR ?? 0.25);
P.maxTradesPerDay = Number(P.maxTradesPerDay ?? 6);
P.maxConsecutiveLosses = Number(P.maxConsecutiveLosses ?? 4);
P.minHoldBars = Number(P.minHoldBars ?? 2);
P.dailyLossLimitPct = Number(P.dailyLossLimitPct ?? 1.5);
P.feesPctRoundtrip = Number(P.feesPctRoundtrip ?? 0.08);
P.slippageBps = Number(P.slippageBps ?? 2);
P.startEquity = Number(P.startEquity ?? 20000);
P.riskPerTradePct = Number(P.riskPerTradePct ?? 0.5);
P.maxPositionNotionalUSD = Number(P.maxPositionNotionalUSD ?? 15000);
P.lookback = Number(P.lookback ?? 1000);
P.timeframe = P.timeframe || "1h";
P.symbol = P.symbol || cliSymbol || (P.backend?.type === "alpaca" ? "VGT" : "BTC/USDT");
P.atrPeriod = Number(P.atrPeriod ?? 21);
P.emaFast = Number(P.emaFast ?? 50);
P.emaSlow = Number(P.emaSlow ?? 200);
P.rsiPeriod = Number(P.rsiPeriod ?? 14);
P.rsiLong = Number(P.rsiLong ?? 55);
P.rsiOversold = Number(P.rsiOversold ?? 40);
P.rsiExit = Number(P.rsiExit ?? 58);
P.momentumExit = Object.assign({ enabled:true, requiresProfit:true, minR:0.30 }, P.momentumExit||{});
P.htfFilter = Object.assign({ enabled:true, timeframe:"4h", mode:"emaUp", emaFast:P.emaFast, emaSlow:P.emaSlow, rsiAbove:50, confirmLag:0, minBars:260 }, P.htfFilter||{});
P.enterExecLog = Object.assign({ enable: true, file: "enter-exec.csv" }, P.enterExecLog || {});
P.retry = Object.assign({ tries:5, baseMs:500, factor:2, jitter:true }, P.retry||{});
P.rsiLongSoft = Number(P.rsiLongSoft ?? 48);
P.useLtfEmaSlope = P.useLtfEmaSlope ?? true;
P.reentryATRStop = Number(P.reentryATRStop ?? 0.6);
P.reentryATRProfit = Number(P.reentryATRProfit ?? 0.3);
P.lossStreakDecayPerDay = Number(P.lossStreakDecayPerDay ?? 1);
P.entryAtrCushion = Number(P.entryAtrCushion ?? 0.15);
P.pollSeconds = Number(P.pollSeconds ?? 60);

// NEW: optional session filter
P.sessionFilter = Object.assign({ enabled:false, graceMin:2, tz:"America/New_York", open:"09:30", close:"16:00" }, P.sessionFilter||{});

// auto-suffix reports dir to avoid mixing instruments
const safeSym = String(P.symbol || "").replace(/[^\w.-]/g,"_");
P.reportsDir = path.join(P.reportsDir, `${safeSym}-${P.timeframe}-${P.strategy.style}`);
ensureDir(P.reportsDir);
const LOG_FILE = path.join(P.reportsDir, "debug.log");

P.statePersistence.file = path.join(P.reportsDir, P.statePersistence.file);
P.enterExecLog.file = path.join(P.reportsDir, P.enterExecLog.file);

function logLine(s){
  const line = `[${new Date().toISOString()}] ${s}\n`;
  if(P.debugToFile){ fs.appendFileSync(LOG_FILE, line); }
  console.log(s);
}
function debugSignal({t, px, reason, details}){
  if(!P.debugSignals) return;
  const safe = (details && Object.keys(details).length) ? details : { why:"unknown" };
  const msg = `[DEBUG] ${tsISO(t)} | px=${Number(px).toFixed(2)} | ${reason} | ${JSON.stringify(safe)}`;
  logLine(msg);
}

// Surface HTF mode early
logLine(`HTF mode: ${P.htfFilter?.mode}`);

// ---------- indicators ----------
function addIndicators(rows){
  if(rows.length === 0) return [];
  const closes = rows.map(r=>r[4]);
  const highs = rows.map(r=>r[2]);
  const lows  = rows.map(r=>r[3]);
  const emaFast = EMA.calculate({ period:P.emaFast, values:closes });
  const emaSlow = EMA.calculate({ period:P.emaSlow, values:closes });
  const rsi = RSI.calculate({ period:P.rsiPeriod, values:closes });
  const atr = ATR.calculate({ period:P.atrPeriod, high:highs, low:lows, close:closes });
  const out = rows.map((r,i)=>({
    t:r[0], o:r[1], h:r[2], l:r[3], c:r[4], v:r[5],
    emaFast: i>=P.emaFast-1 ? emaFast[i-(P.emaFast-1)] : undefined,
    emaSlow: i>=P.emaSlow-1 ? emaSlow[i-(P.emaSlow-1)] : undefined,
    rsi: i>=P.rsiPeriod ? rsi[i-P.rsiPeriod] : undefined,
    atr: i>=P.atrPeriod ? atr[i-(P.atrPeriod)] : undefined,
  }));
  return out;
}

function addIndicatorsWithTf(rows, timeframe){
  const ser = addIndicators(rows);
  if (ser.length === 0) return ser;
  const backendType = (P.backend && P.backend.type) || (P.exchange ? "ccxt" : "alpaca");
  for (let i = 0; i < ser.length; i++) {
    ser[i].t = alignCloseTs(rows[i][0], timeframe, backendType);
  }
  return ser;
}

// ---------- backends ----------
function makeBackend(P){
  const type = (P.backend && P.backend.type) || (P.exchange ? "ccxt" : "alpaca");
  if(type === "ccxt") return makeCCXTBackend(P);
  if(type === "alpaca") return makeAlpacaBackend(P);
  throw new Error(`Unknown backend.type: ${type}`);
}
function makeCCXTBackend(P){
  const exId = P.exchange || "kraken";
  const ex = new ccxt[exId]({ enableRateLimit:true });
  async function fetchRangeOHLCV(symbol, timeframe, since, limit){
    const all=[]; let from = since; const tf= tfMs(timeframe);
    while(all.length < limit){
      const batch = await withRetries(() => ex.fetchOHLCV(symbol, timeframe, from, Math.min(1000, limit-all.length)),
        { ...P.retry, tag:`ccxt:${symbol}:${timeframe}` });
      if(!batch.length) break;
      all.push(...batch);
      from = batch[batch.length-1][0] + tf;
      if(batch.length < 2) break;
    }
    return all;
  }
  async function fetchRecent(symbol, timeframe, limit){
    return await withRetries(() => ex.fetchOHLCV(symbol, timeframe, undefined, limit),
      { ...P.retry, tag:`ccxt-recent:${symbol}:${timeframe}` });
  }
  return { type:"ccxt", fetchRangeOHLCV, fetchRecent, tz:"UTC" };
}
function makeAlpacaBackend(P){
  const KEY = process.env.ALPACA_KEY || "";
  const SEC = process.env.ALPACA_SECRET || "";
  const base = "https://data.alpaca.markets/v2";
  const FEED = (P.alpacaFeed || "iex");
  const tfMap = { "1m":"1Min", "5m":"5Min", "15m":"15Min", "30m":"30Min", "1h":"1Hour", "4h":"1Hour", "1d":"1Day" };
  async function bars(symbol, timeframe, startISO, endISO, limit){
    const tf = tfMap[timeframe] || "1Hour";
    const url = new URL(`${base}/stocks/${encodeURIComponent(symbol)}/bars`);
    url.searchParams.set("timeframe", tf);
    url.searchParams.set("feed", FEED);
    if (startISO) url.searchParams.set("start", startISO);
    if (endISO)   url.searchParams.set("end", endISO);
    if (limit)    url.searchParams.set("limit", String(limit));
    const res = await withRetries(() => fetch(url, { headers: {
      "APCA-API-KEY-ID": KEY, "APCA-API-SECRET-KEY": SEC }}),
      { ...P.retry, tag:`alpaca:${symbol}:${timeframe}` });
    if(!res.ok){ throw new Error(`fetch failed`); }
    const j = await res.json();
    return (j.bars||[]).map(b => [ Date.parse(b.t), b.o, b.h, b.l, b.c, b.v ]);
  }
  function aggregate(rows, tfMsTarget){
    if(!rows.length) return rows;
    const out=[]; let bucketStart = Math.floor(rows[0][0] / tfMsTarget) * tfMsTarget; let cur = null;
    for(const r of rows){
      const [t,o,h,l,c,v] = r; const b = Math.floor(t / tfMsTarget) * tfMsTarget;
      if(cur && b !== bucketStart){ out.push(cur); cur=null; bucketStart=b; }
      if(!cur) cur=[b, o, h, l, c, v];
      else { cur[2]=Math.max(cur[2],h); cur[3]=Math.min(cur[3],l); cur[4]=c; cur[5]+=v; }
    }
    if(cur) out.push(cur); return out;
  }
  async function fetchRangeOHLCV(symbol, timeframe, since, limit){
    const endISO = new Date().toISOString(); const startISO = new Date(since).toISOString();
    if(timeframe === "4h"){
      const raw = await bars(symbol, "1h", startISO, endISO, Math.min(limit*4, 10000));
      return aggregate(raw, tfMs("4h"));
    }
    return await bars(symbol, timeframe, startISO, endISO, Math.min(limit, 10000));
  }
  async function fetchRecent(symbol, timeframe, limit){
    const endMs = Date.now();
    const tf = tfMs(timeframe);
    const approxCalendar = Math.ceil(limit * 0.69 * (tf / 86400000) * 1.25) * 86400000;
    let startMs = endMs - Math.max(approxCalendar, limit * tf);
    let out = await bars(symbol, timeframe, new Date(startMs).toISOString(), new Date(endMs).toISOString(), Math.min(limit, 10000));
    const lastT = out.at(-1)?.[0] ?? 0;
    if (!out.length || (endMs - lastT) > 5 * tf) {
      startMs = endMs - Math.ceil(limit * tf * 1.2);
      out = await bars(symbol, timeframe, new Date(startMs).toISOString(), new Date(endMs).toISOString(), Math.min(limit, 10000));
    }
    if (out.length > limit) out = out.slice(-limit);
    return out;
  }
  return { type:"alpaca", fetchRangeOHLCV, fetchRecent, tz:"America/New_York" };
}

// ---------- HTF helpers ----------
async function precomputeHTF(backend, symbol, timeframe, sinceMs, limit){
  const rows = await backend.fetchRangeOHLCV(symbol, timeframe, sinceMs, limit);
  const ser = addIndicatorsWithTf(rows, timeframe);
  debugSignal({ t: ser[0]?.t || Date.now(), px: ser[0]?.c || 0, reason:"htf-precompute-ready", details:{ timeframe, bars: ser.length }});
  return ser;
}
function upperBoundIdx(series, t){
  let lo=0, hi=series.length-1, ans=-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1; const tm=series[mid].t;
    if(tm<=t){ ans=mid; lo=mid+1; } else hi=mid-1;
  }
  return ans;
}
function htfPass(series, i, htfMode){
  if(i<0) return false;
  const b = series[i]; if(!b) return false;
  if(htfMode === "emaUp"){
    if (b.emaFast == null || b.emaSlow == null) return true;
    return b.emaFast >= b.emaSlow;
  }
  if(htfMode === "rsiAbove"){
    return (b.rsi ?? 0) >= (P.htfFilter.rsiAbove ?? 50);
  }
  if(htfMode === "emaUpOrRsi"){
    const emaOk = (b.emaFast != null && b.emaSlow != null) ? (b.emaFast >= b.emaSlow) : false;
    const rsiOk = (b.rsi ?? 0) >= (P.htfFilter.rsiAbove ?? 50);
    return emaOk || rsiOk || (b.emaFast == null || b.emaSlow == null);
  }
  return true;
}

// ---------- guards & broker ----------
function makeGuards(){
  return {
    barsSinceLastEntry: Infinity, cooldown: 0, consecutiveLosses: 0,
    tradesToday: 0, dayStamp: null, dayStartEquity: null,
    lastExitPx: null, lastExitReason: null, lastExitProfit: false, lastATR: null,
    diag: { rsiCrossUps:0, entriesPassedHTF:0, trendFails:0, htfFails:0,
      blocked:{ cooldown:0, minBarsBetween:0, reentryAtr:0, maxTrades:0, consecLoss:0, minHold:0, dailyLoss:0, session:0 } }
  };
}
function newDayIfNeeded(guards, t, broker){
  const d = new Date(t).toISOString().slice(0,10);
  if(guards.dayStamp !== d){
    guards.dayStamp = d; guards.tradesToday = 0;
    guards.dayStartEquity = broker?.equity ?? guards.dayStartEquity;
    if(P.lossStreakDecayPerDay && guards.consecutiveLosses>0){
      guards.consecutiveLosses = Math.max(0, guards.consecutiveLosses - P.lossStreakDecayPerDay);
    }
  }
}

// Entry gate explanation
function canEnterNowExplain({ bar, last, guards, htfOk, position, equityNow }){
  const g = guards;

  if (!Number.isFinite(bar?.atr)) {
    return { ok:false, why:"atr-not-ready", details:{ need:P.atrPeriod } };
  }

  if(P.strategy.style === "trend"){
    const rsi = (bar?.rsi||0);
    const emaUp = (bar?.emaFast ?? 0) > (bar?.emaSlow ?? 0);
    const emaSlopeUp = (last?.emaFast != null) ? (bar.emaFast >= last.emaFast) : true;
    const structureUp = emaUp && (!P.useLtfEmaSlope || emaSlopeUp);
    const rsiPass = (rsi > P.rsiLong) || (structureUp && rsi >= P.rsiLongSoft);
    if(!rsiPass){
      g.diag.trendFails++;
      return { ok:false, why:"trend-structure",
        details:{ rsi, rsiLong:P.rsiLong, rsiLongSoft:P.rsiLongSoft, emaFast:bar?.emaFast, emaSlow:bar?.emaSlow, emaSlopeUp, structureUp } };
    }
  } else {
    const crossUp = (last?.rsi||100) < P.rsiOversold && (bar?.rsi||100) >= P.rsiOversold;
    if(!crossUp) return { ok:false, why:"mr-rsi", details:{ lastRsi:last?.rsi, rsi:bar?.rsi, rsiOversold:P.rsiOversold } };
  }
  g.diag.rsiCrossUps++;

  if(!htfOk){
    g.diag.htfFails++;
    return { ok:false, why:"htf", details:{ mode:P.htfFilter.mode, tf:P.htfFilter.timeframe } };
  }
  g.diag.entriesPassedHTF++;

  if (P.sessionFilter?.enabled) {
    if (!isUSSession(bar.t, P.sessionFilter)) {
      g.diag.blocked.session++;
      return { ok:false, why:"session-filter" };
    }
  }

  if(g.cooldown>0){ g.diag.blocked.cooldown++; return { ok:false, why:"cooldown", details:{ remaining:g.cooldown } }; }
  if(g.barsSinceLastEntry < P.minBarsBetweenTrades){
    g.diag.blocked.minBarsBetween++; return { ok:false, why:"minBarsBetween", details:{ remaining: P.minBarsBetweenTrades - g.barsSinceLastEntry } };
  }
  if(g.tradesToday >= P.maxTradesPerDay){ g.diag.blocked.maxTrades++; return { ok:false, why:"maxTradesPerDay", details:{ tradesToday:g.tradesToday, cap:P.maxTradesPerDay } }; }
  if(g.consecutiveLosses >= P.maxConsecutiveLosses){ g.diag.blocked.consecLoss++; return { ok:false, why:"maxConsecutiveLosses", details:{ consec:g.consecutiveLosses } }; }
  if(position && position.holdBars < P.minHoldBars){ g.diag.blocked.minHold++; return { ok:false, why:"minHoldBars", details:{ have:position.holdBars, need:P.minHoldBars } }; }
  if(P.dailyLossLimitPct && g.dayStartEquity){
    const ddPct = ((g.dayStartEquity - (equityNow ?? g.dayStartEquity)) / g.dayStartEquity) * 100;
    if(ddPct >= P.dailyLossLimitPct){ g.diag.blocked.dailyLoss++; return { ok:false, why:"dailyLossLimit", details:{ ddPct, cap:P.dailyLossLimitPct } }; }
  }
  if(g.lastExitPx && (bar.atr||0)){
    const neededAtrMult = g.lastExitProfit ? (P.reentryATRProfit ?? P.reentryATR) : (P.reentryATRStop ?? P.reentryATR);
    const needed = g.lastExitPx + neededAtrMult * bar.atr;
    if(bar.c < needed){
      g.diag.blocked.reentryAtr++;
      return { ok:false, why:"reentryATR", details:{ neededAtrMult, lastExitPx:g.lastExitPx, atr:bar.atr, needPx:needed } };
    }
  }
  return { ok:true };
}

function makeBroker(){
  return {
    position: 0, entry: null, stop: null,
    _entryAtr: null, _maxSinceEntry: null,
    trades: [], equity: P.startEquity, holdBars: 0,
  };
}
function slip(px){ return px * (1 + (P.slippageBps/1e4) * (Math.random()*2-1)); }

// CSV helpers
function initCsvIfNeeded() {
  if (!P.csv?.enable) return;
  ensureDir(P.reportsDir);
  const tradesPath = path.join(P.reportsDir, P.csv.trades);
  const equityPath = path.join(P.reportsDir, P.csv.equity);
  if (!fs.existsSync(tradesPath)) fs.writeFileSync(tradesPath, "time,side,px,qty,fee,note\n");
  if (!fs.existsSync(equityPath)) fs.writeFileSync(equityPath, "time,equity\n");
}
function appendTradeCsv(t) {
  if (!P.csv?.enable) return;
  const line = `${tsISO(t.t)},${t.side},${t.px},${t.qty},${t.fee||0},${t.note||""}\n`;
  fs.appendFileSync(path.join(P.reportsDir, P.csv.trades), line);
}
function appendEquityCsv(t, eq) {
  if (!P.csv?.enable) return;
  const line = `${tsISO(t)},${Number(eq).toFixed(2)}\n`;
  fs.appendFileSync(path.join(P.reportsDir, P.csv.equity), line);
}

function logEnterExec(ev){
  if(!P.enterExecLog?.enable) return;
  try{
    const file = P.enterExecLog.file;
    ensureDir(P.reportsDir);
    const cols = [
      "timeISO","t","symbol","timeframe","side",
      "price","rawClose","qty","stopPrice",
      "equityBefore","riskPerTradePct",
      "atr","entryAtr","atrPeriod","atrStopMult","trailAtrMult",
      "trailingMode","trailStartR","htfTimeframe","htfMode","reentryATR"
    ];
    const exists = fs.existsSync(file);
    if(!exists) fs.writeFileSync(file, cols.join(",")+"\n");
    const q = (x)=> (x===undefined || x===null) ? "" : String(x);
    const f2 = (x)=> (Number.isFinite(x) ? x.toFixed(2) : q(x));
    const f6 = (x)=> (Number.isFinite(x) ? x.toFixed(6) : q(x));
    const row = [
      tsISO(ev.t), q(ev.t), q(ev.symbol), q(ev.timeframe), q(ev.side||"BUY"),
      f2(ev.price), f2(ev.rawClose), f6(ev.qty), f2(ev.stopPrice),
      f2(ev.equityBefore), f2(ev.riskPerTradePct),
      f2(ev.atr), f2(ev.entryAtr), q(ev.atrPeriod), f2(ev.atrStopMult), f2(P.trailingStop?.atrMult),
      q(ev.trailingMode), f2(ev.trailStartR), q(ev.htfTimeframe), q(ev.htfMode), f2(ev.reentryATR)
    ];
    fs.appendFileSync(file, row.join(",")+"\n");
    logLine(`[ENTERLOG] ${tsISO(ev.t)} ${P.symbol} qty=${f6(ev.qty)} @ ${f2(ev.price)} stop=${f2(ev.stopPrice)}`);
  }catch(e){ logLine(`[ENTERLOG] write-failed: ${e.message}`); }
}

// ---------- trade ops ----------
function enterLong(broker, bar){
  const riskUSD = (broker.equity ?? P.startEquity) * (P.riskPerTradePct/100);
  const stopDist = ((P.atrPeriod>0 ? (P.atrStopMult||2.0) * (bar.atr||0) : 0) || (bar.c*0.01));
  const qtyRisk = riskUSD / Math.max(stopDist, 1e-9);
  const qtyCap = P.maxPositionNotionalUSD ? (P.maxPositionNotionalUSD / bar.c) : Infinity;
  const qty = Math.min(qtyCap, qtyRisk);
  const px = slip(bar.c);

  debugSignal({ t: bar.t, px: bar.c, reason: "size-plan",
    details: { equity: broker.equity, riskPct: P.riskPerTradePct, riskUSD, atr: bar.atr, atrStopMult: P.atrStopMult, stopDist, qtyRisk, qtyCap, qty } });

  broker.position += qty;
  broker.entry = px;
  broker.stop = bar.c - stopDist;
  broker._entryAtr = Number.isFinite(bar.atr) ? bar.atr : 0;
  broker._maxSinceEntry = bar.c;
  broker.holdBars = 0;
  broker.trades.push({ t:bar.t, side:"BUY", px, qty, fee:(px*qty)*(P.feesPctRoundtrip/200), note:"enter" });
  if(qtyRisk > qtyCap) debugSignal({ t:bar.t, px, reason:"size-capped", details:{ qtyRisk, qtyCap, stopDist } });
  debugSignal({ t:bar.t, px, reason:"enter-exec", details:{ qty, stop: broker.stop } });

  logEnterExec({
    t: bar.t, symbol: P.symbol, timeframe: P.timeframe, side: "BUY",
    price: px, rawClose: bar.c, qty, stopPrice: broker.stop,
    equityBefore: broker.equity, riskPerTradePct: P.riskPerTradePct,
    atr: bar.atr, entryAtr: broker._entryAtr, atrPeriod: P.atrPeriod,
    atrStopMult: P.atrStopMult, trailingMode: P.trailingStop?.mode,
    trailStartR: P.trailStartR, htfTimeframe: P.htfFilter?.timeframe, htfMode: P.htfFilter?.mode,
    reentryATR: P.reentryATR
  });

  appendTradeCsv(broker.trades[broker.trades.length - 1]);

  // Intraday-hard initial stop: push immediately (your real broker impl would place it)
  // Here, we just keep `broker.stop` authoritative and check intraday vs. bar.l in run loop
}

function exitLong(broker, barLike, note){
  if(broker.position<=0) return;
  const qty = broker.position; const px = slip(barLike.c);
  broker.position = 0; broker.stop=null;
  broker.trades.push({ t:barLike.t, side:"SELL", px, qty, fee:(px*qty)*(P.feesPctRoundtrip/200), note });
  const lastBuy = broker.trades.slice().reverse().find(x=>x.side==="BUY");
  const pnl = (px - (lastBuy?.px||px)) * qty - ((px+lastBuy?.px||px)*qty)*(P.feesPctRoundtrip/200);
  broker.equity += pnl;
  debugSignal({ t: barLike.t, px, reason: "exit-exec", details: { note, pnl } });
  logLine(`[EXITLOG] ${tsISO(barLike.t)} ${P.symbol} px=${px.toFixed(2)} pnl=${pnl?.toFixed(2)} note=${note}`);
  appendTradeCsv(broker.trades[broker.trades.length - 1]);
  return pnl;
}

function updateTrailingStop(broker, bar){
  if(!P.trailingStop?.enabled || !broker.entry) return;
  const prevStop = broker.stop;

  // respect onCloseOnly for trailing updates (initial stop stays intraday hard)
  const allowTrailUpdate = P.trailingStop.onCloseOnly ? !!bar.isClose : true;

  if(allowTrailUpdate){
    if(P.trailingStop.mode === "entryATR"){
      const trailAtrMult = (P.trailingStop?.atrMult ?? P.atrStopMult ?? 2.0);
      const trailDist = trailAtrMult * (broker._entryAtr || bar.atr || 0);
      const rNow = trailDist>0 ? (bar.c - broker.entry) / trailDist : 0;
      if(rNow >= P.trailStartR){
        broker._maxSinceEntry = Math.max(broker._maxSinceEntry||bar.c, bar.c);
        const candidate = (broker._maxSinceEntry - trailDist);
        broker.stop = Math.max(broker.stop ?? -Infinity, candidate);
      }
    } else if(P.trailingStop.mode === "barATR"){
      const trailAtrMult = (P.trailingStop?.atrMult ?? P.atrStopMult ?? 2.0);
      const trailDist = trailAtrMult * (bar.atr||0);
      broker._maxSinceEntry = Math.max(broker._maxSinceEntry||bar.c, bar.c);
      broker.stop = Math.max(broker.stop ?? -Infinity, broker._maxSinceEntry - trailDist);
    } else if(P.trailingStop.mode === "percent"){
      const trailDist = (P.trailingStop.percent/100) * broker.entry;
      broker._maxSinceEntry = Math.max(broker._maxSinceEntry||bar.c, bar.c);
      broker.stop = Math.max(broker.stop ?? -Infinity, broker._maxSinceEntry - trailDist);
    }
    if (broker.stop != null && (prevStop == null || broker.stop > prevStop)) {
      debugSignal({ t: bar.t, px: bar.c, reason: "trail-move", details: { stop: broker.stop } });
    }
  }
}

// ---------- helpers: Donchian High, R multiple, LIVE line ----------
function donchianHigh(series, N){
  if (!series || series.length < N) return undefined;
  let hi = -Infinity;
  for (let i = series.length - N; i < series.length; i++){
    const b = series[i]; if (!b) continue;
    if (Number.isFinite(b.h)) hi = Math.max(hi, b.h);
  }
  return (hi === -Infinity) ? undefined : hi;
}

function rMultipleNow(broker, bar){
  if (!broker || broker.position <= 0) return 0;
  const rps = (broker.entry != null && broker.stop != null) ? (broker.entry - broker.stop) : 0;
  if (rps <= 0) return 0;
  return (bar.c - broker.entry) / rps;
}

function printLive(broker, bar, tradesTodayCount){
  const retPct = ((broker.equity / P.startEquity) - 1) * 100;
  let extra = "";
  if (broker.position > 0) {
    const uPnL = (bar.c - broker.entry) * broker.position - (bar.c + broker.entry) * broker.position * (P.feesPctRoundtrip / 200);
    const uRet = (uPnL / P.startEquity) * 100;
    const R = rMultipleNow(broker, bar);
    extra = `  uPnL: $${uPnL.toFixed(2)}  uRet: ${uRet.toFixed(2)}%  R: ${R.toFixed(2)}`;
  }
  logLine("------------------------------");
  logLine(`[LIVE] Equity: $${broker.equity.toFixed(2)}  Return: ${retPct.toFixed(2)}%  OpenPos: ${broker.position > 0 ? 'YES' : 'NO'}  Trades: ${tradesTodayCount}${extra}`);
  logLine("------------------------------");
}

// ---------- engines ----------
async function runBacktest(){
  const backend = makeBackend(P);

  const tf = tfMs(P.timeframe);
  const bufferBars = Math.max(P.emaSlow || 200, P.atrPeriod || 21) + 100;
  const needBars   = P.lookback + bufferBars;
  const since      = Date.now() - needBars * tf;

  const rows = await backend.fetchRangeOHLCV(P.symbol, P.timeframe, since, needBars + 5);
  const seriesAll = addIndicatorsWithTf(rows, P.timeframe);
  if (seriesAll.length === 0) { console.error("No data"); return; }

  const series = seriesAll.slice(-P.lookback);
  if (series.length === 0) { console.error("Not enough post-warmup data"); return; }

  // HTF precompute
  let htfSeries = [];
  if (P.htfFilter.enabled) {
    const htfTF = P.htfFilter.timeframe || "4h";
    const htf   = tfMs(htfTF);
    const htfMinBars = (P.htfFilter.minBars || 260) + 50;
    const htfSince   = series[0].t - (htfMinBars + 10) * htf;
    const htfLimit   = Math.ceil((series.length * tf) / htf) + htfMinBars + 10;
    htfSeries = await precomputeHTF(backend, P.symbol, htfTF, htfSince, htfLimit);
  }

  const broker = makeBroker();
  const guards = makeGuards();

  const eqRows = [];
  const markToMarket = (bar) => {
    if (broker.position <= 0) return broker.equity;
    const lastBuy = broker.trades.slice().reverse().find(x => x.side === "BUY");
    if (!lastBuy) return broker.equity;
    const floatPnL = (bar.c - lastBuy.px) * broker.position;
    return broker.equity + floatPnL;
  };

  for (let i = 1; i < series.length; i++) {
    const b = series[i], last = series[i - 1];
    newDayIfNeeded(guards, b.t, broker);

    // exits
    if (broker.position > 0) {
      broker.holdBars++;
      updateTrailingStop(broker, b);

      // intraday-hard stop check (on backtest bar-level: use low breach)
      if (broker.stop && b.l <= broker.stop) {
        const pnl = exitLong(broker, { t: b.t, c: broker.stop }, "stopHit");
        guards.lastExitPx = broker.stop; guards.lastExitReason = "stopHit";
        guards.lastExitProfit = pnl > 0; guards.lastATR = b.atr || guards.lastATR;
        if (pnl < 0) guards.consecutiveLosses++; else guards.consecutiveLosses = 0;
        guards.cooldown = P.cooldownBarsAfterLoss;
      } else {
        if (P.strategy.style === "meanReversion" && (b.rsi || 0) >= P.rsiExit) {
          const pnl = exitLong(broker, b, "mrExit");
          guards.lastExitPx = b.c; guards.lastExitReason = "mrExit";
          guards.lastExitProfit = pnl > 0; guards.lastATR = b.atr || guards.lastATR;
          if (pnl < 0) guards.consecutiveLosses++; else guards.consecutiveLosses = 0;
          guards.cooldown = pnl < 0 ? P.cooldownBarsAfterLoss : 0;
        } else if (P.momentumExit.enabled) {
          const trailDist = (P.atrStopMult || 2.0) * (broker._entryAtr || b.atr || 0);
          const rNow = trailDist > 0 ? (b.c - broker.entry) / trailDist : 0;
          const pnlNow = (b.c - broker.entry) * broker.position
                         - (b.c + broker.entry) * broker.position * (P.feesPctRoundtrip / 200);
          if (P.momentumExit.requiresProfit) {
            if (rNow >= (P.momentumExit.minR || 0.5) && pnlNow > 0) {
              const pnl = exitLong(broker, b, "momentumExit");
              guards.lastExitPx = b.c; guards.lastExitReason = "momentumExit";
              guards.lastExitProfit = pnl > 0; guards.lastATR = b.atr || guards.lastATR;
              if (pnl < 0) guards.consecutiveLosses++; else guards.consecutiveLosses = 0;
              guards.cooldown = pnl < 0 ? P.cooldownBarsAfterLoss : 0;
            }
          }
        }
      }
    }

    // entries
    guards.barsSinceLastEntry++;
    const explain = canEnterNowExplain({
      bar:b, last, guards, htfOk:true,
      position: broker.position>0 ? { holdBars:broker.holdBars } : null,
      equityNow: broker.equity
    });

    if (explain.ok && broker.position === 0) {
      let okToEnter = true;
      if (P.strategy.style === "trend") {
        const emaFast = b.emaFast ?? NaN;
        const cushion = (P.entryAtrCushion || 0) * (b.atr || 0);
        okToEnter = Number.isFinite(emaFast) && b.c > (emaFast + cushion);
        if(!okToEnter){
          debugSignal({ t:b.t, px:b.c, reason:"entry-blocked",
            details:{ why:"breakout-cushion", emaFast, cushion, need:(emaFast + cushion) } });
        }
      }
      if (okToEnter) { enterLong(broker, b); guards.tradesToday++; guards.barsSinceLastEntry = 0; }
      else if (guards.cooldown > 0) { guards.cooldown--; }
    } else {
      debugSignal({ t:b.t, px:b.c, reason:"entry-blocked",
        details: explain.details ? Object.assign({ why: explain.why }, explain.details) : { why: explain.why } });
      if (guards.cooldown > 0) guards.cooldown--;
    }

    // (optional) pyramiding in BT: needs Donchian High over recent N bars
    if (broker.position > 0 && P.pyramiding?.enabled) {
      const N = P.pyramiding.donchianN || 20;
      const dcH = donchianHigh(series.slice(0, i+1), N);
      const atr = b.atr || broker._entryAtr || 0;
      const need = (dcH ?? b.h) + (P.pyramiding.breakATR || 0.25) * atr;
      const Rnow = rMultipleNow(broker, b);
      if (Rnow >= 1.0 && b.c > need && guards.tradesToday < P.maxTradesPerDay) {
        const riskBudget = (broker.equity || P.startEquity) * (P.riskPerTradePct/100);
        const openRisk = Math.max(0, (b.c - broker.stop) * broker.position);
        const remainingRisk = Math.max(0, riskBudget - openRisk);
        const addRisk = Math.min(remainingRisk, riskBudget * (P.pyramiding.riskFracPerAdd || 0.4));
        const rps = (broker.entry - broker.stop);
        if (rps > 0 && addRisk > 0) {
          let qtyAdd = Math.floor((addRisk / rps) * 10000) / 10000;
          if (qtyAdd > 0) {
            const px = slip(b.c);
            broker.position += qtyAdd;
            broker.trades.push({ t:b.t, side:"BUY", px, qty:qtyAdd, fee:(px*qtyAdd)*(P.feesPctRoundtrip/200), note:"pyramid" });
            guards.tradesToday++;
            // keep total open risk ≤ 1R by raising stop if needed
            const desired = riskBudget;
            const openRiskPost = Math.max(0, (b.c - broker.stop) * broker.position);
            if (openRiskPost > desired) {
              const newStop = b.c - (desired / broker.position);
              if (newStop > broker.stop) {
                debugSignal({ t:b.t, px:b.c, reason:"stop-raise-pyramid", details:{ old: broker.stop, new: newStop }});
                broker.stop = newStop;
              }
            }
            debugSignal({ t:b.t, px:b.c, reason:"pyramid-add", details:{ qtyAdd, tradesToday: guards.tradesToday } });
          }
        }
      }
    }

    eqRows.push([b.t, markToMarket(b)]);
  }

  const lastBar = series.at(-1);
  if (broker.position > 0) {
    const pnl = exitLong(broker, lastBar, "eodFlat");
    guards.lastExitPx = lastBar.c; guards.lastExitReason = "eodFlat";
    guards.lastExitProfit = (pnl ?? 0) > 0; guards.lastATR = lastBar.atr || guards.lastATR;
  }
  eqRows.push([lastBar.t, broker.equity]);

  if (P.csv.enable) {
    ensureDir(P.reportsDir);
    const tradesCsv = ["time,side,px,qty,fee,note", ...broker.trades.map(t => `${tsISO(t.t)},${t.side},${t.px},${t.qty},${t.fee},${t.note}`)].join("\n");
    fs.writeFileSync(path.join(P.reportsDir, P.csv.trades), tradesCsv);
    const eqCsv = ["time,equity", ...eqRows.map(r => `${tsISO(r[0])},${Number(r[1]).toFixed(2)}`)].join("\n");
    fs.writeFileSync(path.join(P.reportsDir, P.csv.equity), eqCsv);
  }
}

async function runLive(){
  const backend = makeBackend(P);
  const broker = makeBroker();
  const guards = makeGuards();
  initCsvIfNeeded();

  // restore
  if(P.statePersistence.enable){
    const pth = P.statePersistence.file;
    try{ if(fs.existsSync(pth)){ const st = JSON.parse(fs.readFileSync(pth,"utf-8")); Object.assign(broker, st.broker||{}); Object.assign(guards, st.guards||{}); console.log("♻️  Restored state from", pth); } }
    catch(e){ console.warn("State restore failed:", e.message); }
  }

  // HTF refresh
  let htfSeries = []; let htfReady=false;
  async function refreshHTF(){
    if(!P.htfFilter.enabled) return;
    const tf = P.htfFilter.timeframe || "4h";
    const need = Math.max(P.htfFilter.minBars||260, 260);
    const recent = await withRetries(() => backend.fetchRecent(P.symbol, tf, need), { ...P.retry, tag:`htf-refresh:${P.symbol}:${tf}` });
    htfSeries = addIndicatorsWithTf(recent, tf);
    htfReady = true;
    debugSignal({ t: htfSeries.at(-1)?.t || Date.now(), px: htfSeries.at(-1)?.c || 0, reason:"htf-refresh", details:{ bars: htfSeries.length }});
  }
  await refreshHTF();

  process.on('SIGINT', saveStateAndExit); process.on('SIGTERM', saveStateAndExit);
  let iter=0;
  while(true){
    try{
      const rec = await withRetries(() => backend.fetchRecent(P.symbol, P.timeframe, 300),
        { ...P.retry, tag:`ltv:${P.symbol}:${P.timeframe}` });
      const series = addIndicatorsWithTf(rec, P.timeframe);

      if (iter === 0) {
        const lastRaw = rec.at(-1)?.[0];
        const alignedLast = series.at(-1)?.t;
        debugSignal({
          t: alignedLast ?? Date.now(),
          px: series.at(-1)?.c,
          reason: "startup-info",
          details: {
            timeframe: P.timeframe,
            rawLastISO: lastRaw ? new Date(lastRaw).toISOString() : null,
            alignedLastISO: alignedLast ? new Date(alignedLast).toISOString() : null
          }
        });
        debugSignal({
          t: Date.now(),
          px: series.at(-1)?.c,
          reason: "timeframe-check",
          details: { timeframe: P.timeframe, tfMs: tfMs(P.timeframe) }
        });
      }

      if(series.length<2){ await sleep(P.pollSeconds*1000); continue; }
      const b = series.at(-1); const last = series.at(-2);

      // HTF gate
      let htfOk = true; let htfIdx = -1; let hb = {};
      if(P.htfFilter.enabled){
        if(iter%10===0 || !htfReady) await refreshHTF();
        htfIdx = upperBoundIdx(htfSeries, b.t-1);
        hb = htfSeries[htfIdx] || {};
        htfOk = htfPass(htfSeries, htfIdx, P.htfFilter.mode);
        if(!htfOk){
          debugSignal({ t:b.t, px:b.c, reason:"htf-veto",
            details:{ mode:P.htfFilter.mode, tf:P.htfFilter.timeframe, emaFast:hb.emaFast, emaSlow:hb.emaSlow, rsi:hb.rsi } });
        } else if (iter % 30 === 0) {
          debugSignal({ t:b.t, px:b.c, reason:"htf-pass",
            details:{ mode:P.htfFilter.mode, tf:P.htfFilter.timeframe, emaFast:hb.emaFast, emaSlow:hb.emaSlow, rsi:hb.rsi } });
        }
      }

      // EXIT logic (intraday-hard stop)
      if(broker.position>0){
        broker.holdBars++;
        updateTrailingStop(broker, b);

        if(broker.stop && b.l <= broker.stop){
          const pnl = exitLong(broker, { t:b.t, c:broker.stop }, "stopHit");
          guards.lastExitPx = broker.stop; guards.lastExitReason="stopHit"; guards.lastExitProfit = pnl>0; guards.lastATR = b.atr||guards.lastATR;
          if(pnl<0) guards.consecutiveLosses++; else guards.consecutiveLosses=0; guards.cooldown = P.cooldownBarsAfterLoss;
          iter++; appendEquityCsv(b.t, broker.equity); printLive(broker, b, guards.tradesToday); await sleep(P.pollSeconds*1000); continue;
        }
        if(P.strategy.style === "meanReversion" && (b.rsi||0) >= P.rsiExit){
          const pnl = exitLong(broker, b, "mrExit");
          guards.lastExitPx = b.c; guards.lastExitReason="mrExit"; guards.lastExitProfit = pnl>0; guards.lastATR = b.atr||guards.lastATR;
          if(pnl<0) guards.consecutiveLosses++; else guards.consecutiveLosses=0; guards.cooldown = pnl<0 ? P.cooldownBarsAfterLoss : 0;
          iter++; appendEquityCsv(b.t, broker.equity); printLive(broker, b, guards.tradesToday); await sleep(P.pollSeconds*1000); continue;
        }
        if(P.momentumExit.enabled){
          const pnlNow = (b.c - broker.entry) * broker.position - (b.c + broker.entry) * broker.position * (P.feesPctRoundtrip/200);
          const riskUSD = (broker.equity || P.startEquity) * (P.riskPerTradePct/100);
          const rNow = riskUSD > 0 ? (pnlNow / riskUSD) : 0;
          if(P.momentumExit.requiresProfit){
            if(rNow >= (P.momentumExit.minR||0.5) && pnlNow > 0){
              const pnl = exitLong(broker, b, "momentumExit");
              guards.lastExitPx = b.c; guards.lastExitReason="momentumExit"; guards.lastExitProfit = pnl>0; guards.lastATR = b.atr||guards.lastATR;
              if(pnl<0) guards.consecutiveLosses++; else guards.consecutiveLosses=0; guards.cooldown = pnl<0 ? P.cooldownBarsAfterLoss : 0;
              iter++; appendEquityCsv(b.t, broker.equity); printLive(broker, b, guards.tradesToday); await sleep(P.pollSeconds*1000); continue;
            }
          }
        }
      }

      // day boundary
      newDayIfNeeded(guards, b.t, broker);

      // ENTRY
      guards.barsSinceLastEntry++;
      const explain = canEnterNowExplain({
        bar: b, last, guards, htfOk,
        position: broker.position > 0 ? { holdBars: broker.holdBars } : null,
        equityNow: broker.equity
      });

      if (explain.ok && broker.position === 0) {
        let okToEnter = true;
        if (P.strategy.style === "trend") {
          const emaFast = b.emaFast ?? NaN;
          const cushion = (P.entryAtrCushion || 0) * (b.atr || 0);
          okToEnter = Number.isFinite(emaFast) && (b.c > emaFast + cushion);
          if (!okToEnter) {
            debugSignal({ t:b.t, px:b.c, reason:"entry-blocked", details:{ why:"breakout-cushion", emaFast, cushion, need:(emaFast + cushion) } });
          }
        }
        if (P.sessionFilter?.enabled && !isUSSession(b.t, P.sessionFilter)) {
          debugSignal({ t:b.t, px:b.c, reason:"entry-blocked", details:{ why:"session-filter" } });
          guards.diag.blocked.session++; okToEnter=false;
        }
        if (okToEnter) { enterLong(broker, b); guards.tradesToday++; guards.barsSinceLastEntry = 0; }
      } else {
        debugSignal({ t:b.t, px:b.c, reason:"entry-blocked",
          details: explain.details ? Object.assign({ why: explain.why }, explain.details) : { why: explain.why } });
      }

      // PYRAMID adds
      if (broker.position > 0 && P.pyramiding?.enabled && (!P.maxTradesPerDay || guards.tradesToday < P.maxTradesPerDay)) {
        const N = P.pyramiding.donchianN || 20;
        const dcH = donchianHigh(series, N);
        const atr = b.atr || broker._entryAtr || 0;
        const need = (dcH ?? b.h) + (P.pyramiding.breakATR || 0.25) * atr;
        const Rnow = rMultipleNow(broker, b);
        if (Rnow >= 1.0 && b.c > need) {
          const riskBudget = (broker.equity || P.startEquity) * (P.riskPerTradePct/100);
          const openRisk = Math.max(0, (b.c - broker.stop) * broker.position);
          const remainingRisk = Math.max(0, riskBudget - openRisk);
          const addRisk = Math.min(remainingRisk, riskBudget * (P.pyramiding.riskFracPerAdd || 0.4));
          const rps = (broker.entry - broker.stop);
          if (rps > 0 && addRisk > 0) {
            let qtyAdd = Math.floor((addRisk / rps) * 10000) / 10000;
            if (qtyAdd > 0) {
              const px = slip(b.c);
              broker.position += qtyAdd;
              broker.trades.push({ t:b.t, side:"BUY", px, qty:qtyAdd, fee:(px*qtyAdd)*(P.feesPctRoundtrip/200), note:"pyramid" });
              guards.tradesToday++;
              const desired = riskBudget;
              const openRiskPost = Math.max(0, (b.c - broker.stop) * broker.position);
              if (openRiskPost > desired) {
                const newStop = b.c - (desired / broker.position);
                if (newStop > broker.stop) {
                  debugSignal({ t:b.t, px:b.c, reason:"stop-raise-pyramid", details:{ old: broker.stop, new: newStop }});
                  broker.stop = newStop;
                }
              }
              debugSignal({ t:b.t, px:b.c, reason:"pyramid-add", details:{ qtyAdd, tradesToday: guards.tradesToday } });
            }
          }
        }
      }

      // LIVE line & equity mark
      if (iter % 6 === 0) {
        printLive(broker, b, guards.tradesToday);
        appendEquityCsv(b.t, broker.equity);
      }

      // Persist
      if(P.statePersistence.enable && iter%3===0){
        fs.writeFileSync(P.statePersistence.file, JSON.stringify({broker, guards}, null,2));
      }

      iter++;
      await sleep(P.pollSeconds*1000);
    }catch(e){
      logLine("[LIVE] error: "+e.message);
      await sleep(30_000);
    }
  }

  function saveStateAndExit(){
    if(P.statePersistence.enable){
      try{ fs.writeFileSync(P.statePersistence.file, JSON.stringify({broker, guards}, null,2)); console.log("💾 State saved."); }catch(_){ }
    }
    process.exit(0);
  }
}

// ---------- main ----------
(async function main(){
  ensureDir(P.reportsDir);
  if(P.csv?.enable){ initCsvIfNeeded(); }
  if(P.mode === "backtest") await runBacktest();
  else await runLive();
})();
