# XAUUSD Signal Terminal

React/Vite dashboard for live XAU/USD 1-minute data from Twelve Data with SMA/EMA, RSI, MACD, Bollinger Bands, Stochastic and a composite BUY/SELL/HOLD signal.

## Environment variable

Set `VITE_TWELVE_DATA_API_KEY` in the deployment environment. Never commit the API key to GitHub.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The dashboard polls every 30 seconds while polling is enabled.
