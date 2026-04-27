/* ═══════════════════════════════════════════════════════════════════════
   ALADDIN F&O TERMINAL v3 — App.jsx
   AI-Powered Indian Derivatives Terminal | NSE · BSE · Live Data
   ─────────────────────────────────────────────────────────────────────
   Data Sources:
     • Yahoo Finance API (live quotes via CORS proxy)
     • NSE India public API (option chain, market depth)
     • BSE India news feed
     • World Monitor (https://www.worldmonitor.app/)
     • Economic Times Markets RSS
   AI: Anthropic Claude API (user provides key in Settings)
   Charts: TradingView Advanced Widget (1m live candles)
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ─────────────────────────────── CONSTANTS ──────────────────────────── */

const CORS1 = "https://corsproxy.io/?";
const CORS2 = "https://api.allorigins.win/raw?url=";
const YF_BASE = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=";
const YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/";
const NSE_BASE = "https://www.nseindia.com/api/";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const RF_RATE = 0.065; // 6.5% RBI repo rate

/* ───────────────────────── SYMBOL UNIVERSE ─────────────────────────── */

const INDICES = [
  { id:"NIFTY",      yf:"^NSEI",               nse:"NIFTY 50",          tv:"NSE:NIFTY50",    base:22480,lot:75,  strike:50,  label:"NIFTY 50",    exch:"NSE",color:"#00aaff" },
  { id:"BANKNIFTY",  yf:"^NSEBANK",             nse:"NIFTY BANK",        tv:"NSE:BANKNIFTY",  base:48200,lot:30,  strike:100, label:"BANK NIFTY",  exch:"NSE",color:"#ffbb00" },
  { id:"FINNIFTY",   yf:"NIFTY_FIN_SERVICE.NS", nse:"NIFTY FIN SERVICE", tv:"NSE:FINNIFTY",   base:23150,lot:65,  strike:50,  label:"FIN NIFTY",   exch:"NSE",color:"#bb77ff" },
  { id:"MIDCPNIFTY", yf:"NIFTYMIDCAP50.NS",     nse:"NIFTY MIDCAP 50",   tv:"NSE:MIDCPNIFTY", base:12750,lot:75,  strike:25,  label:"MIDCAP NIFTY",exch:"NSE",color:"#00ffcc" },
  { id:"SENSEX",     yf:"^BSESN",               nse:null,                tv:"BSE:SENSEX",     base:74200,lot:20,  strike:100, label:"BSE SENSEX",  exch:"BSE",color:"#ff7722" },
  { id:"BANKEX",     yf:"BANKEX.BO",             nse:null,                tv:"BSE:BANKEX",     base:57800,lot:20,  strike:100, label:"BSE BANKEX",  exch:"BSE",color:"#ff3d5a" },
];

