import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Minus,
  Pause,
  Play,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";

/* =========================================================
   CONFIG
========================================================= */

const API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;

const SYMBOL = "XAU/USD";
const INTERVAL = "1min";
const OUTPUT_SIZE = 150;
const POLL_MS = 30000;

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  gold: "#C9A24B",
  buy: "#3ECF8E",
  sell: "#E5484D",
  bg: "#0A0C10",
  panel: "#12151C",
  border: "#232833",
  dim: "#7C8494",
  text: "#E4E7EC",
  blue: "#5B8DEF",
  orange: "#F5A524",
};

/* =========================================================
   GLOBAL CSS
========================================================= */

const css = `
* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  background: ${COLORS.bg};
}

body {
  color: ${COLORS.text};
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
  cursor: pointer;
  font: inherit;
}

main {
  min-height: 100vh;
  padding: 20px 16px 60px;
  max-width: 1100px;
  margin: auto;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.brand,
.actions,
.price,
.badge,
.session,
.stat,
.row,
.level,
.log {
  display: flex;
  align-items: center;
}

.brand {
  gap: 10px;
}

.au {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, #C9A24B, #8a6d1f);
  display: grid;
  place-items: center;
  color: #0A0C10;
  font-weight: 900;
}

.title {
  font-size: 18px;
  font-weight: 800;
}

.sub {
  font-size: 11px;
  color: ${COLORS.dim};
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.actions {
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  background: ${COLORS.panel};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.text};
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  border-color: ${COLORS.gold};
}

.error {
  background: ${COLORS.sell}14;
  border: 1px solid ${COLORS.sell}55;
  border-radius: 10px;
  padding: 12px 15px;
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.error b {
  color: ${COLORS.sell};
}

.error p {
  margin: 3px 0 0;
  color: ${COLORS.dim};
  font-size: 12px;
}

.loading,
.muted {
  color: ${COLORS.dim};
  font-size: 12px;
}

.price {
  gap: 12px;
  flex-wrap: wrap;
  margin: 8px 0 14px;
}

.priceNum {
  font: 800 36px "JetBrains Mono", monospace;
}

.change {
  font: 600 13px "JetBrains Mono", monospace;
}

.badge {
  gap: 8px;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid;
  font: 800 13px "JetBrains Mono", monospace;
}

.panel {
  background: ${COLORS.panel};
  border: 1px solid ${COLORS.border};
  border-radius: 12px;
  padding: 17px;
}

.chart {
  margin-bottom: 14px;
}

.label {
  font-size: 11px;
  color: ${COLORS.dim};
  font-weight: 800;
  letter-spacing: 0.7px;
  margin-bottom: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid ${COLORS.border};
}

.indicator b {
  font-size: 12px;
}

.indicator small {
  display: block;
  color: ${COLORS.dim};
  font-size: 11px;
  margin-top: 3px;
}

.tag {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 5px;
}

.gauge {
  text-align: center;
  margin: 4px auto 12px;
  max-width: 190px;
}

.gauge svg {
  width: 180px;
  height: 100px;
}

.gauge strong {
  display: block;
  font: 800 22px "JetBrains Mono", monospace;
  margin-top: -8px;
}

.gauge small {
  font-size: 9px;
  color: ${COLORS.dim};
  letter-spacing: 1.3px;
}

.level {
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${COLORS.border};
  font-size: 12px;
}

.level span {
  color: ${COLORS.dim};
}

.level strong {
  font-family: "JetBrains Mono", monospace;
}

.trade {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.stat {
  flex-direction: column;
  align-items: flex-start;
  background: #0d1016;
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  padding: 10px;
}

.stat small {
  color: ${COLORS.dim};
  font-size: 10px;
}

.stat strong {
  font: 700 14px "JetBrains Mono", monospace;
  margin-top: 4px;
}

.session {
  justify-content: space-between;
  gap: 10px;
  background: #0d1016;
  border: 1px solid ${COLORS.border};
  padding: 10px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

.notice {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: ${COLORS.orange}12;
  border: 1px solid ${COLORS.orange}33;
  color: ${COLORS.orange};
  font-size: 11px;
  line-height: 1.5;
}

.log {
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${COLORS.border};
  font-size: 11px;
}

.log small {
  color: ${COLORS.dim};
  font-family: "JetBrains Mono", monospace;
}

.footer {
  border-top: 1px solid ${COLORS.border};
  margin-top: 18px;
  padding-top: 13px;
  color: ${COLORS.dim};
  font-size: 11px;
  line-height: 1.6;
}

.sectionTitle {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
}

@media (max-width: 600px) {
  main {
    padding: 15px 10px 40px;
  }

  .priceNum {
    font-size: 30px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 14px;
  }

  .session {
    align-items: flex-start;
    flex-direction: column;
  }
}
`;

