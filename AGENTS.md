# AGENTS.md

Project architecture overview for AI agents working on TradeIQ Pro.

## Project Overview

AI-powered Indian stock market trading platform for F&O traders. Built with TanStack Start on Netlify. Provides real-time technical analysis, option chain data, TradingView charts, and Claude AI-assisted trading insights for NSE/BSE markets.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 (dark trading terminal theme) |
| AI | Anthropic Claude via Netlify AI Gateway |
| Charts | TradingView Advanced Charts widget |
| Language | TypeScript 5.7 (strict mode) |
| Deployment | Netlify |

## Directory Structure

```
src/
├── routes/
│   ├── __root.tsx          # Root layout: dark sidebar nav, IST clock, Markets Live indicator
│   ├── index.tsx           # Dashboard: 6 index cards, VIX, news ticker, quick nav links
│   ├── ai-signals.tsx      # AI Signal analysis: RSI/MACD/EMA/VWAP + BUY/SELL/HOLD signals
│   ├── trading-view.tsx    # TradingView charts with symbol/interval/type selectors
│   ├── option-chain.tsx    # Option chain table, max pain, support/resistance, trade signals
│   ├── market-monitor.tsx  # VIX, PCR ratios, FII/DII data, market breadth, news feed
│   ├── file-analysis.tsx   # Monthly expiry analysis for all major indices with Greeks
│   ├── ai-brain.tsx        # AI chat interface (calls /api/ai-chat)
│   └── api/
│       ├── ai-chat.ts      # POST /api/ai-chat → claude-haiku-4-5 via Netlify AI Gateway
│       ├── option-chain.ts # GET /api/option-chain?symbol=X → NSE proxy with cookie handling
│       └── market-data.ts  # GET /api/market-data → VIX/PCR/FII/DII data
├── components/
│   └── TradingViewWidget.tsx  # Embeds TradingView Advanced Charts; dynamically loads tv.js
├── utils/
│   ├── indicators.ts       # RSI, EMA, MACD, VWAP calculations + generateSignal()
│   └── marketData.ts       # OHLCV generator, index spot prices, option chain data generator
└── styles.css              # Tailwind 4 import + base body styling
```

## Key Conventions

### Data Refresh
All live data components use `useEffect` + `setInterval` at 5-second intervals:
```ts
useEffect(() => {
  refresh()
  const id = setInterval(refresh, 5000)
  return () => clearInterval(id)
}, [refresh])
```

### Signal Objects
`generateSignal()` in `indicators.ts` always returns a fully typed object — never undefined. Entry/stopLoss/target in `ai-signals.tsx` are always computed from the signal, avoiding runtime undefined errors.

### TradingView Widget
`TradingViewWidget.tsx` dynamically loads `https://s3.tradingview.com/tv.js` and initializes `new window.TradingView.widget({...})`. Container div gets a random unique `id` per mount to avoid conflicts when switching symbols.

### NSE Option Chain Proxy
`src/routes/api/option-chain.ts` proxies NSE India by fetching the homepage first (to get cookies), then using those cookies to fetch the option chain API. The client (`option-chain.tsx`) always falls back to `generateOptionChainData()` on API failure — no broken error state.

### Styling
Dark trading terminal: `bg-gray-950` base, `bg-gray-900` cards, `border-gray-800` borders. Green = bullish/BUY, Red = bearish/SELL, Yellow/Amber = neutral/HOLD.

### AI Gateway
`/api/ai-chat` uses `@anthropic-ai/sdk` with `claude-haiku-4-5`. Netlify auto-injects `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` in deployed environments. Set `ANTHROPIC_API_KEY` locally in `.env` for dev.

### Index Coverage
NIFTY (~23897), BANKNIFTY (~56089), FINNIFTY (~26141), SENSEX (~76664), MIDCPNIFTY (~12500), BANKEX (~56500). Monthly expiry = last Thursday of current month.

## Development Commands

```bash
npm run dev      # Vite dev server on port 3000
netlify dev      # Netlify CLI dev on port 8888 (enables AI Gateway locally)
npm run build    # Production build
```