const FNO_RAW = [
  // ── IT ──
  { id:"TCS",        yf:"TCS.NS",        tv:"NSE:TCS",        base:4050, lot:150,  strike:50,  cat:"IT",      label:"TCS"          },
  { id:"INFY",       yf:"INFY.NS",       tv:"NSE:INFY",       base:1920, lot:400,  strike:20,  cat:"IT",      label:"Infosys"      },
  { id:"WIPRO",      yf:"WIPRO.NS",      tv:"NSE:WIPRO",      base:560,  lot:1500, strike:5,   cat:"IT",      label:"Wipro"        },
  { id:"HCLTECH",    yf:"HCLTECH.NS",    tv:"NSE:HCLTECH",    base:1850, lot:350,  strike:20,  cat:"IT",      label:"HCL Tech"     },
  { id:"TECHM",      yf:"TECHM.NS",      tv:"NSE:TECHM",      base:1580, lot:400,  strike:20,  cat:"IT",      label:"Tech Mahindra"},
  { id:"LTIM",       yf:"LTIM.NS",       tv:"NSE:LTIM",       base:5800, lot:150,  strike:50,  cat:"IT",      label:"LTIMindtree"  },
  { id:"PERSISTENT", yf:"PERSISTENT.NS", tv:"NSE:PERSISTENT", base:6200, lot:125,  strike:50,  cat:"IT",      label:"Persistent"   },
  { id:"MPHASIS",    yf:"MPHASIS.NS",    tv:"NSE:MPHASIS",    base:2900, lot:325,  strike:50,  cat:"IT",      label:"Mphasis"      },
  // ── BANKING ──
  { id:"HDFCBANK",   yf:"HDFCBANK.NS",   tv:"NSE:HDFCBANK",   base:1650, lot:550,  strike:20,  cat:"BANK",    label:"HDFC Bank"    },
  { id:"ICICIBANK",  yf:"ICICIBANK.NS",  tv:"NSE:ICICIBANK",  base:1280, lot:700,  strike:10,  cat:"BANK",    label:"ICICI Bank"   },
  { id:"KOTAKBANK",  yf:"KOTAKBANK.NS",  tv:"NSE:KOTAKBANK",  base:1900, lot:400,  strike:20,  cat:"BANK",    label:"Kotak Bank"   },
  { id:"AXISBANK",   yf:"AXISBANK.NS",   tv:"NSE:AXISBANK",   base:1180, lot:625,  strike:10,  cat:"BANK",    label:"Axis Bank"    },
  { id:"SBIN",       yf:"SBIN.NS",       tv:"NSE:SBIN",       base:820,  lot:1500, strike:10,  cat:"BANK",    label:"SBI"          },
  { id:"INDUSINDBK", yf:"INDUSINDBK.NS", tv:"NSE:INDUSINDBK", base:1050, lot:600,  strike:10,  cat:"BANK",    label:"IndusInd Bank"},
  { id:"BANKBARODA", yf:"BANKBARODA.NS", tv:"NSE:BANKBARODA", base:260,  lot:4200, strike:5,   cat:"BANK",    label:"Bank of Baroda"},
  { id:"PNB",        yf:"PNB.NS",        tv:"NSE:PNB",        base:115,  lot:8000, strike:2,   cat:"BANK",    label:"PNB"          },
  { id:"CANBK",      yf:"CANBK.NS",      tv:"NSE:CANBK",      base:110,  lot:9000, strike:2,   cat:"BANK",    label:"Canara Bank"  },
  { id:"FEDERALBNK", yf:"FEDERALBNK.NS", tv:"NSE:FEDERALBNK", base:195,  lot:5000, strike:5,   cat:"BANK",    label:"Federal Bank" },
  { id:"IDFCFIRSTB", yf:"IDFCFIRSTB.NS", tv:"NSE:IDFCFIRSTB", base:85,   lot:10000,strike:2,   cat:"BANK",    label:"IDFC First"   },
  // ── FINSERV ──
  { id:"BAJFINANCE", yf:"BAJFINANCE.NS", tv:"NSE:BAJFINANCE", base:6800, lot:125,  strike:50,  cat:"FINSERV", label:"Bajaj Finance"},
  { id:"BAJAJFINSV", yf:"BAJAJFINSV.NS", tv:"NSE:BAJAJFINSV", base:1850, lot:500,  strike:20,  cat:"FINSERV", label:"Bajaj Finserv"},
  { id:"HDFCLIFE",   yf:"HDFCLIFE.NS",   tv:"NSE:HDFCLIFE",   base:680,  lot:1100, strike:10,  cat:"FINSERV", label:"HDFC Life"    },
  { id:"SBILIFE",    yf:"SBILIFE.NS",    tv:"NSE:SBILIFE",    base:1680, lot:375,  strike:20,  cat:"FINSERV", label:"SBI Life"     },
  { id:"ICICIGI",    yf:"ICICIGI.NS",    tv:"NSE:ICICIGI",    base:1920, lot:375,  strike:20,  cat:"FINSERV", label:"ICICI Lombard"},
  { id:"MUTHOOTFIN", yf:"MUTHOOTFIN.NS", tv:"NSE:MUTHOOTFIN", base:2200, lot:300,  strike:50,  cat:"FINSERV", label:"Muthoot Fin"  },
  // ── ENERGY ──
  { id:"RELIANCE",   yf:"RELIANCE.NS",   tv:"NSE:RELIANCE",   base:1280, lot:250,  strike:20,  cat:"ENERGY",  label:"Reliance"     },
  { id:"ONGC",       yf:"ONGC.NS",       tv:"NSE:ONGC",       base:275,  lot:3850, strike:5,   cat:"ENERGY",  label:"ONGC"         },
  { id:"BPCL",       yf:"BPCL.NS",       tv:"NSE:BPCL",       base:325,  lot:2200, strike:5,   cat:"ENERGY",  label:"BPCL"         },
  { id:"IOC",        yf:"IOC.NS",        tv:"NSE:IOC",        base:145,  lot:5500, strike:5,   cat:"ENERGY",  label:"IOC"          },
  { id:"HINDPETRO",  yf:"HINDPETRO.NS",  tv:"NSE:HINDPETRO",  base:530,  lot:1400, strike:10,  cat:"ENERGY",  label:"HPCL"         },
  { id:"COALINDIA",  yf:"COALINDIA.NS",  tv:"NSE:COALINDIA",  base:430,  lot:2100, strike:5,   cat:"ENERGY",  label:"Coal India"   },
  { id:"VEDL",       yf:"VEDL.NS",       tv:"NSE:VEDL",       base:465,  lot:2000, strike:5,   cat:"ENERGY",  label:"Vedanta"      },
  // ── AUTO ──
  { id:"MARUTI",     yf:"MARUTI.NS",     tv:"NSE:MARUTI",     base:12500,lot:100,  strike:100, cat:"AUTO",    label:"Maruti Suzuki"},
  { id:"TATAMOTORS", yf:"TATAMOTORS.NS", tv:"NSE:TATAMOTORS", base:780,  lot:1400, strike:10,  cat:"AUTO",    label:"Tata Motors"  },
  { id:"BAJAJ_AUTO", yf:"BAJAJ-AUTO.NS", tv:"NSE:BAJAJ_AUTO", base:9500, lot:75,   strike:100, cat:"AUTO",    label:"Bajaj Auto"   },
  { id:"HEROMOTOCO", yf:"HEROMOTOCO.NS", tv:"NSE:HEROMOTOCO", base:4800, lot:150,  strike:50,  cat:"AUTO",    label:"Hero Moto"    },
  { id:"M_M",        yf:"M&M.NS",        tv:"NSE:M_M",        base:2900, lot:175,  strike:50,  cat:"AUTO",    label:"M&M"          },
  { id:"EICHERMOT",  yf:"EICHERMOT.NS",  tv:"NSE:EICHERMOT",  base:5100, lot:125,  strike:50,  cat:"AUTO",    label:"Eicher Motors"},
  { id:"TVSMOTOR",   yf:"TVSMOTOR.NS",   tv:"NSE:TVSMOTOR",   base:2400, lot:350,  strike:50,  cat:"AUTO",    label:"TVS Motor"    },
  // ── INFRA ──
  { id:"LT",         yf:"LT.NS",         tv:"NSE:LT",         base:3650, lot:175,  strike:50,  cat:"INFRA",   label:"L&T"          },
  { id:"ULTRACEMCO", yf:"ULTRACEMCO.NS", tv:"NSE:ULTRACEMCO", base:11500,lot:100,  strike:100, cat:"INFRA",   label:"UltraTech Cem"},
  { id:"GRASIM",     yf:"GRASIM.NS",     tv:"NSE:GRASIM",     base:2800, lot:175,  strike:50,  cat:"INFRA",   label:"Grasim"       },
  { id:"NTPC",       yf:"NTPC.NS",       tv:"NSE:NTPC",       base:350,  lot:3000, strike:5,   cat:"INFRA",   label:"NTPC"         },
  { id:"POWERGRID",  yf:"POWERGRID.NS",  tv:"NSE:POWERGRID",  base:330,  lot:2700, strike:5,   cat:"INFRA",   label:"Power Grid"   },
  { id:"HAL",        yf:"HAL.NS",        tv:"NSE:HAL",        base:4500, lot:150,  strike:50,  cat:"INFRA",   label:"HAL"          },
  { id:"BEL",        yf:"BEL.NS",        tv:"NSE:BEL",        base:290,  lot:2800, strike:5,   cat:"INFRA",   label:"BEL"          },
  { id:"SIEMENS",    yf:"SIEMENS.NS",    tv:"NSE:SIEMENS",    base:7200, lot:75,   strike:100, cat:"INFRA",   label:"Siemens"      },
  { id:"BHEL",       yf:"BHEL.NS",       tv:"NSE:BHEL",       base:290,  lot:2800, strike:5,   cat:"INFRA",   label:"BHEL"         },
  // ── METALS ──
  { id:"TATASTEEL",  yf:"TATASTEEL.NS",  tv:"NSE:TATASTEEL",  base:155,  lot:5500, strike:5,   cat:"METALS",  label:"Tata Steel"   },
  { id:"HINDALCO",   yf:"HINDALCO.NS",   tv:"NSE:HINDALCO",   base:680,  lot:1075, strike:10,  cat:"METALS",  label:"Hindalco"     },
  { id:"JSWSTEEL",   yf:"JSWSTEEL.NS",   tv:"NSE:JSWSTEEL",   base:1020, lot:600,  strike:10,  cat:"METALS",  label:"JSW Steel"    },
  { id:"SAIL",       yf:"SAIL.NS",       tv:"NSE:SAIL",       base:140,  lot:7000, strike:5,   cat:"METALS",  label:"SAIL"         },
  { id:"NMDC",       yf:"NMDC.NS",       tv:"NSE:NMDC",       base:260,  lot:3500, strike:5,   cat:"METALS",  label:"NMDC"         },
  // ── PHARMA ──
  { id:"SUNPHARMA",  yf:"SUNPHARMA.NS",  tv:"NSE:SUNPHARMA",  base:1750, lot:350,  strike:20,  cat:"PHARMA",  label:"Sun Pharma"   },
  { id:"DRREDDY",    yf:"DRREDDY.NS",    tv:"NSE:DRREDDY",    base:6800, lot:125,  strike:50,  cat:"PHARMA",  label:"Dr. Reddy's"  },
  { id:"CIPLA",      yf:"CIPLA.NS",      tv:"NSE:CIPLA",      base:1650, lot:650,  strike:20,  cat:"PHARMA",  label:"Cipla"        },
  { id:"DIVISLAB",   yf:"DIVISLAB.NS",   tv:"NSE:DIVISLAB",   base:5900, lot:150,  strike:50,  cat:"PHARMA",  label:"Divis Labs"   },
  { id:"APOLLOHOSP", yf:"APOLLOHOSP.NS", tv:"NSE:APOLLOHOSP", base:6800, lot:125,  strike:50,  cat:"PHARMA",  label:"Apollo Hosp"  },
  { id:"AUROPHARMA", yf:"AUROPHARMA.NS", tv:"NSE:AUROPHARMA", base:1300, lot:500,  strike:20,  cat:"PHARMA",  label:"Aurobindo"    },
  // ── FMCG ──
  { id:"HINDUNILVR", yf:"HINDUNILVR.NS", tv:"NSE:HINDUNILVR", base:2350, lot:300,  strike:50,  cat:"FMCG",    label:"HUL"          },
  { id:"ITC",        yf:"ITC.NS",        tv:"NSE:ITC",        base:460,  lot:3200, strike:5,   cat:"FMCG",    label:"ITC"          },
  { id:"NESTLEIND",  yf:"NESTLEIND.NS",  tv:"NSE:NESTLEIND",  base:2350, lot:200,  strike:50,  cat:"FMCG",    label:"Nestle India" },
  { id:"TATACONSUM", yf:"TATACONSUM.NS", tv:"NSE:TATACONSUM", base:1050, lot:700,  strike:10,  cat:"FMCG",    label:"Tata Consumer"},
  // ── CONSUMER ──
  { id:"TITAN",      yf:"TITAN.NS",      tv:"NSE:TITAN",      base:3600, lot:175,  strike:50,  cat:"CONSUMER",label:"Titan"        },
  { id:"ASIANPAINT", yf:"ASIANPAINT.NS", tv:"NSE:ASIANPAINT", base:2800, lot:200,  strike:50,  cat:"CONSUMER",label:"Asian Paints" },
  { id:"DMART",      yf:"DMART.NS",      tv:"NSE:DMART",      base:4200, lot:150,  strike:50,  cat:"CONSUMER",label:"D-Mart"       },
  { id:"PIDILITIND", yf:"PIDILITIND.NS", tv:"NSE:PIDILITIND", base:3200, lot:200,  strike:50,  cat:"CONSUMER",label:"Pidilite"     },
  // ── TELECOM ──
  { id:"BHARTIARTL", yf:"BHARTIARTL.NS", tv:"NSE:BHARTIARTL", base:1680, lot:475,  strike:20,  cat:"TELECOM", label:"Airtel"       },
  // ── NEW AGE ──
  { id:"ZOMATO",     yf:"ZOMATO.NS",     tv:"NSE:ZOMATO",     base:230,  lot:4500, strike:5,   cat:"NEWAGE",  label:"Zomato"       },
  { id:"PAYTM",      yf:"PAYTM.NS",      tv:"NSE:PAYTM",      base:430,  lot:2000, strike:5,   cat:"NEWAGE",  label:"Paytm"        },
  { id:"NYKAA",      yf:"NYKAA.NS",      tv:"NSE:NYKAA",      base:175,  lot:4500, strike:5,   cat:"NEWAGE",  label:"Nykaa"        },
  { id:"POLICYBZR",  yf:"POLICYBZR.NS",  tv:"NSE:POLICYBZR",  base:1650, lot:475,  strike:20,  cat:"NEWAGE",  label:"PB Fintech"   },
  // ── ADANI ──
  { id:"ADANIPORTS", yf:"ADANIPORTS.NS", tv:"NSE:ADANIPORTS", base:1280, lot:625,  strike:10,  cat:"ADANI",   label:"Adani Ports"  },
  { id:"ADANIENT",   yf:"ADANIENT.NS",   tv:"NSE:ADANIENT",   base:2450, lot:400,  strike:50,  cat:"ADANI",   label:"Adani Ent."   },
  { id:"ADANIGREEN", yf:"ADANIGREEN.NS", tv:"NSE:ADANIGREEN", base:1800, lot:500,  strike:20,  cat:"ADANI",   label:"Adani Green"  },
  { id:"ADANIPOWER", yf:"ADANIPOWER.NS", tv:"NSE:ADANIPOWER", base:680,  lot:1300, strike:10,  cat:"ADANI",   label:"Adani Power"  },
  // ── REALTY ──
  { id:"DLF",        yf:"DLF.NS",        tv:"NSE:DLF",        base:920,  lot:825,  strike:10,  cat:"REALTY",  label:"DLF"          },
  { id:"GODREJPROP", yf:"GODREJPROP.NS", tv:"NSE:GODREJPROP", base:2900, lot:275,  strike:50,  cat:"REALTY",  label:"Godrej Prop"  },
  { id:"OBEROIRLTY", yf:"OBEROIRLTY.NS", tv:"NSE:OBEROIRLTY", base:1950, lot:400,  strike:20,  cat:"REALTY",  label:"Oberoi Realty"},
  // ── TRAVEL & PSU ──
  { id:"INDIGO",     yf:"INDIGO.NS",     tv:"NSE:INDIGO",     base:4200, lot:200,  strike:50,  cat:"TRAVEL",  label:"IndiGo"       },
  { id:"IRCTC",      yf:"IRCTC.NS",      tv:"NSE:IRCTC",      base:950,  lot:875,  strike:10,  cat:"TRAVEL",  label:"IRCTC"        },
  { id:"IRFC",       yf:"IRFC.NS",       tv:"NSE:IRFC",       base:220,  lot:4000, strike:5,   cat:"TRAVEL",  label:"IRFC"         },
];

