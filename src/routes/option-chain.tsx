import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Link2, RefreshCw } from 'lucide-react'
import { generateOptionChainData, getIndexSpotPrices, getATMStrike, type OptionData, getCurrentMonthlyExpiry, getMonthLabel } from '@/utils/marketData'

export const Route = createFileRoute('/option-chain')({
  component: OptionChain,
})

const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY', 'BANKEX']

function formatOI(oi: number): string {
  if (oi >= 1000000) return (oi / 1000000).toFixed(2) + 'M'
  if (oi >= 1000) return (oi / 1000).toFixed(1) + 'K'
  return String(oi)
}

function calculateMaxPain(chain: OptionData[]): number {
  let minLoss = Infinity
  let maxPainStrike = chain[0]?.strikePrice ?? 0

  for (const row of chain) {
    const strike = row.strikePrice
    let totalLoss = 0
    for (const r of chain) {
      // CE writers lose when spot > strike (put buyers profit)
      totalLoss += r.CE.openInterest * Math.max(0, strike - r.strikePrice)
      // PE writers lose when spot < strike
      totalLoss += r.PE.openInterest * Math.max(0, r.strikePrice - strike)
    }
    if (totalLoss < minLoss) {
      minLoss = totalLoss
      maxPainStrike = strike
    }
  }
  return maxPainStrike
}