/* =========================================================
   INDICATOR FUNCTIONS
========================================================= */

function sma(a, p) {
  const o = Array(a.length).fill(null);
  let s = 0;

  for (let i = 0; i < a.length; i++) {
    s += a[i];

    if (i >= p) {
      s -= a[i - p];
    }

    if (i >= p - 1) {
      o[i] = s / p;
    }
  }

  return o;
}

function ema(a, p) {
  const o = Array(a.length).fill(null);
  const k = 2 / (p + 1);

  let prev = null;

  for (let i = 0; i < a.length; i++) {
    if (i === p - 1) {
      prev = a
        .slice(0, p)
        .reduce((x, y) => x + y, 0) / p;

      o[i] = prev;
    } else if (i >= p) {
      prev = a[i] * k + prev * (1 - k);
      o[i] = prev;
    }
  }

  return o;
}

function rsi(a, p = 14) {
  const o = Array(a.length).fill(null);

  if (a.length <= p) {
    return o;
  }

  let g = 0;
  let l = 0;

  for (let i = 1; i <= p; i++) {
    const d = a[i] - a[i - 1];

    if (d >= 0) {
      g += d;
    } else {
      l -= d;
    }
  }

  let ag = g / p;
  let al = l / p;

  o[p] =
    al === 0
      ? 100
      : 100 - 100 / (1 + ag / al);

  for (let i = p + 1; i < a.length; i++) {
    const d = a[i] - a[i - 1];

    const ga = Math.max(d, 0);
    const lo = Math.max(-d, 0);

    ag = (ag * (p - 1) + ga) / p;
    al = (al * (p - 1) + lo) / p;

    o[i] =
      al === 0
        ? 100
        : 100 - 100 / (1 + ag / al);
  }

  return o;
}

function macd(a) {
  const f = ema(a, 12);
  const s = ema(a, 26);

  const m = a.map((_, i) =>
    f[i] != null && s[i] != null
      ? f[i] - s[i]
      : null
  );

  const valid = m.filter((v) => v != null);

  const sr = ema(valid, 9);

  const sig = Array(a.length).fill(null);

  let off = m.findIndex((v) => v != null);

  if (off < 0) {
    off = 0;
  }

  for (let i = 0; i < sr.length; i++) {
    if (sr[i] != null) {
      sig[off + i] = sr[i];
    }
  }

  return {
    m,
    sig,
    h: m.map((v, i) =>
      v != null && sig[i] != null
        ? v - sig[i]
        : null
    ),
  };
}

function bollinger(a, p = 20, m = 2) {
  const mid = sma(a, p);

  const u = Array(a.length).fill(null);
  const l = Array(a.length).fill(null);

  for (let i = p - 1; i < a.length; i++) {
    const x = a.slice(i - p + 1, i + 1);

    const sd = Math.sqrt(
      x.reduce(
        (s, v) => s + (v - mid[i]) ** 2,
        0
      ) / p
    );

    u[i] = mid[i] + m * sd;
    l[i] = mid[i] - m * sd;
  }

  return {
    mid,
    u,
    l,
  };
}

function stochastic(
  h,
  l,
  c,
  p = 14,
  sp = 3,
  dp = 3
) {
  const raw = Array(c.length).fill(null);

  for (let i = p - 1; i < c.length; i++) {
    const hh = Math.max(
      ...h.slice(i - p + 1, i + 1)
    );

    const ll = Math.min(
      ...l.slice(i - p + 1, i + 1)
    );

    raw[i] =
      hh === ll
        ? 50
        : ((c[i] - ll) / (hh - ll)) * 100;
  }

  const ks = sma(
    raw.filter((v) => v != null),
    sp
  );

  const kf = Array(c.length).fill(null);

  const off = raw.findIndex(
    (v) => v != null
  );

  for (let i = 0; i < ks.length; i++) {
    if (ks[i] != null) {
      kf[off + i] = ks[i];
    }
  }

  const ds = sma(
    ks.filter((v) => v != null),
    dp
  );

  const df = Array(c.length).fill(null);

  const off2 = kf.findIndex(
    (v) => v != null
  );

  for (let i = 0; i < ds.length; i++) {
    if (ds[i] != null) {
      df[off2 + i] = ds[i];
    }
  }

  return {
    k: kf,
    d: df,
  };
}