const FNO = FNO_RAW.filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);
const ALL_SYMS = [...INDICES,...FNO];

const CAT_COLORS = {
  IT:"#00aaff",BANK:"#ffbb00",FINSERV:"#bb77ff",ENERGY:"#ff7722",AUTO:"#00e57a",
  INFRA:"#ff3d5a",METALS:"#88ccaa",PHARMA:"#ff88bb",FMCG:"#aabbff",
  CONSUMER:"#ffcc44",TELECOM:"#44ffcc",NEWAGE:"#ff44cc",ADANI:"#ffaa22",
  REALTY:"#cc88ff",TRAVEL:"#44ccff",
};

const PATTERNS = [
  {name:"Morning Star",         side:"BUY",  score:85, desc:"Bullish reversal at support"},
  {name:"Three Black Crows",    side:"SELL", score:82, desc:"Strong bearish continuation"},
  {name:"Hammer",               side:"BUY",  score:74, desc:"Bullish reversal candle"},
  {name:"Abandoned Baby",       side:"SELL", score:91, desc:"High-conviction reversal gap"},
  {name:"Marubozu White",       side:"BUY",  score:78, desc:"Strong momentum buy"},
  {name:"Evening Star",         side:"SELL", score:83, desc:"Bearish reversal at resistance"},
  {name:"Bullish Engulfing",    side:"BUY",  score:76, desc:"Bullish momentum candle"},
  {name:"Bearish Engulfing",    side:"SELL", score:79, desc:"Bearish momentum candle"},
  {name:"Three White Soldiers", side:"BUY",  score:88, desc:"Strong bullish continuation"},
  {name:"Dark Cloud Cover",     side:"SELL", score:77, desc:"Bearish reversal at top"},
  {name:"Piercing Line",        side:"BUY",  score:72, desc:"Bullish mid-body penetration"},
  {name:"Shooting Star",        side:"SELL", score:75, desc:"Bearish reversal candle"},
  {name:"Doji",                 side:"BUY",  score:62, desc:"Indecision; context dependent"},
  {name:"Inverted Hammer",      side:"BUY",  score:68, desc:"Possible reversal at bottom"},
  {name:"Hanging Man",          side:"SELL", score:70, desc:"Bearish warning at top"},
];

