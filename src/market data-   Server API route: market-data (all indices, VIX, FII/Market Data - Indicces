// src/routes/api/market-data.ts
// GET /api/market-data
// Returns: all indices, India VIX, FII/DII, market status

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { nseGet } from '../../utils/nseApi'

interface NseIndex {
  index: string;
  indexSymbol: string;
  last: number;
  variation: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  perChange365d: number;
  perChange30d: number;
  pe?: number;
  pb?: number;
  dy?: number;
}

interface NseFiiDii {
  date: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  clientType: string;
}

export const APIRoute = createAPIFileRoute('/api/market-data')({
  GET: async () => {
    try {
      // Fetch all indices from NSE
      const [allIndicesRes, fiiRes, statusRes] = await Promise.allSettled([
        nseGet<{ data: NseIndex[] }>('/api/allIndices'),
        nseGet<NseFiiDii[]>('/api/fiidiiTradeReact'),
        nseGet<{ marketState: Array<{ market: string; marketStatus: string; tradeDate: string }> }>('/api/marketStatus'),
      ])

      // Process indices
      let indices: NseIndex[] = []
      if (allIndicesRes.status === 'fulfilled') {
        indices = allIndicesRes.value.data ?? []
      }

      // Find VIX
      const vixEntry = indices.find(
        (i) => i.index === 'India VIX' || i.indexSymbol === 'INDIAVIX',
      )
      const indiaVix = vixEntry?.last ?? null

      // Key indices with their NSE names
      const indexMap: Record<string, string> = {
        NIFTY: 'NIFTY 50',
        BANKNIFTY: 'NIFTY BANK',
        FINNIFTY: 'NIFTY FIN SERVICE',
        MIDCPNIFTY: 'NIFTY MIDCAP SELECT',
        NIFTYNXT50: 'NIFTY NEXT 50',
        NIFTYIT: 'NIFTY IT',
        NIFTYPHARMA: 'NIFTY PHARMA',
        NIFTYAUTO: 'NIFTY AUTO',
        NIFTYMETAL: 'NIFTY METAL',
        NIFTYREALTY: 'NIFTY REALTY',
        NIFTYFMCG: 'NIFTY FMCG',
        NIFTYINFRA: 'NIFTY INFRA',
        NIFTYENERGY: 'NIFTY ENERGY',
        NIFTY100: 'NIFTY 100',
        NIFTY200: 'NIFTY 200',
        NIFTY500: 'NIFTY 500',
        NIFTYSMALLCAP250: 'NIFTY SMALLCAP 250',
        NIFTYMIDCAP150: 'NIFTY MIDCAP 150',
      }

      const indexData: Record<string, NseIndex | undefined> = {}
      for (const [sym, nseName] of Object.entries(indexMap)) {
        indexData[sym] = indices.find(
          (i) => i.index === nseName || i.indexSymbol?.includes(sym),
        )
      }

      // All indices for full list
      const allFormattedIndices = indices
        .filter((i) => i.index !== 'India VIX')
        .map((i) => ({
          symbol: i.indexSymbol ?? i.index,
          name: i.index,
          last: i.last,
          change: i.variation,
          pChange: i.percentChange,
          open: i.open,
          high: i.high,
          low: i.low,
          previousClose: i.previousClose,
          yearHigh: i.yearHigh,
          yearLow: i.yearLow,
          perChange365d: i.perChange365d,
          perChange30d: i.perChange30d,
        }))

      // Process FII/DII
      let fiiDii: unknown[] = []
      if (fiiRes.status === 'fulfilled') {
        const raw = Array.isArray(fiiRes.value) ? fiiRes.value : []
        // NSE returns FII and DII rows for each date
        const dateMap: Record<string, { fii?: NseFiiDii; dii?: NseFiiDii }> = {}
        for (const row of raw) {
          if (!dateMap[row.date]) dateMap[row.date] = {}
          if (row.clientType === 'FII/FPI') dateMap[row.date].fii = row
          if (row.clientType === 'DII') dateMap[row.date].dii = row
        }
        fiiDii = Object.entries(dateMap)
          .slice(0, 10)
          .map(([date, { fii, dii }]) => ({
            date,
            fiiBuy: fii?.buyValue ?? 0,
            fiiSell: fii?.sellValue ?? 0,
            fiiNet: fii?.netValue ?? 0,
            diiBuy: dii?.buyValue ?? 0,
            diiSell: dii?.sellValue ?? 0,
            diiNet: dii?.netValue ?? 0,
          }))
      }

      // Market status
      let marketStatus: unknown = {}
      if (statusRes.status === 'fulfilled') {
        marketStatus = statusRes.value?.marketState?.[0] ?? {}
      }

      return json({
        ok: true,
        timestamp: new Date().toISOString(),
        indiaVix,
        allIndices: allFormattedIndices,
        indexData,
        fiiDii,
        marketStatus,
      })
    } catch (err) {
      console.error('market-data error:', err)
      return json(
        { ok: false, error: String(err), timestamp: new Date().toISOString() },
        { status: 500 },
      )
    }
  },
})
