# TradeIQ Pro

An AI-powered trading platform for Indian markets (NSE/BSE) built with TanStack Start. Provides real-time analysis, option chain data, TradingView charts, and an AI assistant for F&O traders.

## Key Technologies

- **Framework**: TanStack Start (React 19, TanStack Router v1)
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4 (dark trading terminal theme)
- **AI**: Anthropic Claude via Netlify AI Gateway
- **Charts**: TradingView Advanced Charts widget
- **Deployment**: Netlify

## Features

- **AI Signals** — Technical indicator analysis (RSI, MACD, EMA, VWAP) with BUY/SELL/HOLD recommendations, entry/stoploss/target levels, auto-refreshing every 5 seconds
- **TradingView Charts** — Full-featured embedded charts with all indicators, multiple timeframes, for all major Indian indices
- **Option Chain** — Full option chain table with OI, IV, LTP; max pain calculation; live trade signal recommendations
- **Market Monitor** — India VIX, PCR ratios, FII/DII data, market breadth, news feed
- **File Analysis** — Detailed monthly expiry analysis for Nifty, BankNifty, Finnifty, Sensex, Midcap Select, Bankex with Greeks
- **AI Brain** — Chat interface powered by Claude AI for market questions

## Running Locally

```bash
npm install
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000) (or port 8888 via Netlify CLI).

### With Netlify CLI (recommended for full feature support including AI Gateway):

```bash
netlify dev
```

## Environment Variables

The AI Brain feature uses Netlify AI Gateway — no API keys needed when deployed on Netlify. For local development, set `ANTHROPIC_API_KEY` in a `.env` file.
