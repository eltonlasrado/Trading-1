// src/routes/api/option-chain.ts
// GET /api/option-chain?symbol=NIFTY&expiry=27-Mar-2025&type=index
// Supports: NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTYNXT50, and any F&O equity

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { nseGet } from '../../utils/nseApi'

function calcPCR(data: NseOCData[]): number {
  let totalPEOI = 0, totalCEOI = 0
  for (const row of data) {
    totalPEOI += row.PE?.openInterest ?? 0
    totalCEOI += row.CE?.openInterest ?? 0
  }
  return totalCEOI > 0 ? totalPEOI / totalCEOI : 1
}

function calcMaxPain(data: NseOCData[]): number {
  // Max pain = strike where total option buyer loss is maximum (writer profit max)
  const strikes = data.map((d) => d.strikePrice)
  let minLoss = Infinity, maxPainStrike = strikes[0] ?? 0

  for (const testStrike of strikes) {
    let totalLoss = 0
    for (const row of data) {
      const s = row.strikePrice
      if (row.CE?.openInterest) {
        const intrinsic = Math.max(0, s - testStrike)
        totalLoss += intrinsic * row.CE.openInterest
      }
      if (row.PE?.openInterest) {
        const intrinsic = Math.max(0, testStrike - s)
        totalLoss += intrinsic * row.PE.openInterest
      }
    }
    if (totalLoss < minLoss) { minLoss = totalLoss; maxPainStrike = testStrike }
  }
  return maxPainStrike
}

interface NSEOptionChain {
  records: {
    expiryDates: string[];
    data: NseOCData[];
    underlyingValue: number;
    timestamp: string;
  };
  filtered: {
    CE: { totOI: number; totVol: number };
    PE: { totOI: number; totVol: number };
    data: NseOCData[];
  };
}

interface NseOCData {
  strikePrice: number;
  expiryDate: string;
  CE?: {
    openInterest: number;
    changeinOpenInterest: number;
    impliedVolatility: number;
    lastPrice: number;
    change: number;
    pChange: number;
    totalTradedVolume: number;
    bidQty: number;
    bidprice: number;
    askQty: number;
    askPrice: number;
    underlyingValue: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
  PE?: {
    openInterest: number;
    changeinOpenInterest: number;
    impliedVolatility: number;
    lastPrice: number;
    change: number;
    pChange: number;
    totalTradedVolume: number;
    bidQty: number;
    bidprice: number;
    askQty: number;
    askPrice: number;
    underlyingValue: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
}

const NSE_INDEX_SYMBOLS = new Set([
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50',
  'SENSEX', 'BANKEX',
])

export const APIRoute = createAPIFileRoute('/api/option-chain')({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const symbol = (url.searchParams.get('symbol') ?? 'NIFTY').toUpperCase()
    const requestedExpiry = url.searchParams.get('expiry') ?? ''
    const strikes = parseInt(url.searchParams.get('strikes') ?? '20', 10) // number of strikes around ATM

    try {
      const isIndex = NSE_INDEX_SYMBOLS.has(symbol)

      // BSE indices use a different API (BSE doesn't provide free option chain, route through NSE equivalent)
      // SENSEX maps to BSE Sensex but NSE lists it as SENSEX
      const apiPath = isIndex
        ? `/api/option-chain-indices?symbol=${symbol}`
        : `/api/option-chain-equities?symbol=${symbol}`

      const raw = await nseGet<NSEOptionChain>(apiPath)

      const allExpiries = raw.records?.expiryDates ?? []
      const selectedExpiry = requestedExpiry && allExpiries.includes(requestedExpiry)
        ? requestedExpiry
        : allExpiries[0] ?? ''

      // Filter by expiry
      const allData: NseOCData[] = raw.records?.data ?? []
      const expiryData = allData.filter((d) => d.expiryDate === selectedExpiry)

      // Filter to N strikes around ATM
      const underlying = raw.records?.underlyingValue ?? 0
      const sorted = [...expiryData].sort((a, b) => a.strikePrice - b.strikePrice)
      let filteredData = sorted
      if (strikes > 0 && underlying > 0) {
        // Find ATM index
        const atmIdx = sorted.reduce((best, d, i) => {
          return Math.abs(d.strikePrice - underlying) < Math.abs(sorted[best].strikePrice - underlying)
            ? i : best
        }, 0)
        filteredData = sorted.slice(
          Math.max(0, atmIdx - strikes),
          Math.min(sorted.length, atmIdx + strikes + 1),
        )
      }

      const pcr = calcPCR(expiryData)
      const maxPain = calcMaxPain(expiryData)
      const totalCEOI = raw.filtered?.CE?.totOI ?? expiryData.reduce((s, d) => s + (d.CE?.openInterest ?? 0), 0)
      const totalPEOI = raw.filtered?.PE?.totOI ?? expiryData.reduce((s, d) => s + (d.PE?.openInterest ?? 0), 0)

      return json({
        ok: true,
        symbol,
        underlyingValue: underlying,
        expiryDates: allExpiries,
        selectedExpiry,
        data: filteredData,
        pcr,
        maxPain,
        totalCEOI,
        totalPEOI,
        timestamp: raw.records?.timestamp ?? new Date().toISOString(),
      })
    } catch (err) {
      console.error(`option-chain error [${symbol}]:`, err)
      return json(
        {
          ok: false,
          symbol,
          error: String(err),
          underlyingValue: 0,
          expiryDates: [],
          selectedExpiry: '',
          data: [],
          pcr: 1,
          maxPain: 0,
          totalCEOI: 0,
          totalPEOI: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }
  },
})
