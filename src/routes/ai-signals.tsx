import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Zap, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { generateOHLCV, getIndexSpotPrices, getATMStrike, getMonthLabel, getCurrentMonthlyExpiry } from '@/utils/marketData'
import { calculateRSI, calculateEMA, calculateMACD, calculateVWAP, generateSignal } from '@/utils/indicators'

export const Route = createFileRoute('/ai-signals')({
  component: AISignals,
})

const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY', 'BANKEX']
const STOCKS = ['RELIANCE', 'TCS', 'HDFC BANK', 'INFOSYS', 'ICICI BANK']

interface Signal {
  signal: 'BUY' | 'SELL' | 'HOLD'
  strength: number
  entry: number
  stopLoss: number
  target: number
  reason: string
}

interface IndicatorValues {
  rsi: number
  macd: number
  macdSignal: number
  macdHistogram: number
  ema9: number
  ema20: number
  ema50: number
  vwap: number
}

interface PatternResult {
  name: string
  found: boolean
  bias: 'bullish' | 'bearish' | 'neutral'
}

function computeSignalData(symbol: string, spotPrice: number): {
  indicators: IndicatorValues
  signal: Signal
  patterns: PatternResult[]
  optionRec: { strike: number; type: 'CE' | 'PE'; month: string; buy: number; sl: number; target: number; expiry: string }
} {
  const vol = symbol === 'BANKNIFTY' ? 0.008 : symbol === 'SENSEX' ? 0.006 : 0.006
  const bars = generateOHLCV(spotPrice, vol, 100)
  const closes = bars.map((b) => b.close)
  const volumes = bars.map((b) => b.volume)

  const rsi = calculateRSI(closes)
  const { macd, signal: macdSignal, histogram } = calculateMACD(closes)
  const ema9Arr = calculateEMA(closes, 9)
  const ema20Arr = calculateEMA(closes, 20)
  const ema50Arr = calculateEMA(closes, 50)
  const vwap = calculateVWAP(closes, volumes)

  const ema9 = ema9Arr[ema9Arr.length - 1] ?? spotPrice
  const ema20 = ema20Arr[ema20Arr.length - 1] ?? spotPrice
  const ema50 = ema50Arr[ema50Arr.length - 1] ?? spotPrice

  const { signal: sig, strength, reason } = generateSignal(rsi, macd, ema9, ema50, spotPrice)

  const slPct = sig === 'BUY' ? -0.008 : sig === 'SELL' ? 0.008 : -0.005
  const tgtPct = sig === 'BUY' ? 0.018 : sig === 'SELL' ? -0.018 : 0.01

  const entry = Math.round(spotPrice * 100) / 100
  const stopLoss = Math.round(spotPrice * (1 + slPct) * 100) / 100
  const target = Math.round(spotPrice * (1 + tgtPct) * 100) / 100

  const indicators: IndicatorValues = {
    rsi: Math.round(rsi * 100) / 100,
    macd: Math.round(macd * 100) / 100,
    macdSignal: Math.round(macdSignal * 100) / 100,
    macdHistogram: Math.round(histogram * 100) / 100,
    ema9: Math.round(ema9 * 100) / 100,
    ema20: Math.round(ema20 * 100) / 100,
    ema50: Math.round(ema50 * 100) / 100,
    vwap: Math.round(vwap * 100) / 100,
  }

  const patterns: PatternResult[] = [
    { name: 'Bullish Engulfing', found: rsi < 45 && macd > 0, bias: 'bullish' },
    { name: 'Bearish Divergence', found: rsi > 65 && macd < 0, bias: 'bearish' },
    { name: 'Golden Cross (EMA 9/20)', found: ema9 > ema20, bias: 'bullish' },
    { name: 'Death Cross (EMA 9/20)', found: ema9 < ema20, bias: 'bearish' },
    { name: 'VWAP Support', found: spotPrice > vwap, bias: 'bullish' },
    { name: 'VWAP Resistance', found: spotPrice < vwap, bias: 'bearish' },
  ]

  const atmStrike = getATMStrike(symbol, spotPrice)
  const optionType: 'CE' | 'PE' = sig === 'SELL' ? 'PE' : 'CE'
  const optionStrike = sig === 'BUY' ? atmStrike : sig === 'SELL' ? atmStrike : atmStrike
  const optionLTP = Math.round((spotPrice * 0.008 + Math.random() * spotPrice * 0.005) * 100) / 100
  const optionSL = Math.round(optionLTP * 0.85 * 100) / 100
  const optionTarget = Math.round(optionLTP * 2.2 * 100) / 100

  return {
    indicators,
    signal: { signal: sig, strength, entry, stopLoss, target, reason },
    patterns,
    optionRec: {
      strike: optionStrike,
      type: optionType,
      month: getMonthLabel(),
      buy: optionLTP,
      sl: optionSL,
      target: optionTarget,
      expiry: getCurrentMonthlyExpiry(),
    },
  }
}

function SignalBadge({ signal }: { signal: 'BUY' | 'SELL' | 'HOLD' }) {
  if (signal === 'BUY') return <span className="flex items-center gap-1 text-green-400 font-bold"><TrendingUp className="w-4 h-4" /> BUY</span>
  if (signal === 'SELL') return <span className="flex items-center gap-1 text-red-400 font-bold"><TrendingDown className="w-4 h-4" /> SELL</span>
  return <span className="flex items-center gap-1 text-yellow-400 font-bold"><Minus className="w-4 h-4" /> HOLD</span>
}