function atr(h, l, c, p = 14) {
  const tr = c.map((v, i) => {
    if (i === 0) {
      return h[i] - l[i];
    }

    return Math.max(
      h[i] - l[i],
      Math.abs(h[i] - c[i - 1]),
      Math.abs(l[i] - c[i - 1])
    );
  });

  return ema(tr, p);
}

/* =========================================================
   5 MINUTE AGGREGATION
========================================================= */

function aggregate5(c) {
  const out = [];

  for (let i = 0; i < c.length; i += 5) {
    const x = c.slice(i, i + 5);

    if (x.length < 5) {
      continue;
    }

    out.push({
      time: x[x.length - 1].time,
      open: x[0].open,
      high: Math.max(...x.map((v) => v.high)),
      low: Math.min(...x.map((v) => v.low)),
      close: x[x.length - 1].close,
    });
  }

  return out;
}

/* =========================================================
   SESSION
========================================================= */

function sessionInfo() {
  const d = new Date();

  const h =
    d.getUTCHours() +
    d.getUTCMinutes() / 60;

  const london = h >= 7 && h < 16;
  const ny = h >= 12.5 && h < 21;
  const overlap = h >= 12.5 && h < 16;

  return {
    london,
    ny,
    overlap,
    label: overlap
      ? "London + New York overlap"
      : london
        ? "London session"
        : ny
          ? "New York session"
          : "Outside main sessions",
  };
}

/* =========================================================
   TWELVE DATA
========================================================= */

