const ALLOWED_SYMBOLS = new Set(["XAU/USD"]);
const ALLOWED_INTERVALS = new Set(["1min", "5min", "15min", "30min", "1h", "4h"]);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      status: "error",
      message: "Server market-data key is not configured. Add TWELVE_DATA_API_KEY to the Vercel project environment variables.",
    });
  }

  const symbol = String(req.query?.symbol || "XAU/USD").trim();
  const interval = String(req.query?.interval || "1min").trim();
  const outputsizeRaw = Number(req.query?.outputsize || 150);
  const outputsize = Number.isFinite(outputsizeRaw)
    ? Math.max(30, Math.min(5000, Math.floor(outputsizeRaw)))
    : 150;

  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return res.status(400).json({ status: "error", message: "Unsupported symbol" });
  }

  if (!ALLOWED_INTERVALS.has(interval)) {
    return res.status(400).json({ status: "error", message: "Unsupported interval" });
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    const data = await upstream.json();

    if (!upstream.ok || data?.status === "error" || Number(data?.code) >= 400) {
      const status = upstream.status >= 400 ? upstream.status : 502;
      return res.status(status).json({
        status: "error",
        message: data?.message || "Twelve Data request failed",
      });
    }

    if (!Array.isArray(data?.values)) {
      return res.status(502).json({
        status: "error",
        message: "Twelve Data returned no time-series values",
      });
    }

    const values = data.values
      .map((v) => ({
        time: v.datetime,
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume == null ? null : Number(v.volume),
      }))
      .filter((v) =>
        [v.open, v.high, v.low, v.close].every(Number.isFinite)
      );

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=40");
    return res.status(200).json({
      status: "ok",
      meta: data.meta || { symbol, interval },
      values,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("market proxy error", error);
    return res.status(502).json({
      status: "error",
      message: "Unable to reach the market-data provider",
    });
  }
}
