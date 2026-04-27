import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap, BarChart2, Link2, Eye, Brain, FileBarChart } from 'lucide-react'
import { getIndexSpotPrices } from '@/utils/marketData'

export const Route = createFileRoute('/')({
  component: Home,
})

const indexSymbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY', 'BANKEX']

const newsItems = [
  'RBI holds repo rate steady at 6.5%; markets react positively',
  'FII net buyers in equity segment; ₹2,340 Cr inflow today',
  'Nifty IT index surges 1.8% on strong quarterly results',
  'Bank Nifty tests key resistance at 56500 level',
  'India VIX falls to 13.8; signals reduced market volatility',
  'Options expiry week: Max pain at 23800 for Nifty',
  'Crude oil softens; positive for Indian markets',
  'Midcap index outperforms benchmarks for 3rd consecutive session',
]

const quickLinks = [
  { to: '/ai-signals', label: 'AI Signals', icon: Zap, desc: 'Real-time trade signals', color: 'text-yellow-400' },
  { to: '/trading-view', label: 'Live Charts', icon: BarChart2, desc: 'TradingView advanced charts', color: 'text-blue-400' },
  { to: '/option-chain', label: 'Option Chain', icon: Link2, desc: 'Full OI & greeks data', color: 'text-purple-400' },
  { to: '/market-monitor', label: 'Market Monitor', icon: Eye, desc: 'VIX, PCR, FII/DII', color: 'text-cyan-400' },
  { to: '/file-analysis', label: 'File Analysis', icon: FileBarChart, desc: 'Monthly expiry analysis', color: 'text-orange-400' },
  { to: '/ai-brain', label: 'AI Brain', icon: Brain, desc: 'Ask your AI trader', color: 'text-green-400' },
]

function IndexCard({ symbol, price, prevPrice }: { symbol: string; price: number; prevPrice: number }) {
  const change = price - prevPrice
  const changePct = (change / prevPrice) * 100
  const isUp = change >= 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{symbol}</span>
        {isUp ? (
          <TrendingUp className="w-4 h-4 text-green-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div className="text-xl font-bold text-white">{price.toLocaleString('en-IN')}</div>
      <div className={`text-sm font-medium mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
      </div>
    </div>
  )
}

function Home() {
  const [prices, setPrices] = useState<Record<string, number>>(getIndexSpotPrices())
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({ ...prices })
  const [vix, setVix] = useState(13.85)
  const [newsIdx, setNewsIdx] = useState(0)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setPrevPrices({ ...prices })
      setPrices(getIndexSpotPrices())
      setVix(Math.round((13 + Math.random() * 4) * 100) / 100)
      setTime(new Date())
      setNewsIdx((i) => (i + 1) % newsItems.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [prices])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            Trading Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {time.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} IST
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-300">Live</span>
        </div>
      </div>

      {/* Index Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Market Indices</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {indexSymbols.map((sym) => (
            <IndexCard key={sym} symbol={sym} price={prices[sym] || 0} prevPrice={prevPrices[sym] || prices[sym] || 0} />
          ))}
        </div>
      </div>

      {/* VIX + News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">India VIX</div>
          <div className={`text-3xl font-bold ${vix < 15 ? 'text-green-400' : vix < 20 ? 'text-yellow-400' : 'text-red-400'}`}>
            {vix}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {vix < 15 ? 'Low Volatility - Bullish' : vix < 20 ? 'Moderate Volatility' : 'High Volatility - Caution'}
          </div>
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${vix < 15 ? 'bg-green-400' : vix < 20 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min((vix / 40) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-3">Market News Feed</div>
          <div className="space-y-2">
            {[newsItems[newsIdx], newsItems[(newsIdx + 1) % newsItems.length], newsItems[(newsIdx + 2) % newsItems.length]].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <span className="text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map(({ to, label, icon: Icon, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 hover:bg-gray-800 transition-all group"
            >
              <Icon className={`w-6 h-6 ${color} mb-2 group-hover:scale-110 transition-transform`} />
              <div className="text-sm font-semibold text-white">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-lg p-3 text-xs text-yellow-600">
        Disclaimer: TradeIQ Pro provides data for educational purposes only. Not SEBI registered. Not financial advice. Trade at your own risk.
      </div>
    </div>
  )
}