const ALL_CATS = ["ALL",...new Set(FNO.map(s=>s.cat))];

/* ─────────────────────────── UTILITY FUNCTIONS ─────────────────────── */

const rnd = (a,b) => Math.random()*(b-a)+a;
const pick = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,mn,mx) => Math.min(mx,Math.max(mn,v));
const ts = () => new Date().toLocaleTimeString("en-IN",{hour12:false,timeZone:"Asia/Kolkata"});
const nowIST = () => {
  const d=new Date();
  const ist=new Date(d.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));
  return {h:ist.getHours(),m:ist.getMinutes(),s:ist.getSeconds(),day:ist.getDay()};
};

const isMktOpen = () => {
  const {h,m,day}=nowIST();
  if(day===0||day===6) return "closed";
  const mins=h*60+m;
  if(mins>=555&&mins<915) return "pre";     // 9:15 AM pre
  if(mins>=915&&mins<930) return "opening"; // 9:15-9:30 call auction
  if(mins>=915&&mins<=930+225) return "open"; // till 3:30 PM
  return "closed";
};

const inr = (n,dec=2) => {
  if(n===null||n===undefined||isNaN(n)) return "—";
  const abs=Math.abs(n);
  let s;
  if(abs>=10000000) s=(abs/10000000).toFixed(1)+"Cr";
  else if(abs>=100000) s=(abs/100000).toFixed(1)+"L";
  else s=abs.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,",");
  return (n<0?"-₹":"₹")+s;
};

const fmtNum = n => {
  if(!n) return "—";
  if(n>=10000000) return (n/10000000).toFixed(2)+"Cr";
  if(n>=100000)   return (n/100000).toFixed(2)+"L";
  if(n>=1000)     return (n/1000).toFixed(1)+"K";
  return String(n);
};

const atmStrike = (spot, step) => Math.round(spot/step)*step;

/* ─────────────────────────── OPTION CHAIN MATH ─────────────────────── */

function erf(x){
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign=x<0?-1:1; const ax=Math.abs(x);
  const t=1/(1+p*ax);
  const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-ax*ax);
  return sign*y;
}
function normCDF(x){return .5*(1+erf(x/Math.SQRT2));}

function blackScholes(S,K,T,r,sigma,type){
  if(T<=0) return Math.max(0,type==="CE"?S-K:K-S);
  const d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/(sigma*Math.sqrt(T));
  const d2=d1-sigma*Math.sqrt(T);
  if(type==="CE") return S*normCDF(d1)-K*Math.exp(-r*T)*normCDF(d2);
  return K*Math.exp(-r*T)*normCDF(-d2)-S*normCDF(-d1);
}

function calcGreeks(S,K,T,r,sigma,type){
  if(T<=0) return {delta:type==="CE"?1:0,gamma:0,theta:0,vega:0,iv:sigma};
  const d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/(sigma*Math.sqrt(T));
  const d2=d1-sigma*Math.sqrt(T);
  const phi=Math.exp(-d1*d1/2)/Math.sqrt(2*Math.PI);
  const delta=type==="CE"?normCDF(d1):normCDF(d1)-1;
  const gamma=phi/(S*sigma*Math.sqrt(T));
  const theta=type==="CE"
    ?(-S*phi*sigma/(2*Math.sqrt(T))-r*K*Math.exp(-r*T)*normCDF(d2))/365
    :(-S*phi*sigma/(2*Math.sqrt(T))+r*K*Math.exp(-r*T)*normCDF(-d2))/365;
  const vega=S*phi*Math.sqrt(T)/100;
  return {delta,gamma,theta,vega,iv:sigma};
}

function impliedVol(marketPrice,S,K,T,r,type){
  if(T<=0) return 0.18;
  let sigma=0.20;
  for(let i=0;i<50;i++){
    const price=blackScholes(S,K,T,r,sigma,type);
    const d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/(sigma*Math.sqrt(T));
    const phi=Math.exp(-d1*d1/2)/Math.sqrt(2*Math.PI);
    const vega=S*phi*Math.sqrt(T);
    const diff=price-marketPrice;
    if(Math.abs(diff)<0.01) break;
    sigma-=diff/vega;
    sigma=clamp(sigma,0.01,5);
  }
  return sigma;
}

function buildOptionChain(spot,symbol){
  const s=ALL_SYMS.find(x=>x.id===symbol)||INDICES[0];
  const step=s.strike||50;
  const atm=atmStrike(spot,step);
  const nStrikes=8;
  const rows=[];
  // Days to next Thursday expiry
  const ist=nowIST();
  const todayDay=ist.day; // 0=Sun,4=Thu
  let daysToExp=(4-todayDay+7)%7||7;
  const T=daysToExp/365;
  const baseIV=0.14+rnd(-0.02,0.04); // ~14-18% IV for indices
  for(let i=-nStrikes;i<=nStrikes;i++){
    const K=atm+i*step;
    // Volatility smile/skew
    const moneyness=(K-spot)/spot;
    const skew=-0.1*moneyness;
    const ivAdj=clamp(baseIV+skew+rnd(-0.005,0.005),0.05,0.60);
    const cePx=blackScholes(spot,K,T,RF_RATE,ivAdj,"CE");
    const pePx=blackScholes(spot,K,T,RF_RATE,ivAdj,"PE");
    const ceG=calcGreeks(spot,K,T,RF_RATE,ivAdj,"CE");
    const peG=calcGreeks(spot,K,T,RF_RATE,ivAdj,"PE");
    const ceOI=Math.round(rnd(50000,3000000)/s.lot)*s.lot;
    const peOI=Math.round(rnd(50000,3000000)/s.lot)*s.lot;
    rows.push({
      strike:K,isATM:K===atm,
      ce:{px:cePx,oi:ceOI,chg:rnd(-15,15),delta:ceG.delta,gamma:ceG.gamma,theta:ceG.theta,vega:ceG.vega,iv:ivAdj*100},
      pe:{px:pePx,oi:peOI,chg:rnd(-15,15),delta:peG.delta,gamma:peG.gamma,theta:peG.theta,vega:peG.vega,iv:ivAdj*100},
    });
  }
  return {rows,daysToExp,atm,expiry:daysToExp};
}

/* ────────────────────────── TECHNICAL INDICATORS ──────────────────── */

function calcSMA(data,n){
  return data.map((_,i,arr)=>{
    if(i<n-1) return null;
    return arr.slice(i-n+1,i+1).reduce((s,v)=>s+v,0)/n;
  });
}

function calcEMA(data,n){
  const k=2/(n+1); const ema=[];
  for(let i=0;i<data.length;i++){
    if(i===0){ema.push(data[0]);continue;}
    ema.push(data[i]*k+ema[i-1]*(1-k));
  }
  return ema;
}

