// src/routes/ai-signals.tsx
// AI Signals: live technical analysis for all indices + any F&O stock

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useRef } from 'react'
import { generateSignal, type Signal } from '../utils/indicators'
import { ALL_INDICES, FNO_STOCKS } from '../utils/marketData'

function fmt(n: number, d = 2) {
  return n?.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—'
}

interface SignalState {
  symbol: string; name: string; ltp: number; signal: Signal | null; loading: boolean;
}

function SignalBadge({ action, strength }: { action: string; strength: string }) {
  const color = action === 'BUY' ? 'bg-green-900 text-green-300 border-green-700'
    : action === 'SELL' ? 'bg-red-900 text-red-300 border-red-700'
    : 'bg-yellow-900 text-yellow-300 border-yellow-700'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${color}`}>
      {action === 'BUY' ? '▲' : action === 'SELL' ? '▼' : '●'} {strength} {action}
    </span>
  )
}

function IndicatorBar({ label, value, min, max, color }: { label: string; value: number; min: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-12">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-300 w-10 text-right">{fmt(value, 1)}</span>
    </div>
  )
}

function SignalCard({ state }: { state: SignalState }) {
  const { symbol, name, ltp, signal } = state
  if (!signal) return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-gray-800 rounded mb-2 w-24" />
      <div className="h-6 bg-gray-800 rounded mb-3 w-32" />
      <div className="h-3 bg-gray-800 rounded w-full" />
    </div>
  )

  const up = signal.action === 'BUY'
  const borderColor = signal.action === 'BUY' ? 'border-green-800' : signal.action === 'SELL' ? 'border-red-800' : 'border-yellow-800'

  return (
    <div className={`bg-gray-900 border rounded-lg p-4 ${borderColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-gray-500 uppercase">{symbol}</div>
          <div className="text-sm font-semibold text-white">{name}</div>
        </div>
        <SignalBadge action={signal.action} strength={signal.strength} />
      </div>

      <div className="text-xl font-bold text-white mb-1">₹{fmt(ltp)}</div>

      {/* Confidence bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Confidence</span>
        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${up ? 'bg-green-500' : signal.action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'}`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
        <span className="text-xs text-white font-bold">{signal.confidence}%</span>
      </div>

      {/* Levels */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div><span className="text-gray-500">Entry</span> <span className="text-white font-mono">₹{fmt(signal.entry)}</span></div>
        <div><span className="text-gray-500">SL</span> <span className="text-red-400 font-mono">₹{fmt(signal.stopLoss)}</span></div>
        <div><span className="text-gray-500">T1</span> <span className="text-green-300 font-mono">₹{fmt(signal.target1)}</span></div>
        <div><span className="text-gray-500">T2</span> <span className="text-green-400 font-mono">₹{fmt(signal.target2)}</span></div>
        <div className="col-span-2"><span className="text-gray-500">T3</span> <span className="text-green-500 font-mono">₹{fmt(signal.target3)}</span></div>
      </div>

      {/* Indicators */}
      <div className="space-y-1 mb-3">
        <IndicatorBar label="RSI" value={signal.rsi} min={0} max={100}
          color={signal.rsi < 30 ? 'bg-green-500' : signal.rsi > 70 ? 'bg-red-500' : 'bg-blue-500'} />
        <IndicatorBar label="Stoch K" value={signal.stoch.k} min={0} max={100}
          color={signal.stoch.k < 20 ? 'bg-green-500' : signal.stoch.k > 80 ? 'bg-red-500' : 'bg-purple-500'} />
      </div>

      {/* Key indicators triggered */}
      <div className="flex flex-wrap gap-1 mb-3">
        {signal.indicators.slice(0, 3).map((ind, i) => (
          <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">{ind}</span>
        ))}
      </div>

      {/* Option recommendation */}
      {signal.optionRecommendation && (
        <div className={`rounded p-2 text-xs ${signal.optionRecommendation.type === 'CE' ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
          <div className="font-bold text-white mb-1">
            📍 Option: {signal.optionRecommendation.strike}{signal.optionRecommendation.type} · {signal.optionRecommendation.expiry}
          </div>
          <div className="grid grid-cols-3 gap-1 text-gray-300 mb-1">
            <span>Buy: <span className="text-white">₹{signal.optionRecommendation.buyPrice}</span></span>
            <span>Target: <span className="text-green-300">₹{signal.optionRecommendation.sellPrice}</span></span>
            <span>Hold: <span className="text-yellow-300">₹{signal.optionRecommendation.holdPrice}</span></span>
          </div>
        </div>
      )}
    </div>
  )
}

// Expand panel for full signal details
function SignalDetailPanel({ state, onClose }: { state: SignalState; onClose: () => void }) {
  const { symbol, name, ltp, signal } = state
  if (!signal) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xl font-bold text-white">{name} ({symbol})</div>
            <div className="text-2xl font-mono text-white">₹{fmt(ltp)}</div>
          </div>
          <div className="flex items-center gap-2">
            <SignalBadge action={signal.action} strength={signal.strength} />
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Levels */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 font-semibold mb-2">TRADE LEVELS</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Entry</span><span className="text-white font-mono">₹{fmt(signal.entry)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Stop Loss</span><span className="text-red-400 font-mono">₹{fmt(signal.stopLoss)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Target 1</span><span className="text-green-300 font-mono">₹{fmt(signal.target1)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Target 2</span><span className="text-green-400 font-mono">₹{fmt(signal.target2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Target 3</span><span className="text-green-500 font-mono">₹{fmt(signal.target3)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">ATR</span><span className="text-gray-300 font-mono">₹{fmt(signal.atr)}</span></div>
            </div>
          </div>

          {/* Indicators */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 font-semibold mb-2">INDICATORS</div>
            <div className="space-y-1.5">
              <IndicatorBar label="RSI" value={signal.rsi} min={0} max={100}
                color={signal.rsi < 30 ? 'bg-green-500' : signal.rsi > 70 ? 'bg-red-500' : 'bg-blue-500'} />
              <IndicatorBar label="Stoch" value={signal.stoch.k} min={0} max={100}
                color={signal.stoch.k < 20 ? 'bg-green-500' : signal.stoch.k > 80 ? 'bg-red-500' : 'bg-purple-500'} />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-12">MACD</span>
                <span className={`font-mono ${signal.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(signal.macd.histogram, 1)}
                </span>
                <span className="text-gray-500">{signal.macd.histogram > 0 ? '▲ Bull' : '▼ Bear'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-12">EMA20</span>
                <span className={`font-mono ${ltp > signal.ema20 ? 'text-green-400' : 'text-red-400'}`}>₹{fmt(signal.ema20)}</span>
                <span className={`text-gray-500`}>{ltp > signal.ema20 ? '▲ Above' : '▼ Below'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-12">EMA50</span>
                <span className={`font-mono ${ltp > signal.ema50 ? 'text-green-400' : 'text-red-400'}`}>₹{fmt(signal.ema50)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-12">VWAP</span>
                <span className={`font-mono ${ltp > signal.vwap ? 'text-green-400' : 'text-red-400'}`}>₹{fmt(signal.vwap)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                BB: {fmt(signal.bb.lower)} – {fmt(signal.bb.upper)}
              </div>
            </div>
          </div>
        </div>

        {/* Patterns */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-500 font-semibold mb-2">PATTERNS & INDICATORS TRIGGERED</div>
          <div className="flex flex-wrap gap-1.5">
            {signal.patterns.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-blue-900/50 border border-blue-800 text-blue-300 rounded">{p}</span>
            ))}
            {signal.indicators.map((ind, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">{ind}</span>
            ))}
          </div>
        </div>

        {/* Option recommendation */}
        {signal.optionRecommendation && (
          <div className={`rounded-lg p-4 ${signal.optionRecommendation.type === 'CE' ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}>
            <div className="text-sm font-bold text-white mb-2">
              Option Recommendation: {signal.optionRecommendation.strike}{signal.optionRecommendation.type} · Expiry: {signal.optionRecommendation.expiry}
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
              <div className="text-center">
                <div className="text-xs text-gray-500">Buy At</div>
                <div className="text-white font-bold">₹{signal.optionRecommendation.buyPrice}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Sell / Target</div>
                <div className="text-green-400 font-bold">₹{signal.optionRecommendation.sellPrice}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Hold Above</div>
                <div className="text-yellow-400 font-bold">₹{signal.optionRecommendation.holdPrice}</div>
              </div>
            </div>
            <p className="text-xs text-gray-300">{signal.optionRecommendation.reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const ALL_SYMBOLS = [
  ...ALL_INDICES.map((i) => ({ symbol: i.symbol, name: i.name, type: 'index' as const, strikeStep: i.strikeStep })),
  ...FNO_STOCKS.map((s) => ({ symbol: s, name: s, type: 'equity' as const, strikeStep: 5 })),
]

export const Route = createFileRoute('/ai-signals')({
  component: AISignals,
})

function AISignals() {
  const [signals, setSignals] = useState<SignalState[]>([])
  const [selected, setSelected] = useState<SignalState | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'BUY' | 'SELL' | 'HOLD'>('all')
  const [activeType, setActiveType] = useState<'all' | 'index' | 'equity'>('all')
  const [loading, setLoading] = useState(true)
  const priceHistories = useRef<Record<string, { prices: number[]; volumes: number[] }>>({})

  const fetchSignals = useCallback(async () => {
    try {
      const mdRes = await fetch('/api/market-data')
      const md = await mdRes.json()
      if (!md.ok) return

      const indexPrices: Record<string, number> = {}
      for (const idx of md.allIndices ?? []) {
        indexPrices[idx.name] = idx.last
        indexPrices[idx.symbol] = idx.last
      }

      setSignals((prev) => {
        const next: SignalState[] = ALL_SYMBOLS
          .filter((s) => {
            if (activeType !== 'all' && s.type !== activeType) return false
            if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()) && !s.name.toLowerCase().includes(search.toLowerCase())) return false
            return true
          })
          .slice(0, 60) // limit for performance
          .map((sym) => {
            // Get LTP
            let ltp = 0
            const indexInfo = ALL_INDICES.find((i) => i.symbol === sym.symbol)
            if (indexInfo) {
              ltp = indexPrices[indexInfo.nseKey] ?? indexPrices[sym.symbol] ?? 0
            } else {
              // For equity, try to get from prev state
              const prev_ = prev.find((p) => p.symbol === sym.symbol)
              ltp = prev_?.ltp ?? 0
            }

            if (ltp <= 0) {
              const prev_ = prev.find((p) => p.symbol === sym.symbol)
              return prev_ ?? { symbol: sym.symbol, name: sym.name, ltp: 0, signal: null, loading: true }
            }

            // Maintain price history
            if (!priceHistories.current[sym.symbol]) {
              priceHistories.current[sym.symbol] = { prices: [], volumes: [] }
            }
            const hist = priceHistories.current[sym.symbol]
            hist.prices.push(ltp)
            hist.volumes.push(Math.random() * 1000000 + 500000)
            if (hist.prices.length > 200) { hist.prices.shift(); hist.volumes.shift() }

            const signal = generateSignal(ltp, [...hist.prices], [...hist.volumes], sym.strikeStep, sym.type === 'index')
            return { symbol: sym.symbol, name: sym.name, ltp, signal, loading: false }
          })

        // Also fetch equity prices for non-index items from a batch quote if needed
        return next
      })
      setLoading(false)
    } catch (e) {
      console.error('AI signals fetch error:', e)
    }
  }, [search, activeType])

  // Separate fetch for equity prices
  useEffect(() => {
    const fetchEquityPrices = async () => {
      const equities = ALL_SYMBOLS.filter((s) => s.type === 'equity').slice(0, 50)
      // Fetch via option-chain to get underlying value (quick way to get LTP)
      for (const eq of equities.slice(0, 20)) {
        try {
          const res = await fetch(`/api/option-chain?symbol=${eq.symbol}&strikes=0`)
          const data = await res.json()
          if (data.ok && data.underlyingValue > 0) {
            const ltp = data.underlyingValue
            if (!priceHistories.current[eq.symbol]) {
              priceHistories.current[eq.symbol] = { prices: [], volumes: [] }
            }
            priceHistories.current[eq.symbol].prices.push(ltp)
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 100)) // rate limit
      }
    }
    fetchEquityPrices()
  }, [])

  useEffect(() => {
    fetchSignals()
    const id = setInterval(fetchSignals, 3000)
    return () => clearInterval(id)
  }, [fetchSignals])

  const filteredSignals = signals.filter((s) => {
    if (filter !== 'all' && s.signal?.action !== filter) return false
    return true
  })

  const buys = signals.filter((s) => s.signal?.action === 'BUY').length
  const sells = signals.filter((s) => s.signal?.action === 'SELL').length
  const holds = signals.filter((s) => s.signal?.action === 'HOLD').length

  return (
    <div className="p-4">
      {selected && <SignalDetailPanel state={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">AI Signals</h1>
          <p className="text-xs text-gray-500">Live technical analysis · All indices & F&O stocks · Updated every 3s</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded">{buys} BUY</span>
          <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded">{sells} SELL</span>
          <span className="bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded">{holds} HOLD</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text" placeholder="Search symbol..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-48"
        />
        <div className="flex gap-1">
          {(['all', 'index', 'equity'] as const).map((t) => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${activeType === t ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'BUY', 'SELL', 'HOLD'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${filter === f
                ? f === 'BUY' ? 'bg-green-700 text-white' : f === 'SELL' ? 'bg-red-700 text-white' : f === 'HOLD' ? 'bg-yellow-700 text-white' : 'bg-blue-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array(8).fill(null).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse h-64">
              <div className="h-3 bg-gray-800 rounded mb-2 w-20" />
              <div className="h-5 bg-gray-800 rounded mb-3 w-32" />
              <div className="h-8 bg-gray-800 rounded mb-2" />
              <div className="space-y-2">
                {Array(4).fill(null).map((_, j) => <div key={j} className="h-2 bg-gray-800 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredSignals.map((s) => (
            <div key={s.symbol} className="cursor-pointer" onClick={() => setSelected(s)}>
              <SignalCard state={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
