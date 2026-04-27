// ─── Market Data Types & Constants ─────────────────────────────────────────

export interface IndexInfo {
  symbol: string;
  name: string;
  type: 'nse-index' | 'bse-index';
  strikeStep: number;
  nseKey: string; // key in NSE allIndices response
}

export const ALL_INDICES: IndexInfo[] = [
  { symbol: 'NIFTY', name: 'Nifty 50', type: 'nse-index', strikeStep: 50, nseKey: 'NIFTY 50' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', type: 'nse-index', strikeStep: 100, nseKey: 'NIFTY BANK' },
  { symbol: 'FINNIFTY', name: 'Fin Nifty', type: 'nse-index', strikeStep: 50, nseKey: 'NIFTY FIN SERVICE' },
  { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select', type: 'nse-index', strikeStep: 25, nseKey: 'NIFTY MIDCAP SELECT' },
  { symbol: 'NIFTYNXT50', name: 'Nifty Next 50', type: 'nse-index', strikeStep: 100, nseKey: 'NIFTY NEXT 50' },
  { symbol: 'SENSEX', name: 'BSE Sensex', type: 'bse-index', strikeStep: 100, nseKey: 'S&P BSE SENSEX' },
  { symbol: 'BANKEX', name: 'BSE Bankex', type: 'bse-index', strikeStep: 100, nseKey: 'S&P BSE BANKEX' },
];

// All F&O eligible stocks on NSE (as of 2025)
export const FNO_STOCKS: string[] = [
  // Nifty 50 constituents
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','SBIN','BHARTIARTL',
  'ITC','KOTAKBANK','LT','AXISBANK','ASIANPAINT','MARUTI','SUNPHARMA','TITAN',
  'BAJFINANCE','WIPRO','ONGC','NTPC','POWERGRID','ULTRACEMCO','M&M','TATAMOTORS',
  'HCLTECH','ADANIENT','ADANIPORTS','COALINDIA','BAJAJFINSV','GRASIM','APOLLOHOSP',
  'DIVISLAB','DRREDDY','EICHERMOT','HEROMOTOCO','HINDALCO','JSWSTEEL','NESTLEIND',
  'SBILIFE','TATASTEEL','TECHM','TATACONSUM','BRITANNIA','CIPLA','INDUSINDBK',
  'BPCL','HDFCLIFE','SHRIRAMFIN','BAJAJ-AUTO','UPL',
  // Other popular F&O
  'MCDOWELL-N','PIDILITIND','LTIM','PERSISTENT','COFORGE','MPHASIS','HAL','BEL',
  'BHEL','IOC','GAIL','RECLTD','PFC','IRFC','NBCC','RVNL','IRCTC','ZOMATO',
  'PAYTM','NYKAA','POLICYBZR','DELHIVERY','TATACHEM','VEDL','SAIL','NATIONALUM',
  'NMDC','BANKBARODA','PNB','CANBK','UNIONBANK','FEDERALBNK','RBLBANK',
  'BANDHANBNK','IDFCFIRSTB','MOTHERSON','BALKRISIND','APOLLOTYRE','TVSMOTOR',
  'VOLTAS','HAVELLS','CROMPTON','POLYCAB','ABB','SIEMENS','BOSCHLTD',
  'MUTHOOTFIN','CHOLAFIN','M&MFIN','LICHSGFIN','MANAPPURAM',
  'AUROPHARMA','LUPIN','ALKEM','BIOCON','IPCALAB','TORNTPHARM',
  'ICICIGI','NIACL','STARHEALTH','MAXHEALTH','FORTIS',
  'CONCOR','GMRINFRA','ADANIGREEN','ADANITRANS','ADANIPOWER',
  'TATAPOWER','TORNTPOWER','CESC','JSWENERGY',
  'DLF','GODREJPROP','PRESTIGE','OBEROIRLTY','PHOENIXLTD',
  'PAGEIND','MARIS','VBL','RADICO','UNITDSPR',
  'IDEA','INDUSTOWER','ROUTE','TATACOMM',
  'SRF','AARTIIND','DEEPAKFERT','GNFC','COROMANDEL',
  'CGPOWER','SUZLON','CUMMINSIND','ELGIEQUIP','TIMKEN',
];

export interface IndexQuote {
  symbol: string;
  name: string;
  last: number;
  change: number;
  pChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  pcr?: number;
  vix?: number;
}

export interface OptionStrike {
  strikePrice: number;
  CE?: OptionLeg;
  PE?: OptionLeg;
}

export interface OptionLeg {
  openInterest: number;
  changeinOpenInterest: number;
  impliedVolatility: number;
  lastPrice: number;
  change: number;
  pChange: number;
  totalTradedVolume: number;
  bidprice: number;
  askPrice: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChainResponse {
  symbol: string;
  underlyingValue: number;
  expiryDates: string[];
  selectedExpiry: string;
  data: OptionStrike[];
  pcr: number;
  maxPain: number;
  totalCEOI: number;
  totalPEOI: number;
  timestamp: string;
}

export interface FIIDIIData {
  date: string;
  fiiNetBuy: number;
  diiNetBuy: number;
  fiiBuy: number;
  fiiSell: number;
  diiBuy: number;
  diiSell: number;
}

export interface MarketStatus {
  market: string;
  marketStatus: string;
  tradeDate: string;
  index: string;
  last: number;
  variation: number;
  percentChange: number;
  marketStatusMessage: string;
}
