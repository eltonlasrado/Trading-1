import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Eye, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

export const Route = createFileRoute('/market-monitor')({
  component: MarketMonitor,
})

const newsPool = [
  'RBI keeps repo rate unchanged; focus on inflation target',
  'FII net buyers; ₹3,245 Cr equity inflow recorded today',
  'Nifty 50 consolidates near all-time high resistance',
  'Bank Nifty sees strong PUT writing at 56000 strike',
  'India VIX drops to 3-month low; signals calm markets',
  'Options expiry week begins; increased IV across strikes',
  'Crude oil at $83/bbl; positive for Indian current account',
  'IT sector rallies 2.1% on strong US tech earnings',
  'Midcap and Smallcap indices outperform benchmarks',
  'SEBI tightens F&O rules; impact on retail participation',
  'Q4 results season: Expectations high for banking sector',
  'DII continue buying in domestic equities; ₹2,100 Cr',
]

interface FIIDIIRow {
  date: string
  fiiBuy: number
  fiiSell: number
  fiiNet: number
  diiBuy: number
  diiSell: number
  diiNet: number
}

interface Mover {
  symbol: string
  price: number
  change: number
  pct: number
}

function generateFIIDII(): FIIDIIRow[] {
  const rows: FIIDIIRow[] = []
  const today = new Date()
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const fiiBuy = Math.round(4000 + Math.random() * 8000)
    const fiiSell = Math.round(3000 + Math.random() * 8000)
    const diiBuy = Math.round(2000 + Math.random() * 6000)
    const diiSell = Math.round(1500 + Math.random() * 5000)
    rows.push({
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      fiiBuy,
      fiiSell,
      fiiNet: fiiBuy - fiiSell,
      diiBuy,
      diiSell,
      diiNet: diiBuy - diiSell,
    })
  }
  return rows
}

const GAINERS_LOSERS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'LT', 'BAJFINANCE', 'WIPRO', 'TECHM', 'MARUTI', 'ULTRACEMCO', 'ASIANPAINT']

function generateMovers(): { gainers: Mover[]; losers: Mover[] } {
  const all = GAINERS_LOSERS.map((sym) => {
    const price = Math.round(500 + Math.random() * 3500)
    const pct = (Math.random() - 0.5) * 8
    return { symbol: sym, price, change: Math.round(price * pct / 100), pct: Math.round(pct * 100) / 100 }
  })
  all.sort((a, b) => b.pct - a.pct)
  return { gainers: all.slice(0, 5), losers: all.slice(-5).reverse() }
}

function MarketMonitor() {
  const [vix, setVix] = useState(14.2)
  const [pcr, setPcr] = useState({ NIFTY: 1.12, BANKNIFTY: 0.95, FINNIFTY: 1.08 })
  const [fiiDii, setFiiDii] = useState<FIIDIIRow[]>(generateFIIDII)
  const [breadth, setBreadth] = useState({ advances: 1245, declines: 542, unchanged: 73 })
  const [movers, setMovers] = useState(generateMovers)
  const [newsIdx, setNewsIdx] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const refresh = useCallback(() => {
    setVix(Math.round((12.5 + Math.random() * 6) * 100) / 100)
    setPcr({
      NIFTY: Math.round((0.75 + Math.random() * 0.7) * 100) / 100,
      BANKNIFTY: Math.round((0.7 + Math.random() * 0.7) * 100) / 100,
      FINNIFTY: Math.round((0.8 + Math.random() * 0.6) * 100) / 100,
    })
    setFiiDii(generateFIIDII())
    setBreadth({
      advances: Math.floor(800 + Math.random() * 800),
      declines: Math.floor(200 + Math.random() * 700),
      unchanged: Math.floor(40 + Math.random() * 120),
    })
    setMovers(generateMovers())
    setNewsIdx((i) => (i + 1) % newsPool.length)
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  const total = breadth.advances + breadth.declines + breadth.unchanged
  const advPct = Math.round((breadth.advances / total) * 100)
  const decPct = Math.round((breadth.declines / total) * 100)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          Market Monitor
        </h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {lastUpdate.toLocaleTimeString('en-IN')}
        </div>
      </div>

      {/* VIX + PCR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider">India VIX</div>
          <div className={`text-3xl font-bold mt-1 ${vix < 15 ? 'text-green-400' : vix < 20 ? 'text-yellow-400' : 'text-red-400'}`}>{vix}</div>
          <div className={`text-xs mt-1 ${vix < 15 ? 'text-green-600' : vix < 20 ? 'text-yellow-600' : 'text-red-600'}`}>
            {vix < 15 ? 'Low - Markets Calm' : vix < 20 ? 'Moderate Volatility' : 'High - Caution'}
          </div>
        </div>
        {Object.entries(pcr).map(([idx, val]) => (
          <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider">{idx} PCR</div>
            <div className={`text-3xl font-bold mt-1 ${val > 1.2 ? 'text-green-400' : val < 0.8 ? 'text-red-400' : 'text-yellow-400'}`}>{val}</div>
            <div className={`text-xs mt-1 ${val > 1.2 ? 'text-green-600' : val < 0.8 ? 'text-red-600' : 'text-yellow-600'}`}>
              {val > 1.2 ? 'Bullish (PUT heavy)' : val < 0.8 ? 'Bearish (CALL heavy)' : 'Neutral'}
            </div>
          </div>
        ))}
      </div>

      {/* Market Breadth */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Market Breadth (NSE)</h3>
        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{breadth.advances}</div>
            <div className="text-xs text-gray-500">Advances</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{breadth.declines}</div>
            <div className="text-xs text-gray-500">Declines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{breadth.unchanged}</div>
            <div className="text-xs text-gray-500">Unchanged</div>
          </div>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
          <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${advPct}%` }} />
          <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${decPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{advPct}% Advancing</span>
          <span>{decPct}% Declining</span>
        </div>
      </div>

      {/* FII/DII Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">FII / DII Activity (₹ Cr)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">FII Buy</th>
                <th className="text-right py-2">FII Sell</th>
                <th className="text-right py-2">FII Net</th>
                <th className="text-right py-2">DII Buy</th>
                <th className="text-right py-2">DII Sell</th>
                <th className="text-right py-2">DII Net</th>
              </tr>
            </thead>
            <tbody>
              {fiiDii.map((row) => (
                <tr key={row.date} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 text-gray-300">{row.date}</td>
                  <td className="py-2 text-right text-green-400">{row.fiiBuy.toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right text-red-400">{row.fiiSell.toLocaleString('en-IN')}</td>
                  <td className={`py-2 text-right font-medium ${row.fiiNet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {row.fiiNet > 0 ? '+' : ''}{row.fiiNet.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 text-right text-green-400">{row.diiBuy.toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right text-red-400">{row.diiSell.toLocaleString('en-IN')}</td>
                  <td className={`py-2 text-right font-medium ${row.diiNet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {row.diiNet > 0 ? '+' : ''}{row.diiNet.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gainers / Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Top Gainers</h3>
          <div className="space-y-2">
            {movers.gainers.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">{m.symbol}</span>
                <div className="text-right">
                  <span className="text-sm text-white">{m.price.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-green-400 ml-2">+{m.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-1"><TrendingDown className="w-4 h-4" /> Top Losers</h3>
          <div className="space-y-2">
            {movers.losers.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">{m.symbol}</span>
                <div className="text-right">
                  <span className="text-sm text-white">{m.price.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-red-400 ml-2">{m.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News Feed */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Market News</h3>
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((offset) => (
            <div key={offset} className="flex gap-3 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <p className="text-sm text-gray-300">{newsPool[(newsIdx + offset) % newsPool.length]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