function calcRSI(data,n=14){
  const changes=data.map((v,i)=>i===0?0:v-data[i-1]);
  const rsi=[];
  for(let i=0;i<data.length;i++){
    if(i<n){rsi.push(null);continue;}
    const gains=changes.slice(i-n+1,i+1).filter(x=>x>0);
    const losses=changes.slice(i-n+1,i+1).filter(x=>x<0).map(Math.abs);
    const ag=gains.length?gains.reduce((s,v)=>s+v,0)/n:0;
    const al=losses.length?losses.reduce((s,v)=>s+v,0)/n:0;
    rsi.push(al===0?100:100-100/(1+ag/al));
  }
  return rsi;
}

function calcMACD(data,fast=12,slow=26,signal=9){
  const emaFast=calcEMA(data,fast);
  const emaSlow=calcEMA(data,slow);
  const macdLine=emaFast.map((v,i)=>v-emaSlow[i]);
  const signalLine=calcEMA(macdLine,signal);
  const hist=macdLine.map((v,i)=>v-signalLine[i]);
  return {macd:macdLine,signal:signalLine,hist};
}

function calcBB(data,n=20,mul=2){
  const sma=calcSMA(data,n);
  return data.map((_,i)=>{
    if(sma[i]===null) return {upper:null,mid:null,lower:null};
    const slice=data.slice(Math.max(0,i-n+1),i+1);
    const mean=sma[i];
    const std=Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/slice.length);
    return {upper:mean+mul*std,mid:mean,lower:mean-mul*std};
  });
}

function detectPricePattern(ohlcv){
  if(!ohlcv||ohlcv.length<5) return null;
  const last=ohlcv[ohlcv.length-1];
  const prev=ohlcv[ohlcv.length-2];
  const prev2=ohlcv[ohlcv.length-3];
  const {open:o,high:h,low:l,close:c}=last;
  const body=Math.abs(c-o);
  const range=h-l;
  const upper=h-Math.max(o,c);
  const lower=Math.min(o,c)-l;
  const avgBody=ohlcv.slice(-10).reduce((s,x)=>s+Math.abs(x.close-x.open),0)/10;
  const isBull=c>o; const isBear=c<o;

  // Three White Soldiers
  if(ohlcv.length>=3){
    const c1=prev2,c2=prev,c3=last;
    if(c1.close>c1.open&&c2.close>c2.open&&c3.close>c3.open)
      if(c2.close>c1.close&&c3.close>c2.close)
        return {name:"Three White Soldiers",side:"BUY",score:88};
  }
  // Three Black Crows
  if(ohlcv.length>=3){
    const c1=prev2,c2=prev,c3=last;
    if(c1.close<c1.open&&c2.close<c2.open&&c3.close<c3.open)
      if(c2.close<c1.close&&c3.close<c2.close)
        return {name:"Three Black Crows",side:"SELL",score:84};
  }
  // Hammer
  if(isBull&&lower>2*body&&upper<body*0.3&&body<avgBody)
    return {name:"Hammer",side:"BUY",score:74};
  // Shooting Star
  if(isBear&&upper>2*body&&lower<body*0.3&&body<avgBody)
    return {name:"Shooting Star",side:"SELL",score:75};
  // Marubozu White
  if(isBull&&body>avgBody*1.5&&lower<body*0.1&&upper<body*0.1)
    return {name:"Marubozu White",side:"BUY",score:79};
  // Bullish Engulfing
  if(prev&&isBull&&prev.close<prev.open&&c>prev.open&&o<prev.close)
    return {name:"Bullish Engulfing",side:"BUY",score:77};
  // Bearish Engulfing
  if(prev&&isBear&&prev.close>prev.open&&c<prev.open&&o>prev.close)
    return {name:"Bearish Engulfing",side:"SELL",score:78};
  // Morning Star
  if(prev&&prev2&&prev2.close<prev2.open&&Math.abs(prev.close-prev.open)<Math.abs(prev2.close-prev2.open)*0.4&&isBull)
    return {name:"Morning Star",side:"BUY",score:86};
  // Evening Star
  if(prev&&prev2&&prev2.close>prev2.open&&Math.abs(prev.close-prev.open)<Math.abs(prev2.close-prev2.open)*0.4&&isBear)
    return {name:"Evening Star",side:"SELL",score:83};
  // Doji
  if(body<range*0.1&&range>0)
    return {name:"Doji",side:null,score:55};

  return null;
}

/* ─────────────────────── DATA FETCHING ────────────────────────────── */

async function fetchWithProxy(url){
  try{ const r=await fetch(CORS1+encodeURIComponent(url),{headers:{"x-requested-with":"XMLHttpRequest"},signal:AbortSignal.timeout(6000)}); if(r.ok) return r.json(); }catch{}
  try{ const r=await fetch(CORS2+encodeURIComponent(url),{signal:AbortSignal.timeout(6000)}); if(r.ok) return r.json(); }catch{}
  return null;
}

async function fetchYahooQuotes(symbols){
  const yfSyms=symbols.map(s=>ALL_SYMS.find(x=>x.id===s)?.yf||s).filter(Boolean);
  const url=YF_BASE+yfSyms.join(",")+"&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,regularMarketPreviousClose,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE";
  const data=await fetchWithProxy(url);
  if(!data?.quoteResponse?.result) return null;
  const map={};
  data.quoteResponse.result.forEach((q,i)=>{
    const sym=symbols[i];
    if(!sym) return;
    map[sym]={
      cur:q.regularMarketPrice||0,
      open:q.regularMarketOpen||0,
      high:q.regularMarketDayHigh||0,
      low:q.regularMarketDayLow||0,
      prev:q.regularMarketPreviousClose||0,
      chg:q.regularMarketChange||0,
      pct:q.regularMarketChangePercent||0,
      vol:q.regularMarketVolume||0,
      w52h:q.fiftyTwoWeekHigh||0,
      w52l:q.fiftyTwoWeekLow||0,
      mcap:q.marketCap||0,
      pe:q.trailingPE||0,
      live:true,
    };
  });
  return map;
}

async function fetchYFChart(yfSym){
  const url=`${YF_CHART}${yfSym}?interval=1m&range=1d`;
  const data=await fetchWithProxy(url);
  if(!data?.chart?.result?.[0]) return null;
  const r=data.chart.result[0];
  const ts=r.timestamp||[];
  const q=r.indicators?.quote?.[0]||{};
  const ohlcv=ts.map((t,i)=>({
    time:t*1000,
    open:q.open?.[i],close:q.close?.[i],
    high:q.high?.[i],low:q.low?.[i],vol:q.volume?.[i],
  })).filter(x=>x.open&&x.close);
  return ohlcv;
}

async function fetchNSEOptionChain(sym){
  // NSE public option chain endpoint
  const url=`https://www.nseindia.com/api/option-chain-indices?symbol=${sym}`;
  const data=await fetchWithProxy(url);
  if(!data?.records?.data) return null;
  return data;
}

