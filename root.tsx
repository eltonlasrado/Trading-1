// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import '../styles.css'

function ISTClock() {
  const [time, setTime] = useState('')
  const [isMarketOpen, setIsMarketOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      const ist = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
      const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      const h = istDate.getHours(), m = istDate.getMinutes()
      const day = istDate.getDay()
      const isWeekday = day >= 1 && day <= 5
      const isOpen = isWeekday && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30))
      setTime(ist)
      setIsMarketOpen(isOpen)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full animate-pulse ${isMarketOpen ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-xs font-mono text-gray-400">{time} IST</span>
      <span className={`text-xs font-semibold ${isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
        {isMarketOpen ? '● LIVE' : '● CLOSED'}
      </span>
    </div>
  )
}

const navLinks = [
  { to: '/', label: '📊 Dashboard', exact: true },
  { to: '/ai-signals', label: '🤖 AI Signals' },
  { to: '/option-chain', label: '⛓ Option Chain' },
  { to: '/trading-view', label: '📈 Charts' },
  { to: '/market-monitor', label: '🔭 Market Monitor' },
  { to: '/file-analysis', label: '📁 Expiry Analysis' },
  { to: '/ai-brain', label: '🧠 AI Brain' },
]

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="text-lg font-bold text-white">TradeIQ Pro</div>
          <div className="text-xs text-gray-500 mt-0.5">NSE • BSE • F&O</div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: 'bg-blue-900/50 text-blue-300 border-l-2 border-blue-400' }}
              inactiveProps={{ className: 'text-gray-400 hover:bg-gray-800 hover:text-white' }}
              className="block px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <ISTClock />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  ),
})
