import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { TradingViewWidget } from '@/components/TradingViewWidget'

export const Route = createFileRoute('/trading-view')({
  component: TradingViewPage,
})

const SYMBOLS = [
  { label: 'NIFTY 50', value: 'NSE:NIFTY' },
  { label: 'BANK NIFTY', value: 'NSE:BANKNIFTY' },
  { label: 'FIN NIFTY', value: 'NSE:FINNIFTY' },
  { label: 'SENSEX', value: 'BSE:SENSEX' },
  { label: 'MIDCAP NIFTY', value: 'NSE:MIDCPNIFTY' },
  { label: 'BANKEX', value: 'BSE:BANKEX' },
  { label: 'RELIANCE', value: 'NSE:RELIANCE' },
  { label: 'TCS', value: 'NSE:TCS' },
  { label: 'HDFC BANK', value: 'NSE:HDFCBANK' },
  { label: 'INFOSYS', value: 'NSE:INFY' },
  { label: 'ICICI BANK', value: 'NSE:ICICIBANK' },
]

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1h', value: '60' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
]

const CHART_TYPES = [
  { label: 'Candles', value: 'candlestick' as const },
  { label: 'Line', value: 'line' as const },
  { label: 'Bar', value: 'bar' as const },
  { label: 'Area', value: 'area' as const },
]

function TradingViewPage() {
  const [symbol, setSymbol] = useState('NSE:NIFTY')
  const [interval, setInterval] = useState('D')
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'bar' | 'area'>('candlestick')
  const [customSymbol, setCustomSymbol] = useState('')

  const activeSymbol = customSymbol.trim() ? customSymbol.trim().toUpperCase() : symbol

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-blue-400" />
        Advanced Charts
      </h1>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        {/* Symbol */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Symbol</label>
          <div className="flex flex-wrap gap-2">
            {SYMBOLS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setSymbol(value); setCustomSymbol('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  symbol === value && !customSymbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              placeholder="Custom symbol (e.g. NSE:TATAMOTORS)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Interval + Chart Type */}
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Interval</label>
            <div className="flex gap-1">
              {INTERVALS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setInterval(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    interval === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Chart Type</label>
            <div className="flex gap-1">
              {CHART_TYPES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setChartType(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    chartType === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <TradingViewWidget
          symbol={activeSymbol}
          interval={interval}
          chartType={chartType}
          height={580}
        />
      </div>

      <p className="text-xs text-gray-600 text-center">
        Charts powered by TradingView. All market data is delayed.
      </p>
    </div>
  )
}