async function fetchNews(){
  const feeds=[
    "https://economictimes.indiatimes.com/markets/rss.cms",
    "https://feeds.feedburner.com/ndtvprofit-latest",
    "https://www.moneycontrol.com/rss/marketoutlook.xml",
  ];
  const results=[];
  for(const feed of feeds){
    try{
      const data=await fetchWithProxy(feed);
      if(typeof data==="string"||data?.contents){
        const xml=typeof data==="string"?data:data.contents;
        const parser=new DOMParser();
        const doc=parser.parseFromString(xml,"text/xml");
        const items=doc.querySelectorAll("item");
        items.forEach((item,idx)=>{
          if(idx>=4) return;
          const title=item.querySelector("title")?.textContent?.trim()||"";
          const desc=item.querySelector("description")?.textContent?.replace(/<[^>]+>/g,"").trim()||"";
          const pubDate=item.querySelector("pubDate")?.textContent||"";
          if(title) results.push({title,desc:desc.slice(0,120),pubDate,src:feed.includes("economictimes")?"ET Markets":feed.includes("ndtv")?"NDTV Profit":"MoneyControl"});
        });
      }
    }catch{}
  }
  return results.slice(0,12);
}

async function fetchBSENews(){
  const url="https://api.bseindia.com/BseIndiaAPI/api/GetLatestNewsHeadLine/w";
  const data=await fetchWithProxy(url);
  if(data?.Table) return data.Table.slice(0,8).map(r=>({title:r.NEWSDESCRIPTION||r.HEADLINE||"",pubDate:r.NEWS_DT||"",src:"BSE India"}));
  return [];
}

async function fetchWorldMonitor(){
  // World Monitor - fetch global market sentiment
  const url="https://www.worldmonitor.app/";
  const data=await fetchWithProxy(url);
  const content=typeof data==="string"?data:data?.contents||"";
  // Parse headlines from the fetched HTML
  const parser=new DOMParser();
  const doc=parser.parseFromString(content,"text/html");
  const headlines=[];
  doc.querySelectorAll("h1,h2,h3,h4,article,p").forEach(el=>{
    const t=el.textContent?.trim();
    if(t&&t.length>20&&t.length<200&&!headlines.find(h=>h===t)) headlines.push(t);
  });
  return headlines.slice(0,6);
}

// Simulate tick-level micro-moves with realistic intraday behavior
function applyTick(cur,open,isOpen){
  if(!isOpen) return cur;
  // Mean-reversion + momentum with slight upward bias for Indian markets
  const meanRev=(open-cur)/open*0.001;
  const momentum=rnd(-1,1)*0.0005;
  const drift=(meanRev+momentum)*cur;
  return Math.max(cur+drift,cur*0.995);
}

/* ════════════════════════════════════════════════════════════════════
   COMPONENTS
════════════════════════════════════════════════════════════════════ */

