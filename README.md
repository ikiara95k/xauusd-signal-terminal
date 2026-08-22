# XAUUSD Signal Terminal

React/Vite dashboard for XAU/USD market data with a server-side Twelve Data proxy, indicator calculations, charting, signal history, alerts, and stale-data protection.

## Required Vercel environment variable

Set this **server-side** variable in the Vercel project:

`TWELVE_DATA_API_KEY`

Do **not** use `VITE_TWELVE_DATA_API_KEY` for the provider credential. Vite exposes `VITE_*` variables to browser code at build time, so sensitive API keys should remain server-side.

## Run

```bash
npm install
npm run dev
```

The live market endpoint is `/api/market`. The production deployment is designed for Vercel/serverless functions.

## Build

```bash
npm run build
```

The dashboard refreshes every 30 seconds while polling is enabled. It also flags stale data rather than silently treating an old response as current.
