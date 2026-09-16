# MT5 Demo Auto-Trader Connector

This connector is intentionally **demo/simulation only**. The EA does not contain broker-order execution code and will not place, modify, or close real MT5 orders.

## Architecture

`Vercel XAUUSD Signal Terminal` → `GET /api/mt5-signal` → `MT5 EA` → `virtual trade ledger`

The Vercel endpoint uses the existing server-side `TWELVE_DATA_API_KEY`; the key is never sent to MT5.

## Setup

1. Open **MetaTrader 5 desktop**. The Android MT5 app cannot run Expert Advisors.
2. Use a **demo account** for testing.
3. Open `File → Open Data Folder → MQL5 → Experts`.
4. Copy `XAUUSD_Demo_AutoTrader.mq5` into that folder.
5. Open MetaEditor, compile the EA, and attach it to your broker's XAUUSD chart.
6. In MT5 go to `Tools → Options → Expert Advisors` and add this exact URL to **Allow WebRequest for listed URL**:
   `https://xauusd-signal-terminal-411paw7gw-ikiara.vercel.app`
7. Enable AutoTrading in MT5 only for the purpose of running the EA's simulation. The EA itself has no order-placement function.
8. Watch the **Experts** and **Journal** tabs for `DEMO SIGNAL`, `DEMO OPEN`, and `DEMO CLOSE` messages.

## Safety checks built in

- Server response must contain `mode: DEMO_ONLY`.
- Signals older than `MaxSignalAgeSeconds` are rejected.
- Duplicate signal IDs are ignored.
- Only BUY/SELL signals marked actionable by the endpoint can create virtual positions.
- There is no `OrderSend`, `CTrade.Buy`, `CTrade.Sell`, or other broker-order call in the EA.
- The endpoint is read-only from the EA's perspective.

## Endpoint

Open the following in a browser after deployment to verify the JSON response:

`https://xauusd-signal-terminal-411paw7gw-ikiara.vercel.app/api/mt5-signal`

A healthy response includes `status: ok`, `mode: DEMO_ONLY`, `symbol: XAU/USD`, `direction`, `price`, `sl`, `tp2`, `id`, and `ageSeconds`.

## Notes

The server-side signal calculation is kept lightweight and uses the same broad indicator family as the terminal (SMA, EMA, RSI, ATR). The EA's purpose here is integration testing and paper-trade simulation, not financial advice or live execution.
