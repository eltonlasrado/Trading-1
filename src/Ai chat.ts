// src/routes/api/ai-chat.ts
// POST /api/ai-chat
// Body: { messages: [...], context?: { symbol, quote, signal, optionChain } }

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are TradeIQ Pro's AI assistant — a world-class expert on Indian stock markets (NSE/BSE), F&O trading, and technical analysis.

You have deep expertise in:
- NSE/BSE equity and derivatives markets
- F&O (Futures & Options) trading strategies
- Technical analysis: RSI, MACD, EMA, Bollinger Bands, VWAP, candlestick patterns
- Option Greeks: Delta, Gamma, Theta, Vega
- Option strategies: Bull/Bear spreads, straddles, strangles, iron condors, covered calls
- Market microstructure: OI, PCR, IV, max pain, put-call parity
- FII/DII flows and their market impact
- India VIX and its implications
- Sector rotation and macro analysis
- Risk management and position sizing for Indian traders

When providing recommendations:
1. Always cite specific indicators and patterns that triggered the signal
2. Provide specific entry, stop-loss, and target levels with reasoning
3. For options, specify CE/PE, strike price, expiry, and premium range
4. Explain the risk-to-reward ratio
5. Mention any key support/resistance levels
6. Highlight any upcoming events (expiry, results, macro data) that could impact the trade
7. Rate confidence level (Low/Medium/High)

Always remind users that trading involves risk and past performance doesn't guarantee future results.
Use INR (₹) for all prices. Keep responses concise but comprehensive.`

export const APIRoute = createAPIFileRoute('/api/ai-chat')({
  POST: async ({ request }) => {
    try {
      const body = await request.json() as {
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        context?: {
          symbol?: string;
          ltp?: number;
          signal?: unknown;
          optionChain?: unknown;
          marketData?: unknown;
        };
      }

      const { messages, context } = body

      // Build context message if market data is provided
      let contextPrefix = ''
      if (context) {
        const parts: string[] = []
        if (context.symbol && context.ltp) {
          parts.push(`Current symbol: ${context.symbol} @ ₹${context.ltp}`)
        }
        if (context.signal) {
          const s = context.signal as Record<string, unknown>
          parts.push(`AI Signal: ${s['action']} (${s['strength']}, ${s['confidence']}% confidence)`)
          parts.push(`RSI: ${Number(s['rsi']).toFixed(1)}, Entry: ₹${s['entry']}, SL: ₹${s['stopLoss']}, T1: ₹${s['target1']}`)
          if (Array.isArray(s['indicators'])) parts.push(`Indicators: ${(s['indicators'] as string[]).join(', ')}`)
        }
        if (context.optionChain) {
          const oc = context.optionChain as Record<string, unknown>
          parts.push(`PCR: ${Number(oc['pcr']).toFixed(2)}, Max Pain: ₹${oc['maxPain']}, Underlying: ₹${oc['underlyingValue']}`)
        }
        if (parts.length > 0) {
          contextPrefix = `[Current Market Context]\n${parts.join('\n')}\n\n`
        }
      }

      // Inject context into first user message or latest
      const processedMessages = [...messages]
      if (contextPrefix && processedMessages.length > 0) {
        const last = processedMessages[processedMessages.length - 1]
        if (last.role === 'user') {
          processedMessages[processedMessages.length - 1] = {
            ...last,
            content: contextPrefix + last.content,
          }
        }
      }

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: processedMessages,
      })

      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n')

      return json({ ok: true, message: text, usage: response.usage })
    } catch (err) {
      console.error('ai-chat error:', err)
      return json({ ok: false, error: String(err) }, { status: 500 })
    }
  },
})
