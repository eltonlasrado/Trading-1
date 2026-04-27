// src/routes/api/stock-quote.ts
// GET /api/stock-quote?symbol=RELIANCE
// Returns OHLCV and basic fundamentals for any NSE equity

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { nseGet } from '../../utils/nseApi'

interface NSEQuoteEquity {
  info: {
    symbol: string;
    companyName: string;
    series: string;
    isin: string;
    industry: string;
    activeSeries: string[];
  };
  priceInfo: {
    lastPrice: number;
    change: number;
    pChange: number;
    open: number;
    close: number;
    previousClose: number;
    intraDayHighLow: { min: number; max: number };
    weekHighLow: { min: number; max: number; minDate: string; maxDate: string };
    vwap: number;
    totalTradedVolume: number;
    totalTradedValue: number;
  };
  industryInfo: {
    macro: string;
    sector: string;
    industry: string;
    basicIndustry: string;
  };
  metadata: {
    pdSectorPe: number;
    pdSymbolPe: number;
    pdSectorPb: number;
    pdSymbolPb?: number;
    pdSectorInd?: string;
  };
}

interface NSEHistoricalData {
  data: Array<{
    CH_TIMESTAMP: string;
    CH_OPENING_PRICE: number;
    CH_TRADE_HIGH_PRICE: number;
    CH_TRADE_LOW_PRICE: number;
    CH_CLOSING_PRICE: number;
    CH_TOT_TRADED_QTY: number;
  }>;
}

export const APIRoute = createAPIFileRoute('/api/stock-quote')({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const symbol = (url.searchParams.get('symbol') ?? '').toUpperCase()
    if (!symbol) return json({ ok: false, error: 'symbol required' }, { status: 400 })

    try {
      const [quoteRes, histRes] = await Promise.allSettled([
        nseGet<NSEQuoteEquity>(`/api/quote-equity?symbol=${encodeURIComponent(symbol)}&series=EQ`),
        nseGet<NSEHistoricalData>(
          `/api/historical/cm/equity?symbol=${encodeURIComponent(symbol)}&series=["EQ"]&from=${getPastDate(60)}&to=${getToday()}&csv=false`,
        ),
      ])

      let quote: Partial<NSEQuoteEquity> = {}
      if (quoteRes.status === 'fulfilled') quote = quoteRes.value

      const priceHistory: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> = []
      if (histRes.status === 'fulfilled') {
        for (const row of histRes.value.data ?? []) {
          priceHistory.push({
            date: row.CH_TIMESTAMP,
            open: row.CH_OPENING_PRICE,
            high: row.CH_TRADE_HIGH_PRICE,
            low: row.CH_TRADE_LOW_PRICE,
            close: row.CH_CLOSING_PRICE,
            volume: row.CH_TOT_TRADED_QTY,
          })
        }
      }

      return json({
        ok: true,
        symbol,
        companyName: quote.info?.companyName ?? symbol,
        sector: quote.industryInfo?.sector ?? '',
        industry: quote.industryInfo?.industry ?? '',
        lastPrice: quote.priceInfo?.lastPrice ?? 0,
        change: quote.priceInfo?.change ?? 0,
        pChange: quote.priceInfo?.pChange ?? 0,
        open: quote.priceInfo?.open ?? 0,
        close: quote.priceInfo?.close ?? 0,
        previousClose: quote.priceInfo?.previousClose ?? 0,
        high: quote.priceInfo?.intraDayHighLow?.max ?? 0,
        low: quote.priceInfo?.intraDayHighLow?.min ?? 0,
        yearHigh: quote.priceInfo?.weekHighLow?.max ?? 0,
        yearLow: quote.priceInfo?.weekHighLow?.min ?? 0,
        vwap: quote.priceInfo?.vwap ?? 0,
        volume: quote.priceInfo?.totalTradedVolume ?? 0,
        pe: quote.metadata?.pdSymbolPe ?? 0,
        sectorPe: quote.metadata?.pdSectorPe ?? 0,
        priceHistory,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      console.error(`stock-quote error [${symbol}]:`, err)
      return json({ ok: false, error: String(err), symbol }, { status: 500 })
    }
  },
})

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getPastDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
