// NSE API helper — server-side only (Node.js / Netlify Functions)
// Handles cookie-based auth required by NSE India

const NSE_BASE = 'https://www.nseindia.com';
const BSE_BASE = 'https://api.bseindia.com';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://www.nseindia.com/',
  'X-Requested-With': 'XMLHttpRequest',
  Connection: 'keep-alive',
};

// Simple in-memory cookie cache (resets on cold start, refreshes every 5 min)
let cookieCache: { value: string; ts: number } | null = null;

async function getNseCookies(): Promise<string> {
  const now = Date.now();
  if (cookieCache && now - cookieCache.ts < 5 * 60 * 1000) return cookieCache.value;

  try {
    const res = await fetch(NSE_BASE, {
      headers: {
        'User-Agent': BROWSER_HEADERS['User-Agent'],
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const raw = res.headers.get('set-cookie') || '';
    // Extract cookie name=value pairs
    const cookies = raw
      .split(/,(?=[^;]+=[^;]+)/)
      .map((c) => c.trim().split(';')[0])
      .join('; ');
    cookieCache = { value: cookies, ts: now };
    return cookies;
  } catch {
    return cookieCache?.value ?? '';
  }
}

export async function nseGet<T = unknown>(path: string): Promise<T> {
  const cookies = await getNseCookies();
  const res = await fetch(`${NSE_BASE}${path}`, {
    headers: { ...BROWSER_HEADERS, Cookie: cookies },
  });
  if (!res.ok) throw new Error(`NSE ${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function bseGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${BSE_BASE}${path}`, {
    headers: {
      'User-Agent': BROWSER_HEADERS['User-Agent'],
      Accept: 'application/json',
      Referer: 'https://www.bseindia.com/',
    },
  });
  if (!res.ok) throw new Error(`BSE ${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
