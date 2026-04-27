import { createFileRoute } from '@tanstack/react-router'
import { getIndexSpotPrices } from '@/utils/marketData'

export const Route = createFileRoute('/api/market-data')({
  // @ts-expect-error - server handlers
  server: {
    handlers: {
      GET: async () => {
        const prices = getIndexSpotPrices()

        const vix = Math.round((13.5 + Math.random() * 4) * 100) / 100

        const fiiDii = [
          {
            date: new Date().toLocaleDateString('en-IN'),
            fiiBuy: Math.round(5000 + Math.random() * 8000),
            fiiSell: Math.round(4000 + Math.random() * 8000),
            diiBuy: Math.round(3000 + Math.random() * 6000),
            diiSell: Math.round(2500 + Math.random() * 5000),
          },
        ]

        const pcr: Record<string, number> = {
          NIFTY: Math.round((0.8 + Math.random() * 0.6) * 100) / 100,
          BANKNIFTY: Math.round((0.7 + Math.random() * 0.7) * 100) / 100,
          FINNIFTY: Math.round((0.75 + Math.random() * 0.6) * 100) / 100,
        }

        const breadth = {
          advances: Math.floor(900 + Math.random() * 600),
          declines: Math.floor(300 + Math.random() * 600),
          unchanged: Math.floor(50 + Math.random() * 100),
        }

        return Response.json({
          prices,
          vix,
          fiiDii,
          pcr,
          breadth,
          timestamp: new Date().toISOString(),
        })
      },
    },
  },
})
