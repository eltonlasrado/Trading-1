// ─── Technical Indicator Library ───────────────────────────────────────────

export function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function calcEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++)
    result.push(prices[i] * k + result[i - 1] * (1 - k));
  return result;
}

export function calcSMA(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function calcMACD(prices: number[]): {
  macd: number; signal: number; histogram: number;
} {
  if (prices.length < 35) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine.slice(-9), 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

export function calcVWAP(prices: number[], volumes: number[]): number {
  let sumPV = 0, sumV = 0;
  for (let i = 0; i < prices.length; i++) {
    sumPV += prices[i] * (volumes[i] || 1);
    sumV += volumes[i] || 1;
  }
  return sumV > 0 ? sumPV / sumV : prices[prices.length - 1];
}

export function calcBollingerBands(
  prices: number[], period = 20, mult = 2,
): { upper: number; middle: number; lower: number } {
  const slice = prices.slice(-period);
  if (slice.length === 0) return { upper: 0, middle: 0, lower: 0 };
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, p) => a + Math.pow(p - middle, 2), 0) / slice.length;
  const sd = Math.sqrt(variance);
  return { upper: middle + mult * sd, middle, lower: middle - mult * sd };
}

export function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, trs.length);
}

export function calcStochastic(
  highs: number[], lows: number[], closes: number[], period = 14,
): { k: number; d: number } {
  const slice = { highs: highs.slice(-period), lows: lows.slice(-period) };
  const highestHigh = Math.max(...slice.highs);
  const lowestLow = Math.min(...slice.lows);
  const close = closes[closes.length - 1];
  const k = highestHigh === lowestLow ? 50 : ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
  const prevK = closes.slice(-period - 3, -3).length > 0
    ? (() => {
        const ph = Math.max(...highs.slice(-period - 3, -3));
        const pl = Math.min(...lows.slice(-period - 3, -3));
        const pc = closes[closes.length - 4] ?? close;
        return ph === pl ? 50 : ((pc - pl) / (ph - pl)) * 100;
      })()
    : k;
  return { k, d: (k + prevK) / 2 };
}

// ─── Signal Types ───────────────────────────────────────────────────────────

export interface OptionRec {
  type: 'CE' | 'PE' | 'NEUTRAL';
  expiry: string;
  strike: number;
  buyPrice: number;
  sellPrice: number;
  holdPrice: number;
  reason: string;
}

export interface Signal {
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  ema200: number;
  vwap: number;
  bb: { upper: number; middle: number; lower: number };
  atr: number;
  stoch: { k: number; d: number };
  indicators: string[];
  patterns: string[];
  optionRecommendation: OptionRec | null;
  confidence: number; // 0-100
}

// ─── Main Signal Generator ──────────────────────────────────────────────────

