import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { FileBarChart, RefreshCw } from 'lucide-react'
import { getIndexSpotPrices, generateOptionChainData, getATMStrike, getCurrentMonthlyExpiry, getMonthLabel } from '@/utils/marketData'
import { calculateRSI, calculateEMA, calculateMACD, generateSignal } from '@/utils/indicators'
import { generateOHLCV } from '@/utils/marketData'

export const Route = createFileRoute('/file-analysis')({
  component: FileAnalysis,
})

const INDICES = [
  { label: 'Nifty 50', symbol: 'NIFTY', strike_interval: 50 },
  { label: 'Bank Nifty', symbol: 'BANKNIFTY', strike_interval: 100 },
  { label: 'Fin Nifty', symbol: 'FINNIFTY', strike_interval: 50 },
  { label: 'Nifty Midcap Select', symbol: 'MIDCPNIFTY', strike_interval: 25 },
  { label: 'BSE Sensex', symbol: 'SENSEX', strike_interval: 100 },
  { label: 'BSE Bankex', symbol: 'BANKEX', strike_interval: 100 },
]

interface AnalysisResult {
  symbol: string
  label: string
  spotPrice: number
  atmStrike: number
  expiry: string
  month: string
  bias: 'bullish' | 'bearish' | 'neutral'
  biasStrength: number
  recommendedCE: { strike: number; type: 'ATM' | 'OTM' | 'ITM'; ltp: number; sl: number; target: number }
  recommendedPE: { strike: number; type: 'ATM' | 'OTM' | 'ITM'; ltp: number; sl: number; target: number }
  greeks: { delta: number; theta: number; vega: number; gamma: number }
  strategy: string
  strategyReason: string
  entryMethod: 'A' | 'B' | 'C'
  entryMethodDesc: string
  rr: number
  rsi: number
  macd: number
}

