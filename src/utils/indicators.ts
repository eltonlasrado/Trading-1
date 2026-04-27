export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100
}

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return []
  const k = 2 / (period + 1)
  const ema: number[] = [prices[0]]
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 }

  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)

  const macdLine: number[] = []
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i])
  }

  const signalLine = calculateEMA(macdLine.slice(macdLine.length - 35), 9)
  const lastMacd = macdLine[macdLine.length - 1]
  const lastSignal = signalLine[signalLine.length - 1]

  return {
    macd: Math.round(lastMacd * 100) / 100,
    signal: Math.round(lastSignal * 100) / 100,
    histogram: Math.round((lastMacd - lastSignal) * 100) / 100,
  }
}

export function calculateVWAP(prices: number[], volumes: number[]): number {
  if (prices.length === 0 || volumes.length === 0) return 0
  let cumulativeTPV = 0
  let cumulativeVolume = 0
  const len = Math.min(prices.length, volumes.length)
  for (let i = 0; i < len; i++) {
    cumulativeTPV += prices[i] * volumes[i]
    cumulativeVolume += volumes[i]
  }
  if (cumulativeVolume === 0) return prices[prices.length - 1]
  return Math.round((cumulativeTPV / cumulativeVolume) * 100) / 100
}

export function generateSignal(
  rsi: number,
  macd: number,
  emaShort: number,
  emaLong: number,
  currentPrice: number
): { signal: 'BUY' | 'SELL' | 'HOLD'; strength: number; reason: string } {
  let bullishPoints = 0
  let bearishPoints = 0
  const reasons: string[] = []

  // RSI signals
  if (rsi < 30) {
    bullishPoints += 3
    reasons.push('RSI oversold')
  } else if (rsi < 45) {
    bullishPoints += 1
    reasons.push('RSI bullish zone')
  } else if (rsi > 70) {
    bearishPoints += 3
    reasons.push('RSI overbought')
  } else if (rsi > 55) {
    bearishPoints += 1
    reasons.push('RSI bearish zone')
  }

  // MACD signals
  if (macd > 0) {
    bullishPoints += 2
    reasons.push('MACD positive')
  } else if (macd < 0) {
    bearishPoints += 2
    reasons.push('MACD negative')
  }

  // EMA crossover
  if (emaShort > emaLong) {
    bullishPoints += 2
    reasons.push('EMA bullish crossover')
  } else {
    bearishPoints += 2
    reasons.push('EMA bearish crossover')
  }

  // Price vs VWAP (using emaLong as proxy)
  if (currentPrice > emaLong) {
    bullishPoints += 1
    reasons.push('Price above EMA')
  } else {
    bearishPoints += 1
    reasons.push('Price below EMA')
  }

  const total = bullishPoints + bearishPoints
  const strength = total > 0 ? Math.round((Math.max(bullishPoints, bearishPoints) / total) * 100) : 50

  if (bullishPoints > bearishPoints + 2) {
    return { signal: 'BUY', strength, reason: reasons.slice(0, 3).join(', ') }
  } else if (bearishPoints > bullishPoints + 2) {
    return { signal: 'SELL', strength, reason: reasons.slice(0, 3).join(', ') }
  }
  return { signal: 'HOLD', strength: 50, reason: 'Mixed signals - ' + reasons.slice(0, 2).join(', ') }
}