function OptionChain() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY')
  const [prices, setPrices] = useState<Record<string, number>>(getIndexSpotPrices())
  const [chain, setChain] = useState<OptionData[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChain = useCallback(async (symbol: string, spotPrice: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/option-chain?symbol=${symbol}`)
      const json = await res.json()
      if (json.success && json.data?.records?.data) {
        const nseData: OptionData[] = json.data.records.data
          .filter((d: { strikePrice: number; CE?: unknown; PE?: unknown }) => d.CE && d.PE)
          .map((d: { strikePrice: number; CE: { openInterest: number; changeinOpenInterest: number; totalTradedVolume: number; impliedVolatility: number; lastPrice: number; change: number }; PE: { openInterest: number; changeinOpenInterest: number; totalTradedVolume: number; impliedVolatility: number; lastPrice: number; change: number } }) => ({
            strikePrice: d.strikePrice,
            CE: { openInterest: d.CE.openInterest, changeinOpenInterest: d.CE.changeinOpenInterest, totalTradedVolume: d.CE.totalTradedVolume, impliedVolatility: d.CE.impliedVolatility, lastPrice: d.CE.lastPrice, change: d.CE.change },
            PE: { openInterest: d.PE.openInterest, changeinOpenInterest: d.PE.changeinOpenInterest, totalTradedVolume: d.PE.totalTradedVolume, impliedVolatility: d.PE.impliedVolatility, lastPrice: d.PE.lastPrice, change: d.PE.change },
          }))
        setChain(nseData)
      } else {
        throw new Error('API failed')
      }
    } catch {
      // Fallback to generated data
      setError('Using simulated data (NSE API unavailable)')
      setChain(generateOptionChainData(symbol, spotPrice))
    }
    setLoading(false)
    setLastUpdate(new Date())
  }, [])

  const refresh = useCallback(() => {
    const newPrices = getIndexSpotPrices()
    setPrices(newPrices)
    const spot = newPrices[selectedSymbol] ?? 23897
    fetchChain(selectedSymbol, spot)
  }, [selectedSymbol, fetchChain])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  const spot = prices[selectedSymbol] ?? 23897
  const atm = getATMStrike(selectedSymbol, spot)
  const maxPain = chain.length > 0 ? calculateMaxPain(chain) : atm
  const expiry = getCurrentMonthlyExpiry()
  const month = getMonthLabel()

  // Find max OI for support/resistance
  const maxCEOI = chain.reduce((max, r) => r.CE.openInterest > max.oi ? { oi: r.CE.openInterest, strike: r.strikePrice } : max, { oi: 0, strike: 0 })
  const maxPEOI = chain.reduce((max, r) => r.PE.openInterest > max.oi ? { oi: r.PE.openInterest, strike: r.strikePrice } : max, { oi: 0, strike: 0 })

  // Trade signals from actual chain data
  const ceRow = chain.find((r) => r.strikePrice === atm)
  const peRow = chain.find((r) => r.strikePrice === atm)
  const ceLTP = ceRow?.CE.lastPrice ?? 0
  const peLTP = peRow?.PE.lastPrice ?? 0

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Link2 className="w-5 h-5 text-purple-400" />
          Option Chain
        </h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
          {lastUpdate.toLocaleTimeString('en-IN')}
        </div>
      </div>

      {/* Symbol selector */}
      <div className="flex flex-wrap gap-2">
        {SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedSymbol === sym ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {sym}
          </button>
        ))}
      </div>

      {error && <div className="text-xs text-yellow-500 bg-yellow-900/10 border border-yellow-800/30 rounded px-3 py-1.5">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Spot Price', value: spot.toLocaleString('en-IN'), color: 'text-white' },
          { label: 'ATM Strike', value: atm.toLocaleString('en-IN'), color: 'text-blue-400' },
          { label: 'Max Pain', value: maxPain.toLocaleString('en-IN'), color: 'text-yellow-400' },
          { label: 'Expiry', value: expiry, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`text-sm font-bold mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Support/Resistance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-3">
          <div className="text-xs text-green-600 uppercase">Max PE OI (Support)</div>
          <div className="text-lg font-bold text-green-400 mt-1">{maxPEOI.strike.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">OI: {formatOI(maxPEOI.oi)}</div>
        </div>
        <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-3">
          <div className="text-xs text-red-600 uppercase">Max CE OI (Resistance)</div>
          <div className="text-lg font-bold text-red-400 mt-1">{maxCEOI.strike.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">OI: {formatOI(maxCEOI.oi)}</div>
        </div>
      </div>

      {/* Trade Signals */}
      {ceLTP > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-green-800/40 rounded-xl p-4">
            <div className="text-xs text-green-500 uppercase tracking-wider mb-2">CE Trade Signal (Bullish)</div>
            <div className="font-mono text-sm space-y-1">
              <div className="text-white font-bold">{selectedSymbol} {atm} CE (Monthly - {month})</div>
              <div className="text-xs text-gray-500">Expiry: {expiry}</div>
              <div className="flex justify-between mt-2"><span className="text-gray-400">BUY:</span><span className="text-green-400 font-bold">{ceLTP}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">SL:</span><span className="text-red-400 font-bold">{Math.round(ceLTP * 0.8 * 100) / 100}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Target:</span><span className="text-green-400 font-bold">{Math.round(ceLTP * 2.0 * 100) / 100}</span></div>
            </div>
          </div>
          <div className="bg-gray-900 border border-red-800/40 rounded-xl p-4">
            <div className="text-xs text-red-500 uppercase tracking-wider mb-2">PE Trade Signal (Bearish)</div>
            <div className="font-mono text-sm space-y-1">
              <div className="text-white font-bold">{selectedSymbol} {atm} PE (Monthly - {month})</div>
              <div className="text-xs text-gray-500">Expiry: {expiry}</div>
              <div className="flex justify-between mt-2"><span className="text-gray-400">BUY:</span><span className="text-green-400 font-bold">{peLTP}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">SL:</span><span className="text-red-400 font-bold">{Math.round(peLTP * 0.8 * 100) / 100}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Target:</span><span className="text-green-400 font-bold">{Math.round(peLTP * 2.0 * 100) / 100}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Option Chain Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800 text-gray-400">
                <th className="px-2 py-2 text-right" colSpan={5}>CALLS</th>
                <th className="px-3 py-2 text-center bg-blue-900/30 text-blue-300 font-bold">STRIKE</th>
                <th className="px-2 py-2 text-left" colSpan={5}>PUTS</th>
              </tr>
              <tr className="bg-gray-800/80 text-gray-500 border-b border-gray-700">
                <th className="px-2 py-1.5 text-right">OI</th>
                <th className="px-2 py-1.5 text-right">Chng OI</th>
                <th className="px-2 py-1.5 text-right">Vol</th>
                <th className="px-2 py-1.5 text-right">IV</th>
                <th className="px-2 py-1.5 text-right">LTP</th>
                <th className="px-3 py-1.5 text-center bg-blue-900/20"></th>
                <th className="px-2 py-1.5 text-left">LTP</th>
                <th className="px-2 py-1.5 text-left">IV</th>
                <th className="px-2 py-1.5 text-left">Vol</th>
                <th className="px-2 py-1.5 text-left">Chng OI</th>
                <th className="px-2 py-1.5 text-left">OI</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((row) => {
                const isATM = row.strikePrice === atm
                return (
                  <tr key={row.strikePrice} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${isATM ? 'bg-blue-900/10' : ''}`}>
                    <td className="px-2 py-1.5 text-right text-gray-300">{formatOI(row.CE.openInterest)}</td>
                    <td className={`px-2 py-1.5 text-right ${row.CE.changeinOpenInterest > 0 ? 'text-green-400' : 'text-red-400'}`}>{row.CE.changeinOpenInterest > 0 ? '+' : ''}{formatOI(row.CE.changeinOpenInterest)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">{formatOI(row.CE.totalTradedVolume)}</td>
                    <td className="px-2 py-1.5 text-right text-yellow-400">{row.CE.impliedVolatility.toFixed(1)}%</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${row.CE.change > 0 ? 'text-green-400' : row.CE.change < 0 ? 'text-red-400' : 'text-gray-300'}`}>{row.CE.lastPrice}</td>
                    <td className={`px-3 py-1.5 text-center font-bold ${isATM ? 'text-blue-300 bg-blue-900/20' : 'text-gray-300'}`}>
                      {row.strikePrice}{isATM ? ' ★' : ''}
                    </td>
                    <td className={`px-2 py-1.5 text-left font-medium ${row.PE.change > 0 ? 'text-green-400' : row.PE.change < 0 ? 'text-red-400' : 'text-gray-300'}`}>{row.PE.lastPrice}</td>
                    <td className="px-2 py-1.5 text-left text-yellow-400">{row.PE.impliedVolatility.toFixed(1)}%</td>
                    <td className="px-2 py-1.5 text-left text-gray-400">{formatOI(row.PE.totalTradedVolume)}</td>
                    <td className={`px-2 py-1.5 text-left ${row.PE.changeinOpenInterest > 0 ? 'text-green-400' : 'text-red-400'}`}>{row.PE.changeinOpenInterest > 0 ? '+' : ''}{formatOI(row.PE.changeinOpenInterest)}</td>
                    <td className="px-2 py-1.5 text-left text-gray-300">{formatOI(row.PE.openInterest)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