function AISignals() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY')
  const [prices, setPrices] = useState<Record<string, number>>(getIndexSpotPrices())
  const [data, setData] = useState(() => {
    const p = getIndexSpotPrices()
    return computeSignalData('NIFTY', p['NIFTY'] ?? 23897)
  })
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const refresh = useCallback(() => {
    const newPrices = getIndexSpotPrices()
    setPrices(newPrices)
    const spotPrice = newPrices[selectedSymbol] ?? 23897
    setData(computeSignalData(selectedSymbol, spotPrice))
    setLastUpdate(new Date())
  }, [selectedSymbol])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  const spotPrice = prices[selectedSymbol] ?? 23897
  const { indicators, signal, patterns, optionRec } = data

  const signalBg = signal.signal === 'BUY' ? 'bg-green-900/20 border-green-800' : signal.signal === 'SELL' ? 'bg-red-900/20 border-red-800' : 'bg-yellow-900/20 border-yellow-800'

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          AI Signal Analysis
        </h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Updated {lastUpdate.toLocaleTimeString('en-IN')}
        </div>
      </div>

      {/* Symbol Selector */}
      <div className="flex flex-wrap gap-2">
        {[...SYMBOLS, ...STOCKS].map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedSymbol === sym
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Live Price */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-gray-400">{selectedSymbol} Spot</div>
            <div className="text-4xl font-bold text-white mt-1">{spotPrice.toLocaleString('en-IN')}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Signal Strength</div>
            <div className="text-2xl font-bold text-blue-400">{signal.strength}%</div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${signal.signal === 'BUY' ? 'bg-green-400' : signal.signal === 'SELL' ? 'bg-red-400' : 'bg-yellow-400'}`}
            style={{ width: `${signal.strength}%` }}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Indicators */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Technical Indicators</h3>
          <div className="space-y-3">
            {[
              { label: 'RSI (14)', value: indicators.rsi.toFixed(2), status: indicators.rsi < 30 ? 'Oversold' : indicators.rsi > 70 ? 'Overbought' : 'Neutral', color: indicators.rsi < 30 ? 'text-green-400' : indicators.rsi > 70 ? 'text-red-400' : 'text-yellow-400' },
              { label: 'MACD', value: indicators.macd.toFixed(2), status: indicators.macd > 0 ? 'Bullish' : 'Bearish', color: indicators.macd > 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Signal Line', value: indicators.macdSignal.toFixed(2), status: `Histogram: ${indicators.macdHistogram.toFixed(2)}`, color: 'text-blue-400' },
              { label: 'EMA 9', value: indicators.ema9.toLocaleString('en-IN'), status: spotPrice > indicators.ema9 ? 'Above EMA' : 'Below EMA', color: spotPrice > indicators.ema9 ? 'text-green-400' : 'text-red-400' },
              { label: 'EMA 20', value: indicators.ema20.toLocaleString('en-IN'), status: spotPrice > indicators.ema20 ? 'Above EMA' : 'Below EMA', color: spotPrice > indicators.ema20 ? 'text-green-400' : 'text-red-400' },
              { label: 'EMA 50', value: indicators.ema50.toLocaleString('en-IN'), status: spotPrice > indicators.ema50 ? 'Above EMA' : 'Below EMA', color: spotPrice > indicators.ema50 ? 'text-green-400' : 'text-red-400' },
              { label: 'VWAP', value: indicators.vwap.toLocaleString('en-IN'), status: spotPrice > indicators.vwap ? 'Above VWAP' : 'Below VWAP', color: spotPrice > indicators.vwap ? 'text-green-400' : 'text-red-400' },
            ].map(({ label, value, status, color }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-400">{label}</span>
                <div className="text-right">
                  <span className="text-sm font-mono font-medium text-white">{value}</span>
                  <span className={`text-xs ml-2 ${color}`}>{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signal Card */}
        <div className="space-y-4">
          <div className={`border rounded-xl p-5 ${signalBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Trade Signal</h3>
              <SignalBadge signal={signal.signal} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900/60 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Entry</div>
                <div className="text-sm font-bold text-white mt-1">{signal.entry.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Stop Loss</div>
                <div className="text-sm font-bold text-red-400 mt-1">{signal.stopLoss.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Target</div>
                <div className="text-sm font-bold text-green-400 mt-1">{signal.target.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">{signal.reason}</p>
          </div>

          {/* Option Recommendation */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Option Trade Recommendation</h3>
            <div className="font-mono text-sm space-y-1.5">
              <div className="text-white font-bold text-base">
                {selectedSymbol} {optionRec.strike} {optionRec.type} (Monthly - {optionRec.month})
              </div>
              <div className="text-xs text-gray-500">Expiry: {optionRec.expiry}</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">BUY:</span>
                  <span className="text-green-400 font-bold">{optionRec.buy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Stoploss:</span>
                  <span className="text-red-400 font-bold">{optionRec.sl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target:</span>
                  <span className="text-green-400 font-bold">{optionRec.target}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-1 mt-1">
                  <span className="text-gray-400">R:R Ratio:</span>
                  <span className="text-blue-400 font-bold">1:{((optionRec.target - optionRec.buy) / (optionRec.buy - optionRec.sl)).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pattern Analysis */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Pattern Analysis</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {patterns.map((p) => (
            <div
              key={p.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                p.found
                  ? p.bias === 'bullish'
                    ? 'bg-green-900/20 border border-green-800 text-green-400'
                    : p.bias === 'bearish'
                    ? 'bg-red-900/20 border border-red-800 text-red-400'
                    : 'bg-yellow-900/20 border border-yellow-800 text-yellow-400'
                  : 'bg-gray-800/50 border border-gray-700 text-gray-600'
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${p.found ? (p.bias === 'bullish' ? 'bg-green-400' : 'bg-red-400') : 'bg-gray-600'}`} />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