export function generateSignal(
  ltp: number,
  prices: number[],
  volumes: number[],
  strikeStep = 50,
  isIndex = true,
): Signal {
  // Pad prices if too short
  while (prices.length < 60) prices.unshift(ltp * (1 + (Math.random() - 0.5) * 0.002));
  const highs = prices.map((p) => p * 1.002);
  const lows = prices.map((p) => p * 0.998);

  const rsi = calcRSI(prices);
  const macd = calcMACD(prices);
  const ema20 = calcEMA(prices, 20).at(-1) ?? ltp;
  const ema50 = calcEMA(prices, 50).at(-1) ?? ltp;
  const ema200 = calcEMA(prices, 200).at(-1) ?? ltp;
  const vwap = calcVWAP(prices, volumes);
  const bb = calcBollingerBands(prices);
  const atr = calcATR(highs, lows, prices);
  const stoch = calcStochastic(highs, lows, prices);

  let bull = 0, bear = 0;
  const indicators: string[] = [];
  const patterns: string[] = [];

  // RSI scoring
  if (rsi <= 20) { bull += 4; indicators.push(`RSI Deeply Oversold (${rsi.toFixed(1)})`); patterns.push('RSI Extreme Reversal Zone'); }
  else if (rsi <= 30) { bull += 3; indicators.push(`RSI Oversold (${rsi.toFixed(1)})`); patterns.push('RSI Reversal Signal'); }
  else if (rsi <= 45) { bull += 1; indicators.push(`RSI Bullish (${rsi.toFixed(1)})`); }
  else if (rsi >= 80) { bear += 4; indicators.push(`RSI Extremely Overbought (${rsi.toFixed(1)})`); patterns.push('RSI Exhaustion Pattern'); }
  else if (rsi >= 70) { bear += 3; indicators.push(`RSI Overbought (${rsi.toFixed(1)})`); patterns.push('RSI Divergence Risk'); }
  else if (rsi >= 55) { bear += 1; indicators.push(`RSI Bearish (${rsi.toFixed(1)})`); }

  // MACD scoring
  if (macd.histogram > 0 && macd.macd > macd.signal) {
    bull += 2; indicators.push('MACD Bullish Crossover'); patterns.push('MACD Golden Cross');
  } else if (macd.histogram < 0 && macd.macd < macd.signal) {
    bear += 2; indicators.push('MACD Bearish Crossover'); patterns.push('MACD Death Cross');
  }
  if (macd.macd > 0) { bull += 1; indicators.push('MACD Above Zero Line'); }
  else { bear += 1; indicators.push('MACD Below Zero Line'); }

  // EMA scoring
  if (ltp > ema20 && ema20 > ema50 && ema50 > ema200) {
    bull += 3; indicators.push('Price > EMA20 > EMA50 > EMA200'); patterns.push('EMA Perfect Bull Alignment');
  } else if (ltp < ema20 && ema20 < ema50 && ema50 < ema200) {
    bear += 3; indicators.push('Price < EMA20 < EMA50 < EMA200'); patterns.push('EMA Perfect Bear Alignment');
  } else if (ltp > ema20 && ema20 > ema50) {
    bull += 2; indicators.push('Price > EMA20 > EMA50'); patterns.push('EMA Bull Trend');
  } else if (ltp < ema20 && ema20 < ema50) {
    bear += 2; indicators.push('Price < EMA20 < EMA50'); patterns.push('EMA Bear Trend');
  }

  // VWAP scoring
  if (ltp > vwap * 1.003) { bull += 2; indicators.push('Strong Price Above VWAP'); }
  else if (ltp > vwap) { bull += 1; indicators.push('Price Above VWAP'); }
  else if (ltp < vwap * 0.997) { bear += 2; indicators.push('Strong Price Below VWAP'); }
  else { bear += 1; indicators.push('Price Below VWAP'); }

  // Bollinger Bands scoring
  if (ltp <= bb.lower) {
    bull += 3; indicators.push('Price at/Below Lower BB'); patterns.push('BB Oversold Bounce Setup');
  } else if (ltp >= bb.upper) {
    bear += 3; indicators.push('Price at/Above Upper BB'); patterns.push('BB Overbought Reversal Setup');
  } else if (ltp > bb.middle) {
    bull += 1; indicators.push('Price Above BB Midline');
  } else {
    bear += 1; indicators.push('Price Below BB Midline');
  }

  // Stochastic scoring
  if (stoch.k < 20 && stoch.d < 20) { bull += 2; indicators.push(`Stochastic Oversold (K:${stoch.k.toFixed(0)})`); patterns.push('Stochastic Bull Crossover Zone'); }
  else if (stoch.k > 80 && stoch.d > 80) { bear += 2; indicators.push(`Stochastic Overbought (K:${stoch.k.toFixed(0)})`); patterns.push('Stochastic Bear Crossover Zone'); }

  // Determine action
  const net = bull - bear;
  let action: Signal['action'];
  let strength: Signal['strength'];
  if (net >= 8) { action = 'BUY'; strength = 'STRONG'; }
  else if (net >= 4) { action = 'BUY'; strength = 'MODERATE'; }
  else if (net >= 2) { action = 'BUY'; strength = 'WEAK'; }
  else if (net <= -8) { action = 'SELL'; strength = 'STRONG'; }
  else if (net <= -4) { action = 'SELL'; strength = 'MODERATE'; }
  else if (net <= -2) { action = 'SELL'; strength = 'WEAK'; }
  else { action = 'HOLD'; strength = 'WEAK'; }

  const confidence = Math.min(100, Math.round(Math.abs(net) * 8 + 20));

  // Compute levels
  const sl = atr * 1.5 || ltp * 0.01;
  const stopLoss = action === 'BUY' ? ltp - sl : ltp + sl;
  const target1 = action === 'BUY' ? ltp + atr : ltp - atr;
  const target2 = action === 'BUY' ? ltp + atr * 2 : ltp - atr * 2;
  const target3 = action === 'BUY' ? ltp + atr * 3 : ltp - atr * 3;

  // Option recommendation
  let optionRecommendation: OptionRec | null = null;
  if (action !== 'HOLD') {
    const roundToStrike = (p: number) => Math.round(p / strikeStep) * strikeStep;
    const today = new Date();
    const daysToThursday = ((4 - today.getDay() + 7) % 7) || 7;
    const expDate = new Date(today);
    expDate.setDate(today.getDate() + daysToThursday);
    const expiry = expDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const strike = roundToStrike(ltp);
    const premiumEst = Math.max(isIndex ? 50 : ltp * 0.015, 20);
    const type = action === 'BUY' ? 'CE' : 'PE';
    const topPattern = patterns[0] ?? 'Technical Signal';
    const topIndicator = indicators[0] ?? 'Multiple Indicators';

    optionRecommendation = {
      type, expiry, strike,
      buyPrice: Math.round(premiumEst * 0.95),
      sellPrice: Math.round(premiumEst * 1.30),
      holdPrice: Math.round(premiumEst * 1.12),
      reason: `${strength} ${action} signal (Confidence ${confidence}%). ${topPattern} + ${topIndicator}. ` +
        `Entry at ₹${ltp.toFixed(2)}, Stop Loss ₹${stopLoss.toFixed(2)}, Target ₹${target1.toFixed(2)}–₹${target3.toFixed(2)}. ` +
        `Recommend buying ${strike}${type} expiring ${expiry} at ₹${Math.round(premiumEst * 0.95)}.`,
    };
  }

  return {
    action, strength, confidence, entry: ltp, stopLoss, target1, target2, target3,
    rsi, macd, ema20, ema50, ema200, vwap, bb, atr, stoch, indicators, patterns,
    optionRecommendation,
  };
}