/* ── Toast System ── */
function ToastContainer({toasts,dismiss}){
  return(
    <div className="toast-wrap">
      {toasts.map(t=>(
        <div key={t.id} className={`toast ${t.type} ${t.exiting?"out":""}`} onClick={()=>dismiss(t.id)}>
          <div className="t-ico">{t.icon}</div>
          <div className="t-body">
            <div className="t-title">{t.title}</div>
            <div className="t-msg">{t.msg}</div>
            {t.sub&&<div className="t-sub">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Settings Modal ── */
function SettingsModal({cfg,onSave,onClose}){
  const [apiKey,setApiKey]=useState(cfg.apiKey||"");
  const [model,setModel]=useState(cfg.model||DEFAULT_MODEL);
  const [zerodha,setZerodha]=useState(cfg.zerodha||"");
  const [upstox,setUpstox]=useState(cfg.upstox||"");
  const [capital,setCapital]=useState(cfg.capital||"5000000");
  const save=()=>{onSave({apiKey,model,zerodha,upstox,capital:parseFloat(capital)||5000000});onClose()};
  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal-box">
        <div className="modal-hdr">
          <div className="modal-ttl">⬡ ALADDIN SETTINGS</div>
          <button className="modal-cls" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* AI Config */}
          <div className="ms-title">AI ENGINE CONFIGURATION</div>
          <div className="m-field">
            <label className="m-label">ANTHROPIC API KEY <span className="opt-tag">REQUIRED FOR AI</span></label>
            <input type="password" className="m-inp" placeholder="sk-ant-api03-..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
            <div className="m-hint">Get your key at console.anthropic.com · Key is stored in browser localStorage only · Never sent to any third party</div>
          </div>
          <div className="m-field">
            <label className="m-label">AI MODEL</label>
            <select className="m-inp" value={model} onChange={e=>setModel(e.target.value)}>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Recommended — Fast + Smart)</option>
              <option value="claude-opus-4-6">claude-opus-4-6 (Most Powerful — Slower)</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (Fastest — Basic)</option>
            </select>
          </div>
          <hr className="divider"/>
          {/* Capital */}
          <div className="ms-title">PAPER TRADING CAPITAL</div>
          <div className="m-field">
            <label className="m-label">STARTING CAPITAL (₹)</label>
            <input type="number" className="m-inp" value={capital} onChange={e=>setCapital(e.target.value)} min="100000" step="100000"/>
            <div className="m-hint">Used for position sizing (1.5% per trade) and P&L tracking</div>
          </div>
          <hr className="divider"/>
          {/* Optional Broker */}
          <div className="ms-title">BROKER INTEGRATION <span className="opt-tag">OPTIONAL</span></div>
          <div className="m-field">
            <label className="m-label">ZERODHA API KEY <span className="opt-tag">OPTIONAL</span></label>
            <input type="text" className="m-inp" placeholder="Your Zerodha API Key (for live trade execution)" value={zerodha} onChange={e=>setZerodha(e.target.value)}/>
            <div className="m-hint">Terminal works fully without this. Only required to execute real orders via Zerodha Kite Connect API. <strong style={{color:"#ffbb00"}}>Paper trading is always available regardless.</strong></div>
          </div>
          <div className="m-field">
            <label className="m-label">UPSTOX API KEY <span className="opt-tag">OPTIONAL</span></label>
            <input type="text" className="m-inp" placeholder="Your Upstox API Key (optional)" value={upstox} onChange={e=>setUpstox(e.target.value)}/>
          </div>
          <button className="m-save" onClick={save}>💾 SAVE CONFIGURATION</button>
        </div>
      </div>
    </div>
  );
}

/* ── TradingView Chart ── */
function TVChart({sym}){
  const ref=useRef(null);
  const s=ALL_SYMS.find(x=>x.id===sym)||INDICES[0];
  useEffect(()=>{
    if(!ref.current) return;
    ref.current.innerHTML="";
    const id="tv_"+sym+"_"+Date.now();
    const div=document.createElement("div");
    div.id=id; div.style.cssText="width:100%;height:100%";
    ref.current.appendChild(div);
    const make=()=>{
      try{
        new window.TradingView.widget({
          container_id:id, autosize:true,
          symbol:s.tv, interval:"1",
          timezone:"Asia/Kolkata", theme:"dark", style:"1",
          locale:"en", toolbar_bg:"#060f1d",
          enable_publishing:false, withdateranges:true,
          hide_side_toolbar:false, allow_symbol_change:true,
          show_popup_button:true,
          studies:[
            "RSI@tv-basicstudies",
            "MACD@tv-basicstudies",
            "BB@tv-basicstudies",
            "EMA@tv-basicstudies",
            "Volume@tv-basicstudies",
          ],
          studies_overrides:{"volume.volume.color.0":"rgba(255,61,90,.4)","volume.volume.color.1":"rgba(0,229,122,.4)"},
          overrides:{
            "paneProperties.background":"#030911",
            "paneProperties.backgroundGradientEndColor":"#030911",
            "paneProperties.backgroundType":"solid",
            "scalesProperties.textColor":"#4a6a85",
            "paneProperties.legendProperties.showStudyTitles":true,
          },
          save_image:false, hide_legend:false,
          backgroundColor:"rgba(3,9,17,1)",
          gridColor:"rgba(13,32,53,0.5)",
        });
      }catch{}
    };
    if(window.TradingView&&window.TradingView.widget) make();
    else{
      const id2="tv-scr-"+Date.now();
      const existing=document.getElementById(id2);
      if(!existing){
        const scr=document.createElement("script");
        scr.id=id2; scr.src="https://s3.tradingview.com/tv.js";
        scr.onload=make; document.head.appendChild(scr);
      } else existing.onload=make;
    }
  },[sym]);
  return <div ref={ref} style={{width:"100%",height:"100%"}}/>;
}

/* ── Option Chain Table ── */
function OptionChain({sym,spot}){
  const [chain,setChain]=useState(null);
  const [showGreeks,setShowGreeks]=useState(false);
  const [liveChain,setLiveChain]=useState(false);
  const scRef=useRef(null);

  useEffect(()=>{
    let cancelled=false;
    const build=async()=>{
      // Try NSE live first
      if(INDICES.find(i=>i.id===sym)){
        const nseId=INDICES.find(i=>i.id===sym)?.id;
        const live=await fetchNSEOptionChain(nseId);
        if(!cancelled&&live?.records){
          setLiveChain(true);
          // Process NSE data
          const records=live.records.data||[];
          const strikePrices=[...new Set(records.map(r=>r.strikePrice))].sort((a,b)=>a-b);
          const atm=atmStrike(spot||live.records.underlyingValue,INDICES.find(i=>i.id===sym)?.strike||50);
          const rows=strikePrices.filter(k=>Math.abs(k-atm)<=(INDICES.find(i=>i.id===sym)?.strike||50)*8).map(k=>{
            const ce=records.find(r=>r.strikePrice===k&&r.expiryDate&&(r.CE));
            const pe=records.find(r=>r.strikePrice===k&&r.expiryDate&&(r.PE));
            return{
              strike:k,isATM:k===atm,
              ce:{px:ce?.CE?.lastPrice||0,oi:ce?.CE?.openInterest||0,chg:ce?.CE?.change||0,iv:ce?.CE?.impliedVolatility||0,
                delta:0,gamma:0,theta:0,vega:0},
              pe:{px:pe?.PE?.lastPrice||0,oi:pe?.PE?.openInterest||0,chg:pe?.PE?.change||0,iv:pe?.PE?.impliedVolatility||0,
                delta:0,gamma:0,theta:0,vega:0},
            };
          });
          setChain({rows,atm,daysToExp:live.records.expiryDates?1:7,src:"NSE Live"});
          return;
        }
      }
      if(!cancelled){
        const c=buildOptionChain(spot||2000,sym);
        setLiveChain(false);
        setChain({...c,src:"Calculated"});
      }
    };
    build();
    const iv=setInterval(()=>build(),30000);
    return()=>{cancelled=true;clearInterval(iv)};
  },[sym,spot]);

  // Scroll to ATM
  useEffect(()=>{
    if(chain&&scRef.current){
      const atmRow=scRef.current.querySelector(".atm-row");
      if(atmRow) atmRow.scrollIntoView({block:"center",behavior:"smooth"});
    }
  },[chain]);

  const maxOI=chain?Math.max(...chain.rows.flatMap(r=>[r.ce.oi,r.pe.oi]),1):1;

  return(
    <div className="oc-box">
      <div className="oc-hdr">
        <span style={{color:"#4a6a85",fontSize:"7px",letterSpacing:"2px"}}>◈ OPTION CHAIN</span>
        <span style={{color:liveChain?"#00e57a":"#ffbb00",fontSize:"7px"}}>{liveChain?"● NSE LIVE":"○ CALCULATED"}</span>
        <span style={{color:"#4a6a85",fontSize:"7px",marginLeft:"auto"}}>
          ATM: {chain?.atm} | Expiry: {chain?.daysToExp||0}D
        </span>
        <button onClick={()=>setShowGreeks(g=>!g)} style={{background:"transparent",border:"1px solid #0d2035",color:"#4a6a85",fontSize:"7px",padding:"1px 6px",cursor:"pointer",marginLeft:"6px"}}>
          {showGreeks?"HIDE":"SHOW"} GREEKS
        </button>
      </div>
      <div className="oc-scroller" ref={scRef}>
        {!chain?<div style={{color:"#4a6a85",fontSize:"8px",padding:"10px"}}>Loading option chain...</div>:(
          <table className="oc-table">
            <thead>
              <tr>
                <th className="oc-ce">OI</th>
                {showGreeks&&<th className="oc-ce">Δ</th>}
                {showGreeks&&<th className="oc-ce">IV%</th>}
                <th className="oc-ce">CE LTP</th>
                <th className="oc-ce">CHG</th>
                <th style={{background:"#0a1e30"}}>STRIKE</th>
                <th className="oc-pe">CHG</th>
                <th className="oc-pe">PE LTP</th>
                {showGreeks&&<th className="oc-pe">IV%</th>}
                {showGreeks&&<th className="oc-pe">Δ</th>}
                <th className="oc-pe">OI</th>
              </tr>
            </thead>
            <tbody>
              {chain.rows.map(row=>(
                <tr key={row.strike} className={row.isATM?"atm-row":""}>
                  <td className={row.strike<chain.atm?"oc-itm-ce":""} style={{minWidth:"50px"}}>
                    <div className="oc-ce">{fmtNum(row.ce.oi)}</div>
                    <div className="oc-bar oc-ce" style={{width:`${(row.ce.oi/maxOI)*60}px`}}/>
                  </td>
                  {showGreeks&&<td className="oc-ce">{row.ce.delta?.toFixed(2)||"—"}</td>}
                  {showGreeks&&<td className="oc-ce">{row.ce.iv?row.ce.iv.toFixed(1)+"%":"—"}</td>}
                  <td className="oc-ce" style={{fontWeight:row.isATM?"700":"400"}}>{row.ce.px?.toFixed(2)||"—"}</td>
                  <td className={row.ce.chg>=0?"grn":"red"}>{row.ce.chg>=0?"+":""}{row.ce.chg?.toFixed(2)||"—"}</td>
                  <td className="oc-strike" style={{background:row.isATM?"rgba(255,187,0,.12)":"rgba(5,15,28,.8)",padding:"3px 8px"}}>
                    {row.strike}{row.isATM&&<span style={{color:"#ffbb00",fontSize:"6px",marginLeft:"3px"}}>ATM</span>}
                  </td>
                  <td className={row.pe.chg>=0?"grn":"red"}>{row.pe.chg>=0?"+":""}{row.pe.chg?.toFixed(2)||"—"}</td>
                  <td className="oc-pe" style={{fontWeight:row.isATM?"700":"400"}}>{row.pe.px?.toFixed(2)||"—"}</td>
                  {showGreeks&&<td className="oc-pe">{row.pe.iv?row.pe.iv.toFixed(1)+"%":"—"}</td>}
                  {showGreeks&&<td className="oc-pe">{row.pe.delta?.toFixed(2)||"—"}</td>}
                  <td className={row.strike>chain.atm?"oc-itm-pe":""}>
                    <div className="oc-pe">{fmtNum(row.pe.oi)}</div>
                    <div className="oc-bar oc-pe" style={{width:`${(row.pe.oi/maxOI)*60}px`}}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Market Info Panel ── */
function MarketInfo({sym,price}){
  const s=ALL_SYMS.find(x=>x.id===sym);
  const [details,setDetails]=useState(null);
  useEffect(()=>{
    if(!s?.yf) return;
    const load=async()=>{
      const url=`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${s.yf}?modules=summaryDetail,defaultKeyStatistics,financialData`;
      const d=await fetchWithProxy(url);
      if(d?.quoteSummary?.result?.[0]){
        const r=d.quoteSummary.result[0];
        setDetails({
          pe:r.summaryDetail?.trailingPE?.raw||r.defaultKeyStatistics?.forwardPE?.raw||null,
          pb:r.defaultKeyStatistics?.priceToBook?.raw||null,
          mcap:r.summaryDetail?.marketCap?.raw||null,
          eps:r.defaultKeyStatistics?.trailingEps?.raw||null,
          divYield:r.summaryDetail?.dividendYield?.raw||null,
          beta:r.defaultKeyStatistics?.beta?.raw||null,
          roe:r.financialData?.returnOnEquity?.raw||null,
          debtEq:r.financialData?.debtToEquity?.raw||null,
        });
      }
    };
    load();
  },[sym]);
  const up=price?.chg>=0;
  return(
    <div className="pnl-body" style={{padding:"7px"}}>
      {[
        ["LTP",price?.cur?inr(price.cur,2):"—",up?"#00e57a":"#ff3d5a"],
        ["Open",price?.open?inr(price.open,2):"—","#c8d8e8"],
        ["High",price?.high?inr(price.high,2):"—","#00e57a"],
        ["Low",price?.low?inr(price.low,2):"—","#ff3d5a"],
        ["Prev Close",price?.prev?inr(price.prev,2):"—","#4a6a85"],
        ["Volume",price?.vol?fmtNum(price.vol):"—","#c8d8e8"],
        ["52W High",price?.w52h?inr(price.w52h,2):"—","#00e57a"],
        ["52W Low",price?.w52l?inr(price.w52l,2):"—","#ff3d5a"],
        ["Mkt Cap",price?.mcap?inr(price.mcap,0):"—","#bb77ff"],
        ["P/E Ratio",details?.pe?details.pe.toFixed(2):"—","#c8d8e8"],
        ["EPS",details?.eps?inr(details.eps,2):"—","#c8d8e8"],
        ["Beta",details?.beta?details.beta.toFixed(2):"—","#c8d8e8"],
        ["Lot Size",s?.lot||"—","#ffbb00"],
        ["ATM Strike",price?.cur?atmStrike(price.cur,s?.strike||50):"—","#ffbb00"],
      ].map(([l,v,c])=>(
        <div key={l} className="mi-row"><span className="mi-l">{l}</span><span style={{color:c,fontWeight:"600"}}>{v}</span></div>
      ))}
    </div>
  );
}

/* ── Agent Status Panel ── */
function AgentPanel({agents,dd}){
  const icons={analyst:"🔍",researcher:"📡",risk:"🛡",supervisor:"🧠"};
  return(
    <div className="pnl-body">
      {Object.entries(agents).map(([name,ag])=>{
        const c=ag.st.includes("KILL")||ag.st.includes("✗")||ag.st.includes("HALT")?"#ff3d5a":
               ag.st.includes("✓")||["ONLINE","MONITORING","COMPLETE","ACTIVE"].includes(ag.st)?"#00e57a":
               ag.st.includes("FETCHING")||ag.st.includes("PATTERN")?"#ffbb00":"#00aaff";
        return(
          <div key={name} className="ag-card">
            <div className="ag-top">
              <span className="ag-name">{icons[name]||"◈"} {name.toUpperCase()}</span>
              <span className="ag-st" style={{color:c}}>{ag.st}</span>
            </div>
            <div className="ag-msg">{ag.msg}</div>
          </div>
        );
      })}
      <hr className="divider"/>
      <div style={{fontSize:"7px",color:"#4a6a85",marginBottom:"3px",letterSpacing:"1px"}}>DRAWDOWN / KILL SWITCH (5%)</div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"7px",marginBottom:"3px"}}>
        <span style={{color:"#4a6a85"}}>Used</span>
        <span style={{color:dd>3?"#ff3d5a":"#ffbb00"}}>{Math.max(0,dd).toFixed(2)}% / 5.00%</span>
      </div>
      <div className="dd-bar"><div className="dd-fill" style={{width:`${clamp(dd/5*100,0,100)}%`,background:dd>3?"#ff3d5a":"#ffbb00"}}/></div>
    </div>
  );
}

/* ── AI Analysis Result Display ── */
function AIResultDisplay({txt,loading}){
  if(loading) return(
    <div className="ai-thinking"><span className="spin">⟳</span> Analyzing with Claude AI — processing live market data...</div>
  );
  if(!txt) return null;
  // Color code different parts of the response
  const lines=txt.split("\n");
  return(
    <div className="ai-resp">
      {lines.map((line,i)=>{
        if(line.startsWith("DECISION:")) return <div key={i} style={{color:line.includes("YES")?"#00e57a":"#ff3d5a",fontWeight:"700",fontSize:"9px"}}>{line}</div>;
        if(line.startsWith("BUY PRICE:")||line.startsWith("ENTRY:")) return <div key={i} style={{color:"#00e57a",fontWeight:"700"}}>{line}</div>;
        if(line.startsWith("SELL PRICE:")||line.startsWith("TARGET:")) return <div key={i} style={{color:"#00e57a"}}>{line}</div>;
        if(line.startsWith("STOP LOSS:")||line.startsWith("STOPLOSS:")) return <div key={i} style={{color:"#ff3d5a",fontWeight:"700"}}>{line}</div>;
        if(line.startsWith("CONFIDENCE:")) return <div key={i} style={{color:"#ffbb00"}}>{line}</div>;
        if(line.startsWith("REASONING:")||line.startsWith("ANALYSIS:")) return <div key={i} style={{color:"#c8d8e8"}}>{line}</div>;
        if(line.startsWith("RISK_LEVEL:")) return <div key={i} style={{color:line.includes("HIGH")?"#ff3d5a":line.includes("MEDIUM")?"#ffbb00":"#00e57a"}}>{line}</div>;
        if(line.startsWith("OPTION_TRADE:")) return <div key={i} style={{color:"#bb77ff",fontWeight:"700"}}>{line}</div>;
        if(line.startsWith("TECHNICAL:")) return <div key={i} style={{color:"#00aaff"}}>{line}</div>;
        if(line.startsWith("WHY_BUY:")||line.startsWith("WHY_SELL:")) return <div key={i} style={{color:"#00ffcc"}}>{line}</div>;
        if(line.startsWith("PATTERN_CHAIN:")) return <div key={i} style={{color:"#4a6a85",fontSize:"7px"}}>{line}</div>;
        return <div key={i} style={{color:"#4a6a85"}}>{line}</div>;
      })}
    </div>
  );
}
