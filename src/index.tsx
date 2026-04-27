// src/routes/index.tsx
// Dashboard: live index cards, India VIX, FII/DII mini chart, news ticker

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'

interface IndexCard {
  symbol: string; name: string; last: number; change: number; pChange: number;
  high: number; low: number; open: number; previousClose: number;
  yearHigh: number; yearLow: number;
}

interface FiiDii {
  date: string; fiiNet: number; diiNet: number;
  fiiBuy: number; fiiSell: number; diiBuy: number; diiSell: number;
}

function fmt(n: number, dec = 2) {
  return n?.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) ?? '—'
}

function PriceChange({ change, pChange }: { change: number; pChange: number }) {
  const up = change >= 0
  return (
    <span className={up ? 'text-green-400' : 'text-red-400'}>
      {up ? '+' : ''}{fmt(change)} ({up ? '+' : ''}{fmt(pChange)}%)
    </span>
  )
}

function IndexCard({ idx }: { idx: IndexCard }) {
  const up = idx.change >= 0
  return (
    <div className={`bg-gray-900 border rounded-lg p-4 ${up ? 'border-green-800' : 'border-red-800'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase">{idx.symbol}</div>
          <div className="text-sm text-gray-300 font-medium">{idx.name}</div>
        </div>
        <div className={`text-xs px-2 py-0.5 rounded font-bold ${up ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {up ? '▲' : '▼'}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">₹{fmt(idx.last)}</div>
      <div className="text-sm mb-2"><PriceChange change={idx.change} pChange={idx.pChange} /></div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
        <span>O: <span className="text-gray-300">{fmt(idx.open)}</span></span>
        <span>H: <span className="text-green-300">{fmt(idx.high)}</span></span>
        <span>L: <span className="text-red-300">{fmt(idx.low)}</span></span>
        <span>PC: <span className="text-gray-300">{fmt(idx.previousClose)}</span></span>
        <span>52W H: <span className="text-green-300">{fmt(idx.yearHigh)}</span></span>
        <span>52W L: <span className="text-red-300">{fmt(idx.yearLow)}</span></span>
      </div>
    </div>
  )
}

const KEY_SYMBOLS = ['NIFTY 50', 'NIFTY BANK', 'NIFTY FIN SERVICE', 'NIFTY MIDCAP SELECT',
  'NIFTY NEXT 50', 'NIFTY IT', 'NIFTY PHARMA', 'NIFTY AUTO', 'NIFTY METAL', 'NIFTY REALTY',
  'NIFTY FMCG', 'NIFTY ENERGY', 'S&P BSE SENSEX', 'S&P BSE BANKEX']

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [indices, setIndices] = useState<IndexCard[]>([])
  const [vix, setVix] = useState<number | null>(null)
  const [fiiDii, setFiiDii] = useState<FiiDii[]>([])
  const [news, setNews] = useState<Array<{ title: string; source: string; sentiment: string }>>([])
  const [lastUpdate, setLastUpdate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [mdRes, newsRes] = await Promise.all([
        fetch('/api/market-data'),
        fetch('/api/news'),
      ])
      const md = await mdRes.json()
      const newsData = await newsRes.json()

      if (md.ok) {
        const all: IndexCard[] = (md.allIndices ?? []).filter((i: IndexCard & { name: string }) =>
          KEY_SYMBOLS.includes(i.name)
        )
        setIndices(all)
        setVix(md.indiaVix)
        setFiiDii(md.fiiDii ?? [])
        setLastUpdate(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
        setError('')
      }

      if (newsData.ok) {
        setNews(newsData.news?.slice(0, 20) ?? [])
      }
    } catch (e) {
      setError('Failed to fetch market data. Retrying...')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 2000)
    return () => clearInterval(id)
  }, [fetchData])

  const todayFii = fiiDii[0]

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Market Dashboard</h1>
          <p className="text-xs text-gray-500">Live NSE/BSE data • Auto-refresh every 2s</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {vix !== null && (
            <div className={`px-3 py-1.5 rounded font-bold text-sm ${vix < 15 ? 'bg-green-900 text-green-300' : vix < 20 ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
              India VIX: {fmt(vix)}
            </div>
          )}
          <span>Updated: {lastUpdate}</span>
          {error && <span className="text-red-400">{error}</span>}
        </div>
      </div>

      {/* News Ticker */}
      {news.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2 mb-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-400 whitespace-nowrap">📰 LIVE</span>
            <div className="overflow-hidden flex-1">
              <div className="animate-ticker flex gap-8 text-xs text-gray-300">
                {[...news, ...news].map((n, i) => (
                  <span key={i} className={`whitespace-nowrap ${n.sentiment === 'positive' ? 'text-green-300' : n.sentiment === 'negative' ? 'text-red-300' : 'text-gray-300'}`}>
                    {n.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <div>Loading live market data...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Index Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
            {indices.map((idx) => <IndexCard key={idx.name} idx={idx} />)}
          </div>

          {/* FII/DII Summary */}
          {todayFii && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2 font-medium">FII Activity (Today)</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Buy</div>
                    <div className="text-green-400 font-bold">₹{fmt(todayFii.fiiBuy / 100, 0)} Cr</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Sell</div>
                    <div className="text-red-400 font-bold">₹{fmt(todayFii.fiiSell / 100, 0)} Cr</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Net</div>
                    <div className={`font-bold ${todayFii.fiiNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{fmt(todayFii.fiiNet / 100, 0)} Cr
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2 font-medium">DII Activity (Today)</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Buy</div>
                    <div className="text-green-400 font-bold">₹{fmt(todayFii.diiBuy / 100, 0)} Cr</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Sell</div>
                    <div className="text-red-400 font-bold">₹{fmt(todayFii.diiSell / 100, 0)} Cr</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Net</div>
                    <div className={`font-bold ${todayFii.diiNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{fmt(todayFii.diiNet / 100, 0)} Cr
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FII/DII History Table */}
          {fiiDii.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">FII / DII Flow (Last 10 Days)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-1.5 pr-4">Date</th>
                      <th className="text-right pr-4">FII Buy (Cr)</th>
                      <th className="text-right pr-4">FII Sell (Cr)</th>
                      <th className="text-right pr-4">FII Net (Cr)</th>
                      <th className="text-right pr-4">DII Buy (Cr)</th>
                      <th className="text-right pr-4">DII Sell (Cr)</th>
                      <th className="text-right">DII Net (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiiDii.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-1.5 pr-4 text-gray-300">{row.date}</td>
                        <td className="text-right pr-4 text-green-300">{fmt(row.fiiBuy / 100, 0)}</td>
                        <td className="text-right pr-4 text-red-300">{fmt(row.fiiSell / 100, 0)}</td>
                        <td className={`text-right pr-4 font-bold ${row.fiiNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {row.fiiNet >= 0 ? '+' : ''}{fmt(row.fiiNet / 100, 0)}
                        </td>
                        <td className="text-right pr-4 text-green-300">{fmt(row.diiBuy / 100, 0)}</td>
                        <td className="text-right pr-4 text-red-300">{fmt(row.diiSell / 100, 0)}</td>
                        <td className={`text-right font-bold ${row.diiNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {row.diiNet >= 0 ? '+' : ''}{fmt(row.diiNet / 100, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/ai-signals', icon: '🤖', label: 'AI Signals', desc: 'Buy/Sell signals for all stocks' },
              { to: '/option-chain', icon: '⛓', label: 'Option Chain', desc: 'Live OI, PCR, Max Pain' },
              { to: '/file-analysis', icon: '📁', label: 'Expiry Analysis', desc: 'All indices + stocks with Greeks' },
            ].map((link) => (
              <a key={link.to} href={link.to} className="bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-lg p-4 transition-colors">
                <div className="text-2xl mb-1">{link.icon}</div>
                <div className="text-sm font-semibold text-white">{link.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{link.desc}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