function computeAnalysis(symbol: string, label: string, spotPrice: number): AnalysisResult {
  const vol = symbol === 'BANKNIFTY' || symbol === 'BANKEX' ? 0.009 : symbol === 'SENSEX' ? 0.006 : 0.007
  const bars = generateOHLCV(spotPrice, vol, 100)
  const closes = bars.map((b) => b.close)

  const rsi = calculateRSI(closes)
  const { macd } = calculateMACD(closes)
  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const e9 = ema9[ema9.length - 1] ?? spotPrice
  const e21 = ema21[ema21.length - 1] ?? spotPrice

  const { signal, strength, reason } = generateSignal(rsi, macd, e9, e21, spotPrice)

  const bias = signal === 'BUY' ? 'bullish' : signal === 'SELL' ? 'bearish' : 'neutral'

  const interval = symbol === 'BANKNIFTY' || symbol === 'BANKEX' || symbol === 'SENSEX' ? 100 : symbol === 'MIDCPNIFTY' ? 25 : 50
  const atmStrike = getATMStrike(symbol, spotPrice)

  // Strike selection
  let ceStrike = atmStrike
  let peStrike = atmStrike
  let ceType: 'ATM' | 'OTM' | 'ITM' = 'ATM'
  let peType: 'ATM' | 'OTM' | 'ITM' = 'ATM'

  if (bias === 'bullish') {
    ceStrike = atmStrike // ATM CE for bullish
    peStrike = atmStrike + interval // OTM PE for protection
    peType = 'OTM'
  } else if (bias === 'bearish') {
    peStrike = atmStrike // ATM PE for bearish
    ceStrike = atmStrike - interval // OTM CE for protection
    ceType = 'OTM'
  }

  // Generate option prices
  const chainData = generateOptionChainData(symbol, spotPrice)
  const ceRow = chainData.find((r) => r.strikePrice === ceStrike) ?? chainData[Math.floor(chainData.length / 2)]
  const peRow = chainData.find((r) => r.strikePrice === peStrike) ?? chainData[Math.floor(chainData.length / 2)]

  const ceLTP = ceRow?.CE.lastPrice ?? Math.round(spotPrice * 0.007)
  const peLTP = peRow?.PE.lastPrice ?? Math.round(spotPrice * 0.007)

  // Entry method
  let entryMethod: 'A' | 'B' | 'C' = 'A'
  let entryMethodDesc = ''
  if (bias === 'bullish') {
    entryMethod = 'A'
    entryMethodDesc = 'Method A: Buy ATM CE on dip to EMA support. Place order at or below VWAP.'
  } else if (bias === 'bearish') {
    entryMethod = 'B'
    entryMethodDesc = 'Method B: Buy ATM PE on rally to resistance. Wait for price rejection confirmation.'
  } else {
    entryMethod = 'C'
    entryMethodDesc = 'Method C: Iron Condor - Sell OTM CE+PE, buy further OTM for hedge. Range-bound strategy.'
  }

  // Strategy
  let strategy = ''
  let strategyReason = reason
  if (bias === 'bullish') {
    strategy = rsi < 40 ? 'Long CE + Bull Call Spread' : 'Long ATM CE'
  } else if (bias === 'bearish') {
    strategy = rsi > 60 ? 'Long PE + Bear Put Spread' : 'Long ATM PE'
  } else {
    strategy = 'Iron Condor / Short Straddle'
  }

  // Greeks (approximate)
  const delta = bias === 'bullish' ? 0.52 : bias === 'bearish' ? -0.52 : 0.5
  const theta = -Math.round((ceLTP * 0.03) * 100) / 100
  const vega = Math.round((spotPrice * 0.0003) * 100) / 100
  const gamma = Math.round((0.0015 / spotPrice) * 10000) / 10000

  const rr = 2.2

  return {
    symbol, label, spotPrice, atmStrike, expiry: getCurrentMonthlyExpiry(), month: getMonthLabel(),
    bias, biasStrength: strength,
    recommendedCE: { strike: ceStrike, type: ceType, ltp: ceLTP, sl: Math.round(ceLTP * 0.78 * 100) / 100, target: Math.round(ceLTP * 2.2 * 100) / 100 },
    recommendedPE: { strike: peStrike, type: peType, ltp: peLTP, sl: Math.round(peLTP * 0.78 * 100) / 100, target: Math.round(peLTP * 2.2 * 100) / 100 },
    greeks: { delta, theta, vega, gamma },
    strategy, strategyReason, entryMethod, entryMethodDesc, rr, rsi: Math.round(rsi * 100) / 100, macd: Math.round(macd * 100) / 100,
  }
}

