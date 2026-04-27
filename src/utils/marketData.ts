export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: number
}

export function generateOHLCV(basePrice: number, volatility: number, bars: number): OHLCV[] {
  const result: OHLCV[] = []
  let price = basePrice
  const now = Date.now()
  const barMs = 5 * 60 * 1000 // 5 min bars

  for (let i = bars - 1; i >= 0; i--) {
    const open = price
    const change = (Math.random() - 0.48) * volatility * price
    const close = Math.max(price + change, price * 0.9)
    const high = Math.max(open, close) * (1 + Math.random() * 0.005)
    const low = Math.min(open, close) * (1 - Math.random() * 0.005)
    const volume = Math.floor(50000 + Math.random() * 200000)

    result.push({
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
      time: now - i * barMs,
    })

    price = close
  }

  return result
}

const basePrices: Record<string, number> = {
  NIFTY: 23897,
  BANKNIFTY: 56089,
  FINNIFTY: 26141,
  SENSEX: 76664,
  MIDCPNIFTY: 12500,
  BANKEX: 56500,
}

export function getIndexSpotPrices(): Record<string, number> {
  const prices: Record<string, number> = {}
  for (const [key, base] of Object.entries(basePrices)) {
    const fluctuation = (Math.random() - 0.5) * 0.004 * base
    prices[key] = Math.round((base + fluctuation) * 100) / 100
  }
  return prices
}

export interface OptionData {
  strikePrice: number
  CE: {
    openInterest: number
    changeinOpenInterest: number
    totalTradedVolume: number
    impliedVolatility: number
    lastPrice: number
    change: number
  }
  PE: {
    openInterest: number
    changeinOpenInterest: number
    totalTradedVolume: number
    impliedVolatility: number
    lastPrice: number
    change: number
  }
}

export function generateOptionChainData(symbol: string, spotPrice: number): OptionData[] {
  const strikes = getStrikes(symbol, spotPrice)
  return strikes.map((strike) => {
    const moneyness = (spotPrice - strike) / spotPrice
    const atmness = Math.abs(moneyness)

    // CE pricing
    const ceIV = 12 + atmness * 80 + Math.random() * 3
    const ceIntrinsic = Math.max(0, spotPrice - strike)
    const ceTimeValue = Math.max(1, (ceIV / 100) * spotPrice * 0.15 * Math.exp(-atmness * 8))
    const ceLTP = Math.round((ceIntrinsic + ceTimeValue) * 100) / 100

    // PE pricing
    const peIV = 13 + atmness * 80 + Math.random() * 3
    const peIntrinsic = Math.max(0, strike - spotPrice)
    const peTimeValue = Math.max(1, (peIV / 100) * spotPrice * 0.15 * Math.exp(-atmness * 8))
    const peLTP = Math.round((peIntrinsic + peTimeValue) * 100) / 100

    const ceOI = Math.floor((Math.random() * 0.5 + 0.1) * 1000000 * Math.exp(-atmness * 5))
    const peOI = Math.floor((Math.random() * 0.5 + 0.1) * 1000000 * Math.exp(-atmness * 5))

    return {
      strikePrice: strike,
      CE: {
        openInterest: ceOI,
        changeinOpenInterest: Math.floor((Math.random() - 0.4) * ceOI * 0.15),
        totalTradedVolume: Math.floor(ceOI * (0.05 + Math.random() * 0.1)),
        impliedVolatility: Math.round(ceIV * 100) / 100,
        lastPrice: ceLTP,
        change: Math.round((Math.random() - 0.45) * ceLTP * 0.1 * 100) / 100,
      },
      PE: {
        openInterest: peOI,
        changeinOpenInterest: Math.floor((Math.random() - 0.4) * peOI * 0.15),
        totalTradedVolume: Math.floor(peOI * (0.05 + Math.random() * 0.1)),
        impliedVolatility: Math.round(peIV * 100) / 100,
        lastPrice: peLTP,
        change: Math.round((Math.random() - 0.45) * peLTP * 0.1 * 100) / 100,
      },
    }
  })
}

function getStrikeInterval(symbol: string): number {
  const intervals: Record<string, number> = {
    NIFTY: 50,
    BANKNIFTY: 100,
    FINNIFTY: 50,
    SENSEX: 100,
    MIDCPNIFTY: 25,
    BANKEX: 100,
  }
  return intervals[symbol] || 50
}

function getStrikes(symbol: string, spotPrice: number): number[] {
  const interval = getStrikeInterval(symbol)
  const atmStrike = Math.round(spotPrice / interval) * interval
  const strikes: number[] = []
  for (let i = -12; i <= 12; i++) {
    strikes.push(atmStrike + i * interval)
  }
  return strikes
}

export function getATMStrike(symbol: string, spotPrice: number): number {
  const interval = getStrikeInterval(symbol)
  return Math.round(spotPrice / interval) * interval
}

export function getCurrentMonthlyExpiry(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  // Last Thursday of the month
  const lastDay = new Date(year, month + 1, 0)
  const dayOfWeek = lastDay.getDay()
  const daysToThursday = (dayOfWeek >= 4) ? dayOfWeek - 4 : dayOfWeek + 3
  const lastThursday = new Date(lastDay)
  lastThursday.setDate(lastDay.getDate() - daysToThursday)

  // If already past, use next month's last Thursday
  if (lastThursday < now) {
    const nextMonth = new Date(year, month + 2, 0)
    const nDow = nextMonth.getDay()
    const nDays = (nDow >= 4) ? nDow - 4 : nDow + 3
    nextMonth.setDate(nextMonth.getDate() - nDays)
    return nextMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return lastThursday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getMonthLabel(): string {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[now.getMonth()] + ' ' + now.getFullYear()
}
