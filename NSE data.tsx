// src/routes/api/news.ts
// GET /api/news?symbol=NIFTY (optional symbol filter)
// Returns live market news from NSE announcements + financial news RSS

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { nseGet } from '../../utils/nseApi'

interface NseAnnouncement {
  symbol?: string;
  sm_name?: string;
  an_dt?: string;
  subject?: string;
  desc?: string;
  attchmntFile?: string;
  id?: string;
}

interface NseMarketActivity {
  topGainers?: Array<{ symbol: string; lastPrice: number; pChange: number }>;
  topLosers?: Array<{ symbol: string; lastPrice: number; pChange: number }>;
  oiGainers?: Array<{ symbol: string; openInterest: number; oiChange: number }>;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  symbol?: string;
  category: 'announcement' | 'market' | 'macro' | 'sector';
  url?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positive = ['gain', 'rise', 'rally', 'surge', 'growth', 'profit', 'beat', 'record', 'high', 'up', 'positive', 'strong', 'upgrade', 'buy', 'outperform', 'dividend', 'bonus']
  const negative = ['fall', 'drop', 'decline', 'loss', 'miss', 'low', 'down', 'negative', 'weak', 'downgrade', 'sell', 'underperform', 'concern', 'risk', 'bearish', 'warning']
  const lower = text.toLowerCase()
  const posScore = positive.filter((w) => lower.includes(w)).length
  const negScore = negative.filter((w) => lower.includes(w)).length
  if (posScore > negScore) return 'positive'
  if (negScore > posScore) return 'negative'
  return 'neutral'
}

export const APIRoute = createAPIFileRoute('/api/news')({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const symbol = url.searchParams.get('symbol')?.toUpperCase()

    const news: NewsItem[] = []

    // 1. NSE Corporate Announcements
    try {
      const announcementPath = symbol && symbol !== 'NIFTY' && symbol !== 'BANKNIFTY'
        ? `/api/quote-equity?symbol=${symbol}&section=announcements`
        : '/api/corporatecalendar'

      const annRes = await nseGet<{ data?: NseAnnouncement[] }>(announcementPath)
      const announcements = annRes?.data ?? []

      for (const a of announcements.slice(0, 15)) {
        const title = a.subject ?? a.desc ?? 'Corporate Announcement'
        news.push({
          id: a.id ?? `ann-${Date.now()}-${Math.random()}`,
          title: title.substring(0, 150),
          summary: (a.desc ?? title).substring(0, 300),
          source: 'NSE Announcements',
          time: a.an_dt ? new Date(a.an_dt).toISOString() : new Date().toISOString(),
          symbol: a.symbol ?? a.sm_name,
          category: 'announcement',
          url: a.attchmntFile ? `https://www.nseindia.com${a.attchmntFile}` : undefined,
          sentiment: detectSentiment(title),
        })
      }
    } catch { /* ignore */ }

    // 2. NSE Market Activity (top gainers/losers as news context)
    try {
      const [gainers, losers, oiGainers] = await Promise.allSettled([
        nseGet<NseMarketActivity>('/api/live-analysis-variations?index=gainers&type=securities&category=FO'),
        nseGet<NseMarketActivity>('/api/live-analysis-variations?index=loosers&type=securities&category=FO'),
        nseGet<NseMarketActivity>('/api/live-analysis-oi-spurts-contracts'),
      ])

      if (gainers.status === 'fulfilled') {
        const top = (gainers.value as { data?: Array<{ symbol: string; lastPrice: number; pChange: number; tradedQuantity?: number }> }).data?.slice(0, 5) ?? []
        if (top.length > 0) {
          const names = top.map((s) => `${s.symbol} (+${s.pChange?.toFixed(2)}%)`).join(', ')
          news.push({
            id: `gainers-${Date.now()}`,
            title: `F&O Top Gainers: ${names}`,
            summary: `Top performing F&O stocks: ${top.map((s) => `${s.symbol} at ₹${s.lastPrice} (+${s.pChange?.toFixed(2)}%)`).join('; ')}`,
            source: 'NSE Live',
            time: new Date().toISOString(),
            category: 'market',
            sentiment: 'positive',
          })
        }
      }

      if (losers.status === 'fulfilled') {
        const top = (losers.value as { data?: Array<{ symbol: string; lastPrice: number; pChange: number }> }).data?.slice(0, 5) ?? []
        if (top.length > 0) {
          const names = top.map((s) => `${s.symbol} (${s.pChange?.toFixed(2)}%)`).join(', ')
          news.push({
            id: `losers-${Date.now()}`,
            title: `F&O Top Losers: ${names}`,
            summary: `Underperforming F&O stocks: ${top.map((s) => `${s.symbol} at ₹${s.lastPrice} (${s.pChange?.toFixed(2)}%)`).join('; ')}`,
            source: 'NSE Live',
            time: new Date().toISOString(),
            category: 'market',
            sentiment: 'negative',
          })
        }
      }

      if (oiGainers.status === 'fulfilled') {
        const data = oiGainers.value as { data?: Array<{ symbol: string; openInterest: number; changeinOpenInterest: number; pChange: number }> }
        const top = data.data?.slice(0, 5) ?? []
        if (top.length > 0) {
          const names = top.map((s) => `${s.symbol} (+${s.changeinOpenInterest?.toFixed(0)})`).join(', ')
          news.push({
            id: `oi-${Date.now()}`,
            title: `High OI Build-up: ${names}`,
            summary: `Stocks with significant open interest build-up (potential trending): ${top.map((s) => `${s.symbol} OI: ${s.openInterest?.toLocaleString()}`).join('; ')}`,
            source: 'NSE OI Analysis',
            time: new Date().toISOString(),
            category: 'market',
            sentiment: 'neutral',
          })
        }
      }
    } catch { /* ignore */ }

    // 3. Macro news from NSE market overview
    try {
      const marketNews = await nseGet<{ data?: Array<{ newsHeadLine?: string; newsBody?: string; newsDate?: string; newsSource?: string }> }>('/api/market-news')
      for (const n of marketNews?.data?.slice(0, 10) ?? []) {
        news.push({
          id: `mnews-${Date.now()}-${Math.random()}`,
          title: (n.newsHeadLine ?? '').substring(0, 150),
          summary: (n.newsBody ?? n.newsHeadLine ?? '').substring(0, 300),
          source: n.newsSource ?? 'NSE Market News',
          time: n.newsDate ? new Date(n.newsDate).toISOString() : new Date().toISOString(),
          category: 'macro',
          sentiment: detectSentiment(n.newsHeadLine ?? ''),
        })
      }
    } catch { /* ignore */ }

    // Sort by time (newest first)
    news.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    // Deduplicate by title prefix
    const seen = new Set<string>()
    const dedupedNews = news.filter((n) => {
      const key = n.title.substring(0, 50).toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return json({
      ok: true,
      count: dedupedNews.length,
      news: dedupedNews,
      timestamp: new Date().toISOString(),
    })
  },
})
