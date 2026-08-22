import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Pause,
  Play,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SYMBOL = "XAU/USD";
const INTERVAL = "1min";
const OUTPUT_SIZE = 150;
const POLL_MS = 30_000;
const STALE_MS = 90_000;

const C = {
  bg: "#080A0F",
  panel: "#11151C",
  panel2: "#0C1016",
  border: "#242A35",
  text: "#E8EBF0",
  dim: "#7D8798",
  gold: "#D3AA4D",
  buy: "#39D98A",
  sell: "#F05B64",
  blue: "#5B8DEF",
  warn: "#F5A524",
};

function sma(values, period) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values, period) {
  const out = Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function atr(high, low, close, period = 14) {
  const tr = close.map((value, i) => {
    if (i === 0) return high[i] - low[i];
    return Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1]),
    );
  });
  return ema(tr, period);
}

function macd(values) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const line = values.map((_, i) =>
    fast[i] != null && slow[i] != null ? fast[i] - slow[i] : null,
  );
  const compact = line.filter((x) => x != null);
  const signalCompact = ema(compact, 9);
  const signal = Array(values.length).fill(null);
  const offset = line.findIndex((x) => x != null);
  for (let i = 0; i < signalCompact.length; i += 1) {
    if (signalCompact[i] != null && offset + i < signal.length) {
      signal[offset + i] = signalCompact[i];
    }
  }
  return { line, signal };
}

