import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

export const Route = createFileRoute('/api/ai-chat')({
  // @ts-expect-error - server handlers
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages, context } = await request.json()
        const anthropic = new Anthropic()
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          system: `You are TradeIQ Pro AI, an expert in Indian stock markets, options trading, F&O analysis, and technical analysis. You help traders analyze opportunities, understand Greeks, and make informed decisions about NSE/BSE markets including Nifty, BankNifty, Finnifty and individual stocks. Current date: ${new Date().toLocaleDateString('en-IN')}`,
          messages: messages || [{ role: 'user', content: context || 'Hello' }],
        })
        return Response.json({
          response:
            response.content[0].type === 'text'
              ? response.content[0].text
              : 'Unable to process',
        })
      },
    },
  },
})