function AnalysisCard({ result }: { result: AnalysisResult }) {
  const biasBg = result.bias === 'bullish' ? 'border-green-800/50' : result.bias === 'bearish' ? 'border-red-800/50' : 'border-yellow-800/50'
  const biasColor = result.bias === 'bullish' ? 'text-green-400' : result.bias === 'bearish' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 ${biasBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white">{result.label}</h3>
          <div className="text-sm text-gray-400 mt-0.5">
            Spot: <span className="text-white font-medium">{result.spotPrice.toLocaleString('en-IN')}</span>
            &nbsp;| ATM: <span className="text-blue-400 font-medium">{result.atmStrike}</span>
            &nbsp;| Expiry: <span className="text-purple-400">{result.expiry}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold uppercase ${biasColor}`}>{result.bias}</div>
          <div className="text-xs text-gray-500">Strength: {result.biasStrength}%</div>
        </div>
      </div>

      {/* Indicators */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="text-gray-400">RSI: <span className={result.rsi < 30 ? 'text-green-400' : result.rsi > 70 ? 'text-red-400' : 'text-white'}>{result.rsi}</span></span>
        <span className="text-gray-400">MACD: <span className={result.macd > 0 ? 'text-green-400' : 'text-red-400'}>{result.macd}</span></span>
        <span className="text-gray-400">Strategy: <span className="text-yellow-400">{result.strategy}</span></span>
      </div>

      {/* Recommended Strikes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-3">
          <div className="text-xs text-green-500 mb-1">{result.recommendedCE.type} CE Recommendation</div>
          <div className="font-mono text-sm">
            <div className="text-white font-bold">{result.symbol} {result.recommendedCE.strike} CE</div>
            <div className="text-xs text-gray-500 mb-1">({result.month})</div>
            <div className="text-xs space-y-0.5">
              <div><span className="text-gray-400">Buy: </span><span className="text-green-400">{result.recommendedCE.ltp}</span></div>
              <div><span className="text-gray-400">SL: </span><span className="text-red-400">{result.recommendedCE.sl}</span></div>
              <div><span className="text-gray-400">Tgt: </span><span className="text-green-400">{result.recommendedCE.target}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-3">
          <div className="text-xs text-red-500 mb-1">{result.recommendedPE.type} PE Recommendation</div>
          <div className="font-mono text-sm">
            <div className="text-white font-bold">{result.symbol} {result.recommendedPE.strike} PE</div>
            <div className="text-xs text-gray-500 mb-1">({result.month})</div>
            <div className="text-xs space-y-0.5">
              <div><span className="text-gray-400">Buy: </span><span className="text-green-400">{result.recommendedPE.ltp}</span></div>
              <div><span className="text-gray-400">SL: </span><span className="text-red-400">{result.recommendedPE.sl}</span></div>
              <div><span className="text-gray-400">Tgt: </span><span className="text-green-400">{result.recommendedPE.target}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Greeks */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
        <div className="text-xs text-gray-400 mb-2 font-semibold">Greeks (ATM)</div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          {[
            { label: 'Delta', value: result.greeks.delta.toFixed(2), color: result.greeks.delta > 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Theta', value: result.greeks.theta.toFixed(2), color: 'text-red-400' },
            { label: 'Vega', value: result.greeks.vega.toFixed(2), color: 'text-blue-400' },
            { label: 'Gamma', value: result.greeks.gamma.toFixed(4), color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-gray-500">{label}</div>
              <div className={`font-mono font-medium ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Entry Method */}
      <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3">
        <div className="text-xs text-blue-400 font-semibold mb-1">Entry Method {result.entryMethod} | R:R = 1:{result.rr}</div>
        <p className="text-xs text-gray-400">{result.entryMethodDesc}</p>
        <p className="text-xs text-gray-500 mt-1">{result.strategyReason}</p>
      </div>
    </div>
  )
}

function FileAnalysis() {
  const [selected, setSelected] = useState<string[]>(['NIFTY', 'BANKNIFTY'])
  const [prices, setPrices] = useState<Record<string, number>>(getIndexSpotPrices())
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const refresh = useCallback(() => {
    const newPrices = getIndexSpotPrices()
    setPrices(newPrices)
    const newResults = INDICES.filter((idx) => selected.includes(idx.symbol)).map((idx) =>
      computeAnalysis(idx.symbol, idx.label, newPrices[idx.symbol] ?? 23897)
    )
    setResults(newResults)
    setLastUpdate(new Date())
  }, [selected])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  function toggleSymbol(sym: string) {
    setSelected((prev) => prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym])
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-orange-400" />
          File / Index Analysis
        </h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {lastUpdate.toLocaleTimeString('en-IN')}
        </div>
      </div>

      <p className="text-sm text-gray-400">Full technical analysis for monthly expiry options. Select indices to analyze:</p>

      <div className="flex flex-wrap gap-2">
        {INDICES.map(({ label, symbol }) => (
          <button
            key={symbol}
            onClick={() => toggleSymbol(symbol)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selected.includes(symbol) ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {results.map((r) => <AnalysisCard key={r.symbol} result={r} />)}
      </div>

      {results.length === 0 && (
        <div className="text-center py-12 text-gray-500">Select at least one index to view analysis</div>
      )}
    </div>
  )
}
