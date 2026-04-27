import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => void
    }
  }
}

interface TradingViewWidgetProps {
  symbol?: string
  height?: number
  interval?: string
  chartType?: 'candlestick' | 'line' | 'bar' | 'area'
}

const chartTypeMap: Record<string, number> = {
  candlestick: 1,
  bar: 0,
  line: 2,
  area: 3,
}

export function TradingViewWidget({
  symbol = 'NSE:NIFTY',
  height = 500,
  interval = 'D',
  chartType = 'candlestick',
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<unknown>(null)

  useEffect(() => {
    const containerId = `tv_widget_${Math.random().toString(36).slice(2)}`
    if (containerRef.current) {
      containerRef.current.id = containerId
    }

    function initWidget() {
      if (!containerRef.current || !window.TradingView) return
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: 'Asia/Kolkata',
        theme: 'dark',
        style: String(chartTypeMap[chartType] ?? 1),
        locale: 'en',
        toolbar_bg: '#0f172a',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerId,
        hide_side_toolbar: false,
        withdateranges: true,
        save_image: false,
        studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'BB@tv-basicstudies'],
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        no_referral_id: true,
        backgroundColor: 'rgba(3, 7, 18, 1)',
        gridColor: 'rgba(55, 65, 81, 0.3)',
      })
    }

    if (window.TradingView) {
      initWidget()
    } else {
      // Check if script is already loading
      const existingScript = document.querySelector('script[src*="tradingview.com/tv.js"]')
      if (existingScript) {
        existingScript.addEventListener('load', initWidget)
      } else {
        const script = document.createElement('script')
        script.src = 'https://s3.tradingview.com/tv.js'
        script.async = true
        script.onload = initWidget
        document.head.appendChild(script)
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol, interval, chartType])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden"
    />
  )
}