function bollinger(values, period = 20, multiplier = 2) {
  const mid = sma(values, period);
  const upper = Array(values.length).fill(null);
  const lower = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i += 1) {
    const window = values.slice(i - period + 1, i + 1);
    const mean = mid[i];
    const variance = window.reduce((s, x) => s + (x - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + multiplier * sd;
    lower[i] = mean - multiplier * sd;
  }
  return { mid, upper, lower };
}

function sessionInfo(date = new Date()) {
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const london = minutes >= 7 * 60 && minutes < 16 * 60;
  const ny = minutes >= 12 * 60 + 30 && minutes < 21 * 60;
  return {
    london,
    ny,
    overlap: london && ny,
    label: london && ny
      ? "London + New York overlap"
      : london
        ? "London session"
        : ny
          ? "New York session"
          : "Outside main sessions",
  };
}

function calculate(candles) {
  const close = candles.map((x) => x.close);
  const high = candles.map((x) => x.high);
  const low = candles.map((x) => x.low);
  const i = close.length - 1;

  const s20 = sma(close, 20);
  const s50 = sma(close, 50);
  const e12 = ema(close, 12);
  const e26 = ema(close, 26);
  const r = rsi(close, 14);
  const a = atr(high, low, close, 14);
  const m = macd(close);
  const bb = bollinger(close, 20, 2);

  const votes = [];
  const add = (name, value, detail) => votes.push({ name, value, detail });

  if (s20[i] != null && s50[i] != null) {
    add("SMA 20 / 50", s20[i] > s50[i] ? 1 : -1, s20[i] > s50[i] ? "20 above 50" : "20 below 50");
  }
  if (e12[i] != null && e26[i] != null) {
    add("EMA 12 / 26", e12[i] > e26[i] ? 1 : -1, e12[i] > e26[i] ? "Bullish" : "Bearish");
  }
  if (r[i] != null) {
    const value = r[i] < 30 ? 1 : r[i] > 70 ? -1 : r[i] >= 50 ? 0.5 : -0.5;
    const detail = r[i] < 30 ? "Oversold" : r[i] > 70 ? "Overbought" : r[i] >= 50 ? "Bullish momentum" : "Bearish momentum";
    add("RSI 14", value, `${detail} (${r[i].toFixed(1)})`);
  }
  if (m.line[i] != null && m.signal[i] != null) {
    add("MACD", m.line[i] > m.signal[i] ? 1 : -1, m.line[i] > m.signal[i] ? "Above signal" : "Below signal");
  }
  if (bb.upper[i] != null && bb.lower[i] != null) {
    const p = close[i];
    if (p >= bb.upper[i]) add("Bollinger", -1, "At/above upper band");
    else if (p <= bb.lower[i]) add("Bollinger", 1, "At/below lower band");
    else add("Bollinger", p >= bb.mid[i] ? 0.25 : -0.25, p >= bb.mid[i] ? "Upper half" : "Lower half");
  }

  const score = Math.round((votes.reduce((sum, x) => sum + x.value, 0) / Math.max(votes.length, 1)) * 100);
  const signal = score >= 40 ? "STRONG BUY" : score >= 15 ? "BUY" : score <= -40 ? "STRONG SELL" : score <= -15 ? "SELL" : "HOLD";

  const slope = s20[i] != null && s20[i - 10] != null ? s20[i] - s20[i - 10] : 0;
  const trend = s20[i] != null && s50[i] != null
    ? s20[i] > s50[i] && slope > 0
      ? "BULLISH"
      : s20[i] < s50[i] && slope < 0
        ? "BEARISH"
        : "MIXED"
    : "NEUTRAL";

  const fiveMinute = [];
  for (let j = 0; j + 4 < candles.length; j += 5) {
    const group = candles.slice(j, j + 5);
    fiveMinute.push({
      close: group[4].close,
      high: Math.max(...group.map((x) => x.high)),
      low: Math.min(...group.map((x) => x.low)),
    });
  }
  const fiveClose = fiveMinute.map((x) => x.close);
  const f20 = sma(fiveClose, 20);
  const f50 = sma(fiveClose, 50);
  const fi = fiveClose.length - 1;
  const htf = f20[fi] != null && f50[fi] != null ? (f20[fi] > f50[fi] ? "BULLISH" : "BEARISH") : "NEUTRAL";

  const direction = signal.includes("BUY") ? "BUY" : signal.includes("SELL") ? "SELL" : "NONE";
  const compatible = direction === "NONE" || (direction === "BUY" ? htf !== "BEARISH" : htf !== "BULLISH");
  const actionable = direction !== "NONE" && Math.abs(score) >= 25 && compatible;

  const price = close[i];
  const risk = Math.max(a[i] || 0, price * 0.0005);
  const sl = direction === "BUY" ? price - risk * 1.5 : direction === "SELL" ? price + risk * 1.5 : null;
  const tp1 = direction === "BUY" ? price + risk * 1.5 : direction === "SELL" ? price - risk * 1.5 : null;
  const tp2 = direction === "BUY" ? price + risk * 3 : direction === "SELL" ? price - risk * 3 : null;

  const confidence = Math.min(99, Math.round(Math.abs(score) * 0.8 + (trend === htf && htf !== "NEUTRAL" ? 12 : 0)));

  return {
    score,
    signal,
    direction,
    actionable,
    confidence,
    price,
    sl,
    tp1,
    tp2,
    trend,
    htf,
    session: sessionInfo(),
    votes,
    indicators: {
      sma20: s20[i],
      sma50: s50[i],
      ema12: e12[i],
      ema26: e26[i],
      rsi: r[i],
      atr: a[i],
      macd: m.line[i],
      macdSignal: m.signal[i],
    },
    chart: candles.map((x, index) => ({
      time: x.time,
      close: x.close,
      sma20: s20[index],
      sma50: s50[index],
      upper: bb.upper[index],
      lower: bb.lower[index],
    })),
  };
}

async function fetchMarket() {
  const response = await fetch(`/api/market?symbol=${encodeURIComponent(SYMBOL)}&interval=${INTERVAL}&outputsize=${OUTPUT_SIZE}`, {
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Market-data server returned an invalid response.");
  }
  if (!response.ok || data.status === "error") {
    throw new Error(data.message || "Market-data request failed.");
  }
  return (data.values || []).map((v) => ({
    time: v.time,
    open: Number(v.open),
    high: Number(v.high),
    low: Number(v.low),
    close: Number(v.close),
    volume: v.volume,
  })).filter((v) => [v.open, v.high, v.low, v.close].every(Number.isFinite));
}

function SignalBadge({ signal }) {
  const isBuy = signal.includes("BUY");
  const isSell = signal.includes("SELL");
  const color = isBuy ? C.buy : isSell ? C.sell : C.dim;
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Wifi;
  return <span className="signal-badge" style={{ color, borderColor: `${color}66`, background: `${color}16` }}><Icon size={17} />{signal}</span>;
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

export default function App() {
  const [candles, setCandles] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [running, setRunning] = useState(true);
  const [alerts, setAlerts] = useState(false);
  const [history, setHistory] = useState([]);
  const previousSignal = useRef("HOLD");

  const load = useCallback(async () => {
    setStatus((x) => (x === "ok" ? "refreshing" : "loading"));
    try {
      const data = await fetchMarket();
      if (data.length < 60) throw new Error(`Only ${data.length} candles were returned; at least 60 are needed for the indicators.`);
      setCandles(data);
      setUpdatedAt(Date.now());
      setStatus("ok");
      setError("");
    } catch (e) {
      setStatus("error");
      setError(e?.message || "Unable to load market data.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [running, load]);

  const result = useMemo(() => candles.length >= 60 ? calculate(candles) : null, [candles]);
  const stale = updatedAt != null && Date.now() - updatedAt > STALE_MS;
  const lastCandleTime = candles.at(-1)?.time;
  const previousClose = candles.at(-2)?.close ?? result?.price ?? 0;
  const change = result ? result.price - previousClose : 0;
  const pct = previousClose ? (change / previousClose) * 100 : 0;

  useEffect(() => {
    if (!result || result.signal === previousSignal.current) return;
    if (result.signal !== "HOLD") {
      setHistory((items) => [{ time: Date.now(), signal: result.signal, score: result.score, price: result.price }, ...items].slice(0, 20));
      if (alerts && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`XAU/USD ${result.signal}`, { body: `Confluence score ${result.score} · ${result.price.toFixed(2)}` });
      }
    }
    previousSignal.current = result.signal;
  }, [result, alerts]);

  const enableAlerts = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") await Notification.requestPermission();
    setAlerts(Notification.permission === "granted");
  };

  return (
    <main>
      <header className="topbar">
        <div className="brand"><div className="logo">Au</div><div><h1>XAUUSD Signal Terminal</h1><p><span className={`status-dot ${status === "ok" ? "live" : ""}`} />Twelve Data · {INTERVAL} · {updatedAt ? `updated ${new Date(updatedAt).toLocaleTimeString()}` : "connecting…"}</p></div></div>
        <div className="actions">
          <button onClick={enableAlerts} className="button">{alerts ? <Bell size={15} /> : <BellOff size={15} />} Alerts</button>
          <button onClick={() => setRunning((x) => !x)} className="button">{running ? <Pause size={15} /> : <Play size={15} />}{running ? "Pause" : "Resume"}</button>
          <button onClick={load} className="button"><RefreshCw size={15} /> Refresh</button>
        </div>
      </header>

      {status === "error" && <div className="error"><AlertTriangle size={18} /><div><strong>Live data error</strong><p>{error}</p></div></div>}
      {stale && <div className="warning"><WifiOff size={16} /> Data appears stale. The terminal will not treat stale data as current.</div>}

      {!result && <section className="panel loading-panel">Loading XAU/USD market data…</section>}

      {result && <>
        <section className="hero panel">
          <div><div className="eyebrow">XAU / USD</div><div className="price">{result.price.toFixed(2)}</div><div className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change.toFixed(2)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</div></div>
          <div className="hero-signal"><SignalBadge signal={result.signal} /><div className="score">{result.score > 0 ? "+" : ""}{result.score}<small>CONFLUENCE SCORE</small></div></div>
        </section>

        <section className="panel chart-panel"><div className="panel-title">PRICE / INDICATORS <span>{lastCandleTime || "—"}</span></div><div className="chart"><ResponsiveContainer width="100%" height={340}><ComposedChart data={result.chart} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke={C.border} strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fill: C.dim, fontSize: 10 }} tickFormatter={(v) => String(v).slice(11, 16)} minTickGap={35} /><YAxis domain={["auto", "auto"]} tick={{ fill: C.dim, fontSize: 10 }} width={65} /><Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text }} /><Area type="monotone" dataKey="close" stroke={C.gold} fill={`${C.gold}18`} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="sma20" stroke={C.blue} dot={false} strokeWidth={1.5} /><Line type="monotone" dataKey="sma50" stroke={C.sell} dot={false} strokeWidth={1.5} /><Line type="monotone" dataKey="upper" stroke={C.dim} dot={false} strokeWidth={1} /><Line type="monotone" dataKey="lower" stroke={C.dim} dot={false} strokeWidth={1} /></ComposedChart></ResponsiveContainer></div></section>

        <section className="grid">
          <div className="panel"><div className="panel-title">MARKET STATE</div><div className="stats"><Stat label="1M TREND" value={result.trend} /><Stat label="5M TREND" value={result.htf} /><Stat label="SESSION" value={result.session.label} /><Stat label="CONFIDENCE" value={`${result.confidence}%`} /></div></div>
          <div className="panel"><div className="panel-title">INDICATORS</div>{result.votes.map((v) => <div className="indicator" key={v.name}><div><strong>{v.name}</strong><small>{v.detail}</small></div><span className={v.value > 0.1 ? "tag buy" : v.value < -0.1 ? "tag sell" : "tag"}>{v.value > 0.1 ? "BULL" : v.value < -0.1 ? "BEAR" : "FLAT"}</span></div>)}</div>
        </section>

        <section className="panel"><div className="panel-title">SETUP LEVELS <span>{result.actionable ? "ALIGNED" : "WAIT / MIXED"}</span></div><div className="stats"><Stat label="DIRECTION" value={result.actionable ? result.direction : "NONE"} /><Stat label="ENTRY REFERENCE" value={result.price.toFixed(2)} /><Stat label="STOP REFERENCE" value={result.sl == null ? "—" : result.sl.toFixed(2)} /><Stat label="TARGET 1" value={result.tp1 == null ? "—" : result.tp1.toFixed(2)} /><Stat label="TARGET 2" value={result.tp2 == null ? "—" : result.tp2.toFixed(2)} /></div><p className="disclaimer">These levels are calculated mechanically from the terminal's indicator model. They are not guarantees and should not be treated as personalized financial advice.</p></section>

        <section className="panel"><div className="panel-title">SIGNAL HISTORY</div>{history.length === 0 ? <p className="muted">No signal changes recorded this session.</p> : history.map((x) => <div className="history-row" key={`${x.time}-${x.score}`}><strong>{x.signal}</strong><span>{x.price.toFixed(2)}</span><span>score {x.score}</span><small>{new Date(x.time).toLocaleTimeString()}</small></div>)}</section>
      </>}

      <footer>Live data is proxied through the server so the Twelve Data credential is not bundled into the browser. Vite documents that client-exposed <code>VITE_*</code> variables are bundled and should not contain sensitive keys. Market-data responses can be delayed or unavailable.</footer>
    </main>
  );
}
