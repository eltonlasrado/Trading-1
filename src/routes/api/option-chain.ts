import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/option-chain')({
  // @ts-expect-error - server handlers
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url)
        const symbol = url.searchParams.get('symbol') || 'NIFTY'
        try {
          const baseUrl = 'https://www.nseindia.com'
          const homeRes = await fetch(baseUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
          })
          const cookies = homeRes.headers.get('set-cookie') || ''
          const apiUrl = `${baseUrl}/api/option-chain-indices?symbol=${symbol}`
          const res = await fetch(apiUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/json',
              Cookie: cookies,
              Referer: baseUrl,
            },
          })
          if (!res.ok) throw new Error(`NSE returned ${res.status}`)
          const data = await res.json()
          return Response.json({ success: true, data })
        } catch (error) {
          return Response.json(
            { success: false, error: String(error) },
            { status: 500 }
          )
        }
      },
    },
  },
})