async function fetchXauSeries() {
  if (!API_KEY) {
    throw new Error(
      "Twelve Data API key is missing. Add VITE_TWELVE_DATA_API_KEY in Vercel."
    );
  }

  const params = new URLSearchParams({
    symbol: SYMBOL,
    interval: INTERVAL,
    outputsize: String(OUTPUT_SIZE),
    order: "ASC",
    apikey: API_KEY,
  });

  const response = await fetch(
    `https://api.twelvedata.com/time_series?${params.toString()}`
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Twelve Data returned an invalid response."
    );
  }

  if (
    !response.ok ||
    data.status === "error" ||
    data.code >= 400
  ) {
    throw new Error(
      data.message ||
        "Twelve Data request failed."
    );
  }

  if (!Array.isArray(data.values)) {
    throw new Error(
      "No XAU/USD data returned by Twelve Data."
    );
  }

  return data.values
    .map((v, i) => ({
      i,
      time: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .filter((v) =>
      [
        v.open,
        v.high,
        v.low,
        v.close,
      ].every(Number.isFinite)
    );
}

/* =========================================================
   SIGNAL ENGINE
========================================================= */

function compute(c) {
  const cl = c.map((x) => x.close);
  const h = c.map((x) => x.high);
  const l = c.map((x) => x.low);

  const s20 = sma(cl, 20);
  const s50 = sma(cl, 50);

  const e12 = ema(cl, 12);
  const e26 = ema(cl, 26);

  const r = rsi(cl);

  const mc = macd(cl);

  const bb = bollinger(cl);

  const st = stochastic(h, l, cl);

  const a = atr(h, l, cl);

  const i = cl.length - 1;

  const v = [];

  const add = (
    name,
    val,
    detail
  ) => {
    v.push({
      name,
      val,
      detail,
    });
  };

  /* SMA */

  if (
    s20[i] != null &&
    s50[i] != null
  ) {
    const bullish =
      s20[i] > s50[i];

    add(
      "SMA 20/50",
      bullish ? 1 : -1,
      bullish
        ? "Bullish (20 > 50)"
        : "Bearish (20 < 50)"
    );
  }

  /* EMA */

  if (
    e12[i] != null &&
    e26[i] != null
  ) {
    const bullish =
      e12[i] > e26[i];

    add(
      "EMA 12/26",
      bullish ? 1 : -1,
      bullish
        ? "Bullish"
        : "Bearish"
    );
  }

  /* RSI */

  if (r[i] != null) {
    let x;
    let detail;

    if (r[i] < 30) {
      x = 1;
      detail = "Oversold";
    } else if (r[i] > 70) {
      x = -1;
      detail = "Overbought";
    } else if (r[i] > 50) {
      x = 0.5;
      detail = "Bullish momentum";
    } else {
      x = -0.5;
      detail = "Bearish momentum";
    }

    add(
      "RSI (14)",
      x,
      `${detail} (${r[i].toFixed(1)})`
    );
  }

  /* MACD */

  if (mc.h[i] != null) {
    const bullish =
      mc.m[i] > mc.sig[i];

    add(
      "MACD",
      bullish ? 1 : -1,
      bullish
        ? "MACD above signal"
        : "MACD below signal"
    );
  }

  /* Bollinger */

  if (bb.u[i] != null) {
    const p = cl[i];

    let x;
    let detail;

    if (p >= bb.u[i]) {
      x = -1;
      detail = "At/above upper band";
    } else if (p <= bb.l[i]) {
      x = 1;
      detail = "At/below lower band";
    } else {
      x =
        -(
          (p - bb.mid[i]) /
          (bb.u[i] - bb.mid[i])
        ) * 0.5;

      detail =
        p > bb.mid[i]
          ? "Upper half"
          : "Lower half";
    }

    add(
      "Bollinger Bands",
      x,
      detail
    );
  }

  /* Stochastic */

  if (st.k[i] != null) {
    let x = 0;
    let detail = "Neutral";

    if (st.k[i] < 20) {
      x = 1;
      detail = "Oversold";
    } else if (st.k[i] > 80) {
      x = -1;
      detail = "Overbought";
    } else if (st.d[i] != null) {
      x =
        st.k[i] > st.d[i]
          ? 0.4
          : -0.4;

      detail =
        x > 0
          ? "%K above %D"
          : "%K below %D";
    }

    add(
      "Stochastic (14,3,3)",
      x,
      `${detail} (${st.k[i].toFixed(1)})`
    );
  }

  /* Composite */

  const score = Math.round(
    (v.reduce(
      (s, x) => s + x.val,
      0
    ) /
      (v.length || 1)) *
      100
  );

  let signal = "HOLD";

  if (score >= 40) {
    signal = "STRONG BUY";
  } else if (score >= 15) {
    signal = "BUY";
  } else if (score <= -40) {
    signal = "STRONG SELL";
  } else if (score <= -15) {
    signal = "SELL";
  }

  /* 5-minute trend */

  const five = aggregate5(c);

  const fcl = five.map(
    (x) => x.close
  );

  const fs20 = sma(fcl, 20);
  const fs50 = sma(fcl, 50);

  const fi = fcl.length - 1;

  const htf =
    fi >= 0 &&
    fs20[fi] != null &&
    fs50[fi] != null
      ? fs20[fi] > fs50[fi]
        ? "BULLISH"
        : "BEARISH"
      : "NEUTRAL";

  /* 1-minute trend */

  const slope =
    cl.length > 10 &&
    s20[i] != null
      ? s20[i] - s20[i - 10]
      : 0;

  const trend =
    s20[i] != null &&
    s50[i] != null
      ? s20[i] > s50[i] &&
        slope > 0
        ? "BULLISH"
        : s20[i] < s50[i] &&
            slope < 0
          ? "BEARISH"
          : "MIXED"
      : "NEUTRAL";

  /* Session */

  const session =
    sessionInfo();

  /* Actionable setup */

  const direction =
    signal.includes("BUY")
      ? "BUY"
      : signal.includes("SELL")
        ? "SELL"
        : "NONE";

  const trendCompatible =
    (
      signal.includes("BUY") &&
      htf !== "BEARISH"
    ) ||
    (
      signal.includes("SELL") &&
      htf !== "BULLISH"
    );

  const actionable =
    trendCompatible &&
    Math.abs(score) >= 25;

  /* Risk levels */

  const price = cl[i];

  const risk = Math.max(
    a[i] || 0,
    price * 0.0005
  );

  const sl =
    direction === "BUY"
      ? price - risk * 1.5
      : direction === "SELL"
        ? price + risk * 1.5
        : null;

  const tp1 =
    direction === "BUY"
      ? price + risk * 1.5
      : direction === "SELL"
        ? price - risk * 1.5
        : null;

  const tp2 =
    direction === "BUY"
      ? price + risk * 3
      : direction === "SELL"
        ? price - risk * 3
        : null;

  /* Confidence */

  const confidence = Math.min(
    99,
    Math.round(
      Math.abs(score) * 0.85 +
        (
          htf !== "NEUTRAL" &&
          (
            (htf === "BULLISH" &&
              trend === "BULLISH") ||
            (htf === "BEARISH" &&
              trend === "BEARISH")
          )
            ? 10
            : 0
        )
    )
  );

  return {
    votes: v,
    score,
    signal,
    price,

    ind: {
      s20: s20[i],
      s50: s50[i],
      rsi: r[i],
      macd: mc.h[i],
      atr: a[i],
      bbU: bb.u[i],
      bbL: bb.l[i],
      k: st.k[i],
      d: st.d[i],
    },

    trend,
    htf,
    session,
    actionable,
    direction,

    sl,
    tp1,
    tp2,

    confidence,

    series: {
      s20,
      s50,
      bb,
    },
  };
}

/* =========================================================
   COMPONENTS
========================================================= */

function Badge({ signal }) {
  const buy =
    signal.includes("BUY");

  const sell =
    signal.includes("SELL");

  const color = buy
    ? COLORS.buy
    : sell
      ? COLORS.sell
      : COLORS.dim;

  const Icon = buy
    ? TrendingUp
    : sell
      ? TrendingDown
      : Minus;

  return (
    <div
      className="badge"
      style={{
        color,
        borderColor: `${color}55`,
        background: `${color}14`,
      }}
    >
      <Icon size={18} />
      {signal}
    </div>
  );
}

function Gauge({ score }) {
  const x = Math.max(
    -100,
    Math.min(100, score)
  );

  const color =
    x > 15
      ? COLORS.buy
      : x < -15
        ? COLORS.sell
        : COLORS.dim;

  const deg = (x / 100) * 90;

  return (
    <div className="gauge">
      <svg viewBox="0 0 180 100">
        <path
          d="M10 95 A80 80 0 0 1 170 95"
          fill="none"
          stroke={COLORS.border}
          strokeWidth="10"
          strokeLinecap="round"
        />

        <path
          d="M10 95 A80 80 0 0 1 170 95"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${
            (Math.abs(deg) / 180) *
            251.2
          } 251.2`}
          strokeDashoffset="-125.6"
        />

        <line
          x1="90"
          y1="95"
          x2={
            90 +
            68 *
              Math.cos(
                (Math.PI *
                  (180 -
                    (deg + 90))) /
                  180
              )
          }
          y2={
            95 -
            68 *
              Math.sin(
                (Math.PI *
                  (180 -
                    (deg + 90))) /
                  180
              )
          }
          stroke={COLORS.gold}
          strokeWidth="2.5"
        />

        <circle
          cx="90"
          cy="95"
          r="5"
          fill={COLORS.gold}
        />
      </svg>

      <strong style={{ color }}>
        {x > 0 ? "+" : ""}
        {x}
      </strong>

      <small>
        CONFLUENCE SCORE
      </small>
    </div>
  );
}

function Indicator({ v }) {
  const color =
    v.val > 0.1
      ? COLORS.buy
      : v.val < -0.1
        ? COLORS.sell
        : COLORS.dim;

  return (
    <div className="indicator">
      <div>
        <b>{v.name}</b>

        <small>
          {v.detail}
        </small>
      </div>

      <span
        className="tag"
        style={{
          color,
          background: `${color}18`,
        }}
      >
        {v.val > 0.1
          ? "BULL"
          : v.val < -0.1
            ? "BEAR"
            : "FLAT"}
      </span>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [
    candles,
    setCandles,
  ] = useState([]);

  const [
    status,
    setStatus,
  ] = useState("loading");

  const [
    error,
    setError,
  ] = useState("");

  const [
    lastFetch,
    setLastFetch,
  ] = useState(null);

  const [
    running,
    setRunning,
  ] = useState(true);

  const [
    log,
    setLog,
  ] = useState([]);

  const [
    alerts,
    setAlerts,
  ] = useState(false);

  const last = useRef("HOLD");

  /* -------------------------------------------------------
     LOAD DATA
  ------------------------------------------------------- */

  const load = useCallback(
    async () => {
      try {
        setStatus("loading");

        const series =
          await fetchXauSeries();

        if (!series.length) {
          throw new Error(
            "Twelve Data returned no candles."
          );
        }

        setCandles(series);

        setStatus("ok");

        setError("");

        setLastFetch(
          Date.now()
        );
      } catch (e) {
        console.error(
          "XAUUSD load error:",
          e
        );

        setStatus("error");

        setError(
          e?.message ||
            "Failed to reach Twelve Data."
        );
      }
    },
    []
  );

  /* Initial load */

  useEffect(() => {
    load();
  }, [load]);

  /* Polling */

  useEffect(() => {
    if (!running) {
      return;
    }

    const id = setInterval(
      load,
      POLL_MS
    );

    return () =>
      clearInterval(id);
  }, [running, load]);

  /* -------------------------------------------------------
     CALCULATE SIGNAL
  ------------------------------------------------------- */

  const result = useMemo(
    () =>
      candles.length > 55
        ? compute(candles)
        : null,
    [candles]
  );

  /* -------------------------------------------------------
     SIGNAL LOG / ALERTS
  ------------------------------------------------------- */

  useEffect(() => {
    if (!result) {
      return;
    }

    if (
      result.signal !==
        last.current &&
      result.signal !== "HOLD"
    ) {
      setLog((previous) =>
        [
          {
            t: Date.now(),
            signal:
              result.signal,
            price:
              result.price,
            score:
              result.score,
          },
          ...previous,
        ].slice(0, 15)
      );

      if (
        alerts &&
        typeof Notification !==
          "undefined" &&
        Notification.permission ===
          "granted"
      ) {
        new Notification(
          `XAUUSD ${result.signal}`,
          {
            body: `Score ${result.score} at ${result.price.toFixed(
              2
            )}`,
          }
        );
      }
    }

    last.current =
      result.signal;
  }, [result, alerts]);

  /* -------------------------------------------------------
     CHART
  ------------------------------------------------------- */

  const chart = useMemo(
    () =>
      result
        ? candles.map((c, i) => ({
            time: c.time,
            close: c.close,
            sma20:
              result.series.s20[i],
            sma50:
              result.series.s50[i],
            upper:
              result.series.bb.u[i],
            lower:
              result.series.bb.l[i],
          }))
        : [],
    [candles, result]
  );

  /* -------------------------------------------------------
     PRICE
  ------------------------------------------------------- */

  const price =
    candles[candles.length - 1]
      ?.close;

  const prev =
    candles[candles.length - 2]
      ?.close ?? price;

  const change =
    price != null &&
    prev != null
      ? price - prev
      : 0;

  const pct =
    prev
      ? (change / prev) * 100
      : 0;

  const tradeColor =
    result?.direction === "BUY"
      ? COLORS.buy
      : result?.direction === "SELL"
        ? COLORS.sell
        : COLORS.dim;

  /* -------------------------------------------------------
     NOTIFICATION
  ------------------------------------------------------- */

  const enableAlerts =
    async () => {
      if (
        typeof Notification ===
        "undefined"
      ) {
        return;
      }

      if (
        Notification.permission ===
        "default"
      ) {
        await Notification.requestPermission();
      }

      setAlerts(
        Notification.permission ===
          "granted"
      );
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <style>{css}</style>

      <main>
        {/* HEADER */}

        <header className="top">
          <div className="brand">
            <div className="au">
              Au
            </div>

            <div>
              <div className="title">
                XAUUSD Signal Terminal
              </div>

              <div className="sub">
                {status ===
                "ok" ? (
                  <Wifi
                    size={12}
                    color={
                      COLORS.buy
                    }
                  />
                ) : (
                  <WifiOff
                    size={12}
                    color={
                      COLORS.sell
                    }
                  />
                )}

                Twelve Data ·{" "}
                {INTERVAL}

                {lastFetch
                  ? ` · updated ${new Date(
                      lastFetch
                    ).toLocaleTimeString()}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="actions">
            <button
              className="btn"
              onClick={
                enableAlerts
              }
            >
              {alerts ? (
                <Bell size={14} />
              ) : (
                <BellOff
                  size={14}
                />
              )}

              Alerts
            </button>

            <button
              className="btn"
              onClick={() =>
                setRunning(
                  (x) => !x
                )
              }
            >
              {running ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}

              {running
                ? "Pause"
                : "Resume"}
            </button>

            <button
              className="btn"
              onClick={load}
            >
              <RotateCcw
                size={14}
              />

              Refresh
            </button>
          </div>
        </header>

        {/* ERROR */}

        {status ===
          "error" && (
          <div className="error">
            <AlertTriangle
              size={18}
            />

            <div>
              <b>
                Twelve Data
                request failed
              </b>

              <p>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* LOADING */}

        {status ===
          "loading" &&
          candles.length ===
            0 && (
            <p className="loading">
              Loading live XAU/USD
              data…
            </p>
          )}

        {/* DATA */}

        {result && (
          <>
            {/* PRICE */}

            <section className="price">
              <strong className="priceNum">
                {price.toFixed(2)}
              </strong>

              <span
                className="change"
                style={{
                  color:
                    change >= 0
                      ? COLORS.buy
                      : COLORS.sell,
                }}
              >
                {change >= 0
                  ? "+"
                  : ""}
                {change.toFixed(
                  2
                )}{" "}
                (
                {pct >= 0
                  ? "+"
                  : ""}
                {pct.toFixed(
                  2
                )}
                %)
              </span>

              <Badge
                signal={
                  result.signal
                }
              />
            </section>

            {/* TRADE + TREND */}

            <div className="grid">
              <section className="panel">
                <div className="label">
                  TRADE SETUP
                </div>

                <div
                  className="sectionTitle"
                  style={{
                    color:
                      tradeColor,
                  }}
                >
                  {result.actionable
                    ? `${result.direction} SETUP`
                    : "NO-TRADE / WAIT"}
                </div>

                <div className="trade">
                  <div className="stat">
                    <small>
                      ENTRY
                    </small>
                    <strong>
                      {price.toFixed(
                        2
                      )}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      STOP LOSS
                    </small>
                    <strong>
                      {result.sl
                        ? result.sl.toFixed(
                            2
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      TAKE PROFIT 1
                    </small>
                    <strong>
                      {result.tp1
                        ? result.tp1.toFixed(
                            2
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      TAKE PROFIT 2
                    </small>
                    <strong>
                      {result.tp2
                        ? result.tp2.toFixed(
                            2
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      R:R
                    </small>
                    <strong>
                      1:1.5 / 1:3
                    </strong>
                  </div>

                  <div className="stat">
                    <small>
                      CONFIDENCE
                    </small>
                    <strong>
                      {
                        result.confidence
                      }
                      %
                    </strong>
                  </div>
                </div>

                <div className="session">
                  <span>
                    <span
                      className="dot"
                      style={{
                        background:
                          result
                            .session
                            .overlap
                            ? COLORS.buy
                            : result
                                .session
                                .london ||
                              result
                                .session
                                .ny
                            ? COLORS.orange
                            : COLORS.dim,
                      }}
                    />

                    {
                      result
                        .session
                        .label
                    }
                  </span>

                  <span>
                    {
                      result.htf
                    }{" "}
                    5m trend
                  </span>
                </div>

                <div className="notice">
                  Stops and targets
                  are ATR-based
                  reference levels
                  only. The app
                  does not place
                  trades.
                </div>
              </section>

              <section className="panel">
                <div className="label">
                  TREND FILTER
                </div>

                <div className="level">
                  <span>
                    1-minute trend
                  </span>

                  <strong
                    style={{
                      color:
                        result.trend ===
                        "BULLISH"
                          ? COLORS.buy
                          : result.trend ===
                              "BEARISH"
                            ? COLORS.sell
                            : COLORS.dim,
                    }}
                  >
                    {
                      result.trend
                    }
                  </strong>
                </div>

                <div className="level">
                  <span>
                    5-minute trend
                  </span>

                  <strong
                    style={{
                      color:
                        result.htf ===
                        "BULLISH"
                          ? COLORS.buy
                          : result.htf ===
                              "BEARISH"
                            ? COLORS.sell
                            : COLORS.dim,
                    }}
                  >
                    {
                      result.htf
                    }
                  </strong>
                </div>

                <div className="level">
                  <span>
                    Signal score
                  </span>

                  <strong>
                    {result.score >
                    0
                      ? "+"
                      : ""}
                    {
                      result.score
                    }
                  </strong>
                </div>

                <div className="level">
                  <span>
                    Signal confidence
                  </span>

                  <strong>
                    {
                      result.confidence
                    }
                    %
                  </strong>
                </div>

                <div className="level">
                  <span>
                    ATR (14)
                  </span>

                  <strong>
                    {result.ind
                      .atr?.toFixed(
                        2
                      )}
                  </strong>
                </div>
              </section>
            </div>

            {/* CHART */}

            <section className="panel chart">
              <div className="label">
                PRICE · SMA 20/50 ·
                BOLLINGER BANDS
              </div>

              <ResponsiveContainer
                width="100%"
                height={290}
              >
                <ComposedChart
                  data={chart}
                  margin={{
                    top: 5,
                    right: 15,
                    left: -10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke={
                      COLORS.border
                    }
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="time"
                    hide
                  />

                  <YAxis
                    domain={[
                      "auto",
                      "auto",
                    ]}
                    tick={{
                      fill:
                        COLORS.dim,
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#181C24",
                      border: `1px solid ${COLORS.border}`,
                    }}
                    formatter={(
                      v,
                      n
                    ) => [
                      typeof v ===
                      "number"
                        ? v.toFixed(
                            2
                          )
                        : v,
                      n,
                    ]}
                  />

                  <Area
                    dataKey="upper"
                    stroke="none"
                    fill={
                      COLORS.gold
                    }
                    fillOpacity={
                      0.04
                    }
                  />

                  <Line
                    dataKey="upper"
                    stroke={
                      COLORS.gold
                    }
                    strokeOpacity={
                      0.4
                    }
                    dot={false}
                  />

                  <Line
                    dataKey="lower"
                    stroke={
                      COLORS.gold
                    }
                    strokeOpacity={
                      0.4
                    }
                    dot={false}
                  />

                  <Line
                    dataKey="sma50"
                    stroke={
                      COLORS.dim
                    }
                    dot={false}
                  />

                  <Line
                    dataKey="sma20"
                    stroke={
                      COLORS.blue
                    }
                    dot={false}
                  />

                  <Line
                    dataKey="close"
                    stroke={
                      COLORS.gold
                    }
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </section>

            {/* INDICATORS */}

            <div className="grid">
              <section className="panel">
                <div className="label">
                  SIGNAL STRENGTH
                </div>

                <Gauge
                  score={
                    result.score
                  }
                />

                {result.votes.map(
                  (v) => (
                    <Indicator
                      key={
                        v.name
                      }
                      v={v}
                    />
                  )
                )}
              </section>

              {/* KEY LEVELS */}

              <section className="panel">
                <div className="label">
                  KEY LEVELS
                </div>

                {[
                  [
                    "RSI (14)",
                    result.ind.rsi?.toFixed(
                      2
                    ),
                  ],
                  [
                    "MACD Histogram",
                    result.ind.macd?.toFixed(
                      3
                    ),
                  ],
                  [
                    "ATR (14)",
                    result.ind.atr?.toFixed(
                      2
                    ),
                  ],
                  [
                    "Stoch %K / %D",
                    `${result.ind.k?.toFixed(
                      1
                    )} / ${result.ind.d?.toFixed(
                      1
                    )}`,
                  ],
                  [
                    "BB Upper",
                    result.ind.bbU?.toFixed(
                      2
                    ),
                  ],
                  [
                    "BB Lower",
                    result.ind.bbL?.toFixed(
                      2
                    ),
                  ],
                  [
                    "SMA 20 / 50",
                    `${result.ind.s20?.toFixed(
                      2
                    )} / ${result.ind.s50?.toFixed(
                      2
                    )}`,
                  ],
                ].map(
                  ([k, v]) => (
                    <div
                      className="level"
                      key={k}
                    >
                      <span>
                        {k}
                      </span>

                      <strong>
                        {v ??
                          "—"}
                      </strong>
                    </div>
                  )
                )}

                {/* SIGNAL LOG */}

                <div
                  className="label"
                  style={{
                    marginTop: 16,
                  }}
                >
                  SIGNAL LOG
                </div>

                {log.length ===
                0 ? (
                  <p className="muted">
                    No signal changes
                    yet — watching
                    the market.
                  </p>
                ) : (
                  log.map((x) => (
                    <div
                      className="log"
                      key={x.t}
                    >
                      <span
                        style={{
                          color:
                            x.signal.includes(
                              "BUY"
                            )
                              ? COLORS.buy
                              : COLORS.sell,
                          fontWeight: 800,
                        }}
                      >
                        {
                          x.signal
                        }
                      </span>

                      <small>
                        {x.price.toFixed(
                          2
                        )}{" "}
                        ·{" "}
                        {new Date(
                          x.t
                        ).toLocaleTimeString()}
                      </small>
                    </div>
                  ))
                )}
              </section>
            </div>
          </>
        )}

        {/* FOOTER */}

        <footer className="footer">
          Live XAU/USD data from
          Twelve Data. The dashboard
          is an analysis/study tool
          and does not place trades.
          Entry, stop-loss and
          take-profit levels are
          mathematical reference
          levels derived from current
          price and ATR.
        </footer>
      </main>
    </>
  );
}
