const ALLOWED_SYMBOL = "XAU/USD";
const INTERVAL = "1min";
const OUTPUT_SIZE = 150;

function sma(values, period) {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i += 1) sum += values[i];
  return sum / period;
}

function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i += 1) value = values[i] * k + value * (1 - k);
  return value;
}

function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i += 1) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

function atr(values, period = 14) {
  if (values.length < period + 1) return null;
  const tr = [];
  for (let i = 1; i < values.length; i += 1) tr.push(Math.abs(values[i] - values[i - 1]));
  return sma(tr, period);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return res.status(500).json({ status: "error", message: "TWELVE_DATA_API_KEY is not configured" });

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", ALLOWED_SYMBOL);
  url.searchParams.set("interval", INTERVAL);
  url.searchParams.set("outputsize", String(OUTPUT_SIZE));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await upstream.json();
    if (!upstream.ok || data?.status === "error" || Number(data?.code) >= 400) {
      return res.status(502).json({ status: "error", message: data?.message || "Market-data request failed" });
    }

    const candles = (data.values || []).map((v) => ({
      time: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    })).filter((v) => [v.open, v.high, v.low, v.close].every(Number.isFinite));

    if (candles.length < 60) return res.status(502).json({ status: "error", message: "Insufficient market data" });

    const close = candles.map((x) => x.close);
    const price = close.at(-1);
    const s20 = sma(close, 20);
    const s50 = sma(close, 50);
    const e12 = ema(close, 12);
    const e26 = ema(close, 26);
    const r = rsi(close, 14);
    const a = atr(close, 14);

    let score = 0;
    const votes = [];
    const vote = (name, value) => { score += value; votes.push({ name, value }); };
    if (s20 != null && s50 != null) vote("SMA20/50", s20 > s50 ? 1 : -1);
    if (e12 != null && e26 != null) vote("EMA12/26", e12 > e26 ? 1 : -1);
    if (r != null) vote("RSI14", r < 30 ? 1 : r > 70 ? -1 : r >= 50 ? 0.5 : -0.5);

    const normalized = Math.round((score / Math.max(votes.length, 1)) * 100);
    const signal = normalized >= 40 ? "STRONG BUY" : normalized >= 15 ? "BUY" : normalized <= -40 ? "STRONG SELL" : normalized <= -15 ? "SELL" : "HOLD";
    const direction = signal.includes("BUY") ? "BUY" : signal.includes("SELL") ? "SELL" : "NONE";
    const risk = Math.max(a || 0, price * 0.0005);
    const sl = direction === "BUY" ? price - risk * 1.5 : direction === "SELL" ? price + risk * 1.5 : null;
    const tp1 = direction === "BUY" ? price + risk * 1.5 : direction === "SELL" ? price - risk * 1.5 : null;
    const tp2 = direction === "BUY" ? price + risk * 3 : direction === "SELL" ? price - risk * 3 : null;

    const candleTime = Date.parse(`${candles.at(-1).time}Z`);
    const ageSeconds = Number.isFinite(candleTime) ? Math.max(0, Math.floor((Date.now() - candleTime) / 1000)) : null;
    const id = `${candles.at(-1).time}-${signal}-${price.toFixed(3)}`;

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      status: "ok",
      mode: "DEMO_ONLY",
      symbol: ALLOWED_SYMBOL,
      mt5Symbol: "XAUUSD",
      interval: INTERVAL,
      signal,
      direction,
      actionable: direction !== "NONE" && Math.abs(normalized) >= 25,
      score: normalized,
      confidence: Math.min(99, Math.round(Math.abs(normalized) * 0.8)),
      price,
      sl,
      tp1,
      tp2,
      candleTime: candles.at(-1).time,
      ageSeconds,
      id,
      votes,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("mt5 signal error", error);
    return res.status(502).json({ status: "error", message: "Unable to build demo signal" });
  }
}
