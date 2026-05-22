okay
# JSE Portfolio Optimizer — Claude Code Implementation Plan

## Project Overview

A single-page full-stack web application for Modern Portfolio Theory (MPT) optimization of
JSE-listed equities. Users input tickers, the app fetches 3 years of historical data, and
returns the maximum Sharpe Ratio portfolio via Efficient Frontier modeling. The UI follows
a **top-down pipeline aesthetic**: three numbered stages reading sequentially down the page,
with a dark neo-brutalist design language.

The South African 10-year government bond yield — used as the risk-free rate in all Sharpe
Ratio calculations — is fetched live from the **FRED API** (Federal Reserve Economic Data,
St. Louis Fed) on every page load. This is a free, reliable, institutional-grade data source
that requires a one-time API key registration. Instructions are in the FRED Integration
section below. The rate is displayed in the UI and is user-editable if they wish to override.

---

## Repository Structure

```
jse-portfolio-optimizer/
├── frontend/                        # React + Vite (deployed to Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── StageInput.jsx            # Stage 01 — ticker entry + autocomplete
│   │   │   ├── StageCompute.jsx          # Stage 02 — parameters + live log
│   │   │   ├── StageOutput.jsx           # Stage 03 — frontier chart + weights
│   │   │   ├── TickerChip.jsx            # Removable ticker tag with company name
│   │   │   ├── TickerAutocomplete.jsx    # Dropdown search from JSE ticker list
│   │   │   ├── FrontierChart.jsx         # Recharts scatter + frontier + optimal point
│   │   │   ├── WeightBar.jsx             # Animated horizontal weight bar
│   │   │   ├── MetricCard.jsx            # Return / Vol / Sharpe animated card
│   │   │   ├── SectorBreakdown.jsx       # Stacked sector exposure bar
│   │   │   ├── EquityCurve.jsx           # Backtested portfolio vs ALSI line chart
│   │   │   ├── SensitivityTable.jsx      # Sharpe across return/vol grid
│   │   │   ├── ComparePanel.jsx          # Side-by-side portfolio comparison
│   │   │   ├── TooltipPortfolio.jsx      # Custom hard-bordered chart tooltip
│   │   │   ├── ColdStartBanner.jsx       # Backend warm-up notice
│   │   │   └── ExportButton.jsx          # PDF + CSV export
│   │   ├── hooks/
│   │   │   ├── useOptimizer.js           # POST + SSE consumer + state machine
│   │   │   ├── useTickerValidation.js    # Debounced /validate call
│   │   │   ├── useRfRate.js              # Fetches live Rf from backend /rf-rate
│   │   │   └── useCountUp.js            # Animated number count-up
│   │   ├── data/
│   │   │   ├── jse_tickers.json          # All JSE listings: ticker, name, sector, cap tier
│   │   │   └── sector_map.json           # Ticker to JSE sector mapping
│   │   ├── lib/
│   │   │   └── constants.js              # Palette tokens, default params
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                     # Tailwind + CSS custom properties
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/                         # FastAPI + Python (deployed to Render/Railway)
│   ├── main.py                           # FastAPI app, CORS, router registration
│   ├── routers/
│   │   ├── optimizer.py                  # /optimize/stream (SSE), /optimize (JSON)
│   │   ├── market.py                     # /rf-rate, /validate/{ticker}, /search
│   │   └── health.py                     # /health
│   ├── services/
│   │   ├── data_service.py               # yfinance fetch, clean, validate
│   │   ├── optimizer_service.py          # PyPortfolioOpt: Sharpe max, Monte Carlo
│   │   ├── rf_service.py                 # FRED API fetch with fallback chain
│   │   ├── backtest_service.py           # Historical equity curve vs ALSI
│   │   └── sector_service.py             # Sector exposure from static mapping
│   ├── models/
│   │   └── schemas.py                    # Pydantic request/response models
│   ├── requirements.txt
│   └── Dockerfile
│
├── .env.example
└── README.md
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, tree-shaking, JSX |
| Styling | Tailwind CSS | Utility-first, design token enforcement |
| Charts | Recharts | Composable custom scatter + line overlay |
| Animations | Framer Motion | Production-grade spring and tween |
| HTTP client | Axios | Interceptor pattern for error handling |
| Backend framework | FastAPI | Async, typed, auto-docs at /docs |
| Data | yfinance | JSE .JO suffix, 3Y daily adjusted close |
| Optimizer | PyPortfolioOpt | Sharpe max, Ledoit-Wolf covariance |
| Risk-free rate | **FRED API** | SA 10Y bond yield, series IRLTLT01ZAM156N |
| Streaming | Server-Sent Events (SSE) | Live execution log during fetch + optimize |
| Export | jsPDF + html2canvas | Client-side PDF report generation |
| Deployment | Vercel (FE) + Render (BE) | Free tiers, environment variable support |

---

## FRED API Integration (Critical — Read Fully)

### What FRED Is

FRED (Federal Reserve Economic Data) is published by the Federal Reserve Bank of St. Louis.
It is the standard institutional source for macroeconomic time series data used by central
banks, sovereign wealth funds, and academic researchers globally. The API is free, requires
a key, and has generous rate limits (120 requests/minute). It carries the SA 10-year
government bond yield updated monthly with a short lag.

### The Correct FRED Series for This Application

```
Series ID:   IRLTLT01ZAM156N
Description: Long-Term Government Bond Yields: 10-Year: Main (Including Benchmark) for South Africa
Source:      OECD via FRED
Frequency:   Monthly
Units:       Percent per annum (e.g. 10.5 = 10.5% — divide by 100 in code)
URL:         https://fred.stlouisfed.org/series/IRLTLT01ZAM156N
```

Do not use any other series. This is the only FRED series that reliably tracks the SA 10-year
benchmark government bond yield. Other South African rate series on FRED cover shorter
durations or the repo rate, which would understate the risk-free rate and inflate Sharpe Ratios.

### Step-by-Step: Getting a FRED API Key

1. Go to https://fred.stlouisfed.org/docs/api/api_key.html
2. Click "Request API Key"
3. Log in or create a free account (email only, no payment details)
4. Fill in the application form — describe use as "portfolio optimization research tool"
5. Your API key is issued immediately on the confirmation page and emailed to you
6. The key is a 32-character alphanumeric string, e.g. `abcdef1234567890abcdef1234567890`
7. Store it in your backend `.env` file as `FRED_API_KEY=your_key_here`
8. Never commit this key to git — add `.env` to `.gitignore` immediately

### FRED API Endpoint Structure

```
GET https://api.stlouisfed.org/fred/series/observations
  ?series_id=IRLTLT01ZAM156N
  &api_key=YOUR_FRED_API_KEY
  &sort_order=desc
  &limit=3
  &file_type=json
```

Parameters explained:

- `series_id=IRLTLT01ZAM156N` — the SA 10-year bond series
- `sort_order=desc` — most recent observation first
- `limit=3` — fetch 3 observations; FRED sometimes returns `"."` for the most recent month
  if data has not yet been published. Three gives us two backup values.
- `file_type=json` — response format

Example response from FRED:

```json
{
  "observations": [
    { "date": "2026-04-01", "value": "." },
    { "date": "2026-03-01", "value": "10.45" },
    { "date": "2026-02-01", "value": "10.38" }
  ]
}
```

The `value` field is a string in percentage points. Convert: `rf_rate = float(value) / 100`.
The code must skip observations where `value == "."` and use the next valid one.

### `rf_service.py` — Full Implementation

```python
import httpx
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

FRED_API_KEY = os.getenv("FRED_API_KEY")
FRED_SERIES_ID = "IRLTLT01ZAM156N"
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
FALLBACK_RF = float(os.getenv("FALLBACK_RF_RATE", "0.1050"))

# In-memory cache — FRED data is monthly, no need to call on every request
_cache: dict = {"data": None, "fetched_at": None}
CACHE_TTL_HOURS = 6


async def get_rf_rate() -> dict:
    """
    Fetch the South African 10-year government bond yield from FRED.

    Returns:
        {
            "rate": float,        e.g. 0.1045
            "rate_pct": float,    e.g. 10.45
            "date": str,          e.g. "2026-03-01"
            "source": str,        "FRED" or "fallback"
            "series_id": str      "IRLTLT01ZAM156N"
        }
    """
    # Return cached value if still fresh
    if _cache["data"] is not None:
        age = datetime.utcnow() - _cache["fetched_at"]
        if age < timedelta(hours=CACHE_TTL_HOURS):
            return _cache["data"]

    if not FRED_API_KEY:
        logger.warning("FRED_API_KEY not set. Using fallback Rf rate.")
        return _build_fallback("FRED_API_KEY env var not configured")

    params = {
        "series_id": FRED_SERIES_ID,
        "api_key": FRED_API_KEY,
        "sort_order": "desc",
        "limit": 3,
        "file_type": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(FRED_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        observations = data.get("observations", [])
        if not observations:
            raise ValueError("FRED returned an empty observations list.")

        # Walk through observations — skip any where value is "." (unpublished)
        rate_decimal = None
        rate_date = None
        for obs in observations:
            raw_value = obs.get("value", ".")
            if raw_value == "." or raw_value is None:
                continue
            try:
                rate_decimal = float(raw_value) / 100.0
                rate_date = obs["date"]
                break
            except (ValueError, TypeError):
                continue

        if rate_decimal is None:
            raise ValueError("All recent FRED observations contain missing values ('.').")

        result = {
            "rate": round(rate_decimal, 6),
            "rate_pct": round(rate_decimal * 100, 4),
            "date": rate_date,
            "source": "FRED",
            "series_id": FRED_SERIES_ID,
        }

        _cache["data"] = result
        _cache["fetched_at"] = datetime.utcnow()

        logger.info(f"FRED Rf rate: {result['rate_pct']}% (as of {rate_date})")
        return result

    except httpx.HTTPStatusError as e:
        logger.error(f"FRED HTTP {e.response.status_code}: {e}")
    except httpx.RequestError as e:
        logger.error(f"FRED network error: {e}")
    except Exception as e:
        logger.error(f"FRED unexpected error: {e}")

    return _build_fallback("FRED API unreachable")


def _build_fallback(reason: str = "") -> dict:
    if reason:
        logger.warning(f"Using hardcoded Rf fallback. Reason: {reason}")
    return {
        "rate": FALLBACK_RF,
        "rate_pct": round(FALLBACK_RF * 100, 2),
        "date": "fallback",
        "source": "fallback",
        "series_id": FRED_SERIES_ID,
    }
```

### Backend Route — `/rf-rate`

```python
# routers/market.py
from fastapi import APIRouter
from services.rf_service import get_rf_rate

router = APIRouter()

@router.get("/rf-rate")
async def rf_rate_endpoint():
    """
    Returns the live SA 10-year government bond yield from FRED (IRLTLT01ZAM156N).
    Used by the frontend to pre-populate the risk-free rate parameter field.
    Cached for 6 hours. Falls back gracefully if FRED is unreachable.
    """
    return await get_rf_rate()
```

### Frontend Hook — `useRfRate.js`

```js
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export function useRfRate() {
  const [rfData, setRfData] = useState({
    rate: 0.1050,
    rate_pct: 10.50,
    date: null,
    source: 'loading',
    series_id: 'IRLTLT01ZAM156N',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/rf-rate`)
      .then(res => {
        setRfData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setRfData(prev => ({ ...prev, source: 'fallback' }));
        setLoading(false);
      });
  }, []);

  return { rfData, loading };
}
```

### Displaying the Rf Rate in Stage 02

The fetched rate is shown in the parameters panel with a source badge. The user can
override it by typing directly into the field — the override is sent in the request body.

```jsx
const { rfData } = useRfRate();
const [rfOverride, setRfOverride] = useState(null);
const effectiveRfPct = rfOverride ?? rfData.rate_pct;

<div className="flex justify-between items-center">
  <span className="font-mono text-[9px] tracking-widest text-nb-muted">RISK-FREE RATE</span>
  <div className="flex items-center gap-2">
    <input
      type="number"
      step="0.01"
      value={effectiveRfPct.toFixed(2)}
      onChange={e => setRfOverride(parseFloat(e.target.value))}
      className="w-16 bg-transparent text-right font-mono text-sm text-nb-text
                 border border-nb-border focus:border-nb-cyan outline-none px-1"
    />
    <span className="font-mono text-xs text-nb-muted">%</span>

    {rfData.source === 'FRED' && !rfOverride && (
      <span className="font-mono text-[8px] text-nb-emerald border border-nb-emerald px-1 py-px">
        FRED LIVE
      </span>
    )}
    {rfData.source === 'fallback' && (
      <span className="font-mono text-[8px] text-amber-500 border border-amber-500 px-1 py-px">
        FALLBACK
      </span>
    )}
    {rfOverride !== null && (
      <button onClick={() => setRfOverride(null)}
              className="font-mono text-[8px] text-nb-dim border border-nb-border px-1 py-px
                         hover:border-nb-border-bright hover:text-nb-muted">
        RESET
      </button>
    )}
  </div>
</div>

{rfData.source === 'FRED' && rfData.date && rfData.date !== 'fallback' && (
  <p className="font-mono text-[8px] text-nb-dim mt-1 text-right">
    IRLTLT01ZAM156N · as of {rfData.date}
  </p>
)}
```

### Startup Cache Warm-Up

Pre-fetch the FRED rate when the backend boots so the first user request is instant:

```python
# main.py
@app.on_event("startup")
async def startup():
    from services.rf_service import get_rf_rate
    rate = await get_rf_rate()
    print(f"[startup] Rf rate cached: {rate['rate_pct']}% ({rate['source']})")
```

---

## Design System — Neo-Brutalism Dark Tech

### Colour Tokens

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        nb: {
          bg:             '#0C0C0D',
          surface:        '#141415',
          border:         '#2C2C2E',
          'border-bright':'#3A3A3C',
          text:           '#E0E0E2',
          muted:          '#6E6E73',
          dim:            '#404040',
          cyan:           '#00D4FF',
          emerald:        '#00C853',
          red:            '#FF453A',
          amber:          '#FFB340',
        }
      },
      fontFamily: {
        mono: ["'SF Mono'", "'Cascadia Code'", "'Fira Mono'", 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        full: '9999px',
      },
    }
  }
}
```

### Colour Discipline — Enforce Strictly

- `nb-cyan` (`#00D4FF`): CTAs, Sharpe Ratio value, FRED LIVE badge, highlighted targets
- `nb-emerald` (`#00C853`): positive returns, optimal point, weight bars, log check marks
- `nb-red` (`#FF453A`): errors, dropped tickers, invalid chips
- `nb-amber` (`#FFB340`): fallback Rf badge, Sharpe below 0.5, sub-optimal warnings
- `nb-muted` (`#6E6E73`): labels, log lines before resolution
- `nb-dim` (`#404040`): stage number labels, axis labels, chart annotations
- Never use emerald or cyan decoratively — they must encode meaning

### Stage Shell Component

```jsx
export function StageShell({ number, label, children }) {
  return (
    <section className="border-2 border-nb-border border-t-0 first:border-t-2">
      <div className="border-b border-nb-surface px-4 py-2">
        <span className="font-mono text-[8px] tracking-[0.2em] text-nb-dim">
          {number} / {label}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
```

---

## Stage 01 — Input

### Ticker Autocomplete (Bundled JSE Listing)

Rather than requiring users to know JSE tickers, the input searches a bundled
`jse_tickers.json` file containing all JSE-listed instruments:

```json
[
  { "ticker": "NPN", "name": "Naspers Limited", "sector": "Consumer Discretionary", "cap_tier": "large" },
  { "ticker": "SBK", "name": "Standard Bank Group", "sector": "Financials", "cap_tier": "large" }
]
```

Populate this file from the JSE website once. It does not need to be real-time — update
monthly via a script. The autocomplete filters client-side with no API call needed.

The dropdown sits below the input, flat, monospaced, max 6 results, styled as a
`border-2 border-nb-border bg-nb-surface` block — no border-radius, no shadow.
Each row: `"NPN — Naspers Limited — Large Cap"`. Click or Enter to add.

### Ticker Input Behaviour

- Uppercase-enforced on change via `toUpperCase()`
- `Enter` or clicking a suggestion adds the ticker
- On add: debounced call to `/validate/{ticker}` — show spinner on chip, then ✓ or ×
- Maximum 15 tickers — show helper text when limit is reached
- Minimum 3 — OPTIMIZE button disabled below this with tooltip

### Chip Animation

```jsx
<AnimatePresence mode="popLayout">
  {tickers.map(t => (
    <motion.div
      key={t.ticker}
      layout
      initial={{ opacity: 0, scale: 0.85, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 8 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <TickerChip
        ticker={t.ticker}
        name={t.name}
        status={t.status}
        onRemove={() => removeTicker(t.ticker)}
      />
    </motion.div>
  ))}
</AnimatePresence>
```

---

## Stage 02 — Parameters & Compute

### Parameters Panel

| Parameter | Control | Default | Backend param |
|---|---|---|---|
| Risk-free rate | Editable input + FRED LIVE badge | From FRED API | `rf_rate` |
| Lookback period | Button group: 1Y / 2Y / 3Y / 5Y | 3Y | `period` |
| Max weight per asset | Range slider 5–100% with live readout | 40% | `max_weight` |
| Covariance estimator | Toggle: SAMPLE / LEDOIT-WOLF | Ledoit-Wolf | `estimator` |
| Monte Carlo sims | Button group: 1K / 5K / 10K | 5K | `n_simulations` |

Slider drag triggers a brief scale pulse on the readout label (`scale 1→1.12→1`, 120ms).

### Execution Log (SSE-driven)

Each log line animates in from the left as the SSE event arrives:

```jsx
<motion.div
  initial={{ opacity: 0, x: -12 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.18 }}
  className="flex items-center gap-2 font-mono text-[10px] py-[3px]"
>
  <span className={status === 'ok' ? 'text-nb-emerald' : 'text-nb-amber'}>
    {status === 'ok' ? '✓' : '⚠'}
  </span>
  <span className="text-nb-muted">{message}</span>
</motion.div>
```

Append a blinking cursor to the last line while running:

```css
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.cursor { animation: blink 800ms step-end infinite; }
```

### SSE Stream Format

```python
# routers/optimizer.py
@router.post("/optimize/stream")
async def optimize_stream(request: OptimizeRequest):
    async def event_generator():
        rf = await rf_service.get_rf_rate()
        yield sse("log", {"msg": f"Rf: {rf['rate_pct']:.2f}% ({rf['source'].upper()})", "status": "ok"})

        all_prices = {}
        for ticker in request.tickers:
            try:
                df = await data_service.fetch_single(ticker, request.period)
                all_prices[ticker] = df
                yield sse("fetch", {"ticker": f"{ticker}.JO", "rows": len(df), "status": "ok"})
            except Exception as e:
                yield sse("fetch", {"ticker": f"{ticker}.JO", "status": "error", "msg": str(e)})

        yield sse("log", {"msg": "Building covariance matrix...", "status": "ok"})
        result = optimizer_service.run_optimization(all_prices, request)
        yield sse("log", {"msg": f"Optimization complete ({result['duration_ms']}ms)", "status": "ok"})
        yield sse("done", result)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

def sse(event_type: str, data: dict) -> str:
    import json
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"
```

### Frontend SSE Consumer

```js
// hooks/useOptimizer.js
export function useOptimizer() {
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');

  const optimize = async (payload) => {
    setStatus('running');
    setLogs([]);
    setResult(null);

    const response = await fetch(`${API_URL}/optimize/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice(6));
        if (event.type === 'done') {
          setResult(event);
          setStatus('done');
        } else {
          setLogs(prev => [...prev, event]);
        }
      }
    }
  };

  return { optimize, logs, result, status };
}
```

---

## Stage 03 — Output

Stage 03 reveals with a slide-up fade when optimization completes:

```jsx
<AnimatePresence>
  {result && (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <StageShell number="03" label="OUTPUT">
        <OutputGrid result={result} />
      </StageShell>
    </motion.div>
  )}
</AnimatePresence>
```

### Left: Efficient Frontier Chart

```jsx
<ResponsiveContainer width="100%" height={260}>
  <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 36 }}>
    <CartesianGrid stroke="#191919" strokeDasharray="none" />
    <XAxis dataKey="vol" tickFormatter={v => `${(v*100).toFixed(0)}%`}
           tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }}
           label={{ value: 'σ (volatility)', position: 'insideBottom',
                    offset: -12, fill: '#404040', fontSize: 9 }} />
    <YAxis dataKey="ret" tickFormatter={v => `${(v*100).toFixed(0)}%`}
           tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }}
           label={{ value: 'μ (return)', angle: -90, position: 'insideLeft',
                    offset: 12, fill: '#404040', fontSize: 9 }} />
    <Tooltip content={<PortfolioTooltip />} />

    {/* Monte Carlo cloud — batched reveal animation */}
    <Scatter data={visibleMcPoints} fill="rgba(0,190,220,0.22)" shape={<DotShape r={2} />} />

    {/* Parametric frontier line */}
    <Scatter data={frontierPoints} line={{ stroke: '#00D4FF', strokeWidth: 1.5 }}
             lineType="fitting" fill="none" />

    {/* Crosshair reference lines */}
    <ReferenceLine x={result.optimal_point.vol} stroke="rgba(0,200,83,0.25)"
                   strokeDasharray="4 4" strokeWidth={0.75} />
    <ReferenceLine y={result.optimal_point.ret} stroke="rgba(0,200,83,0.25)"
                   strokeDasharray="4 4" strokeWidth={0.75} />

    {/* Optimal portfolio — emerald diamond */}
    <Scatter data={[result.optimal_point]} shape={<DiamondShape />} fill="#00C853" />
  </ScatterChart>
</ResponsiveContainer>
```

Monte Carlo dot batched reveal:

```js
useEffect(() => {
  if (!result) return;
  let i = 0;
  const BATCH = 60;
  const total = result.monte_carlo.length;
  const timer = setInterval(() => {
    setVisibleMcPoints(result.monte_carlo.slice(0, Math.min(i + BATCH, total)));
    i += BATCH;
    if (i >= total) clearInterval(timer);
  }, 40);
  return () => clearInterval(timer);
}, [result]);
```

Custom tooltip — hard-bordered, no border-radius, monospaced:

```jsx
function PortfolioTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { ret, vol, sharpe } = payload[0].payload;
  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2">
      <div className="flex gap-3"><span className="text-nb-dim">RET</span>
        <span className="text-nb-emerald">{(ret*100).toFixed(2)}%</span></div>
      <div className="flex gap-3"><span className="text-nb-dim">VOL</span>
        <span className="text-nb-text">{(vol*100).toFixed(2)}%</span></div>
      <div className="flex gap-3"><span className="text-nb-dim">SR </span>
        <span className="text-nb-cyan">{sharpe.toFixed(3)}</span></div>
    </div>
  );
}
```

### Right: Weights + Metrics

Staggered weight row reveal with animated bar fill:

```jsx
{result.weights.map((w, i) => (
  <motion.div
    key={w.ticker}
    initial={{ opacity: 0, x: 14 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.08, duration: 0.25 }}
    className="flex items-center gap-2"
  >
    <span className="font-mono text-[10px] text-nb-muted w-7 shrink-0">{w.ticker}</span>
    <div className="flex-1 bg-nb-surface h-[2px]">
      <motion.div
        className="bg-nb-emerald h-full"
        initial={{ width: '0%' }}
        animate={{ width: `${(w.weight * 100).toFixed(1)}%` }}
        transition={{ delay: i * 0.08 + 0.1, duration: 0.6, ease: 'easeOut' }}
      />
    </div>
    <span className="font-mono text-[10px] text-nb-text w-8 text-right">
      {(w.weight * 100).toFixed(1)}%
    </span>
  </motion.div>
))}
```

Count-up hook for metric values:

```js
// hooks/useCountUp.js
export function useCountUp(target, duration = 800, decimals = 2) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return value;
}
```

Metric card border flash on mount — emerald for Return, cyan for Sharpe:

```jsx
<motion.div
  className="border-2 border-nb-border p-3"
  animate={{ borderColor: ['#00C853', '#2C2C2E'] }}
  transition={{ duration: 0.8, delay: 0.3 }}
>
  <div className="font-mono text-[8px] tracking-widest text-nb-dim">EXP. RETURN</div>
  <div className="font-mono text-lg text-nb-emerald mt-1">+{animatedReturn.toFixed(2)}%</div>
</motion.div>
```

Sharpe card renders amber (`text-nb-amber`, `border-nb-amber`) if Sharpe < 0.5.

### Export Controls

```jsx
<div className="flex gap-2 mt-4 pt-4 border-t-2 border-nb-border">
  <button onClick={downloadCSV}
          className="flex-1 border-2 border-nb-border font-mono text-[9px]
                     tracking-widest py-2 text-nb-muted hover:border-nb-border-bright
                     hover:text-nb-text transition-colors">
    DOWNLOAD CSV
  </button>
  <button onClick={downloadPDF}
          className="flex-1 border-2 border-nb-border font-mono text-[9px]
                     tracking-widest py-2 text-nb-muted hover:border-nb-border-bright
                     hover:text-nb-text transition-colors">
    DOWNLOAD PDF
  </button>
</div>
```

CSV columns: `Ticker, Weight (%), Contribution to Return (%), Contribution to Risk (%)`.
PDF: capture Stage 03 DOM node via `html2canvas`, embed in A4 `jsPDF` document.

---

## Additional Features

### Feature 1 — Sector Exposure Breakdown (include in v1)

Below the weight bars, a horizontal stacked bar shows portfolio exposure by JSE sector.
Derived from `sector_map.json` bundled in the frontend — no extra API call.

```jsx
// components/SectorBreakdown.jsx
// Sectors: Financials, Resources, Industrials, Consumer Discretionary,
//          Consumer Staples, Technology, Telecommunications, Other
// Full-width bar, 4px height, each segment width = combined weight %
// Hover: tooltip with sector name + combined weight
// Colour palette — NOT emerald/cyan (reserved for metrics):
//   Financials → amber, Resources → red-dim, Industrials → purple-dim
//   Consumer → teal-dim, Technology → blue-dim, Other → gray
// All segment colours at reduced opacity (0.7) to stay subordinate to main metrics
```

```python
# services/sector_service.py — static mapping, extend as needed
SECTOR_MAP = {
    "NPN": "Consumer Discretionary", "MRP": "Consumer Discretionary",
    "SBK": "Financials", "FSR": "Financials", "NED": "Financials", "ABG": "Financials",
    "AGL": "Resources", "BHP": "Resources", "SOL": "Resources", "SAP": "Resources",
    "SHP": "Consumer Staples", "PIK": "Consumer Staples", "WHL": "Consumer Staples",
    "MTN": "Telecommunications", "VOD": "Telecommunications",
    "NPN": "Technology",
}

def compute_sector_exposure(weights: dict) -> list[dict]:
    exposure = {}
    for ticker, weight in weights.items():
        sector = SECTOR_MAP.get(ticker.replace(".JO", ""), "Other")
        exposure[sector] = exposure.get(sector, 0) + weight
    return [{"sector": s, "weight": round(w, 4)} for s, w in sorted(
        exposure.items(), key=lambda x: -x[1]
    )]
```

### Feature 2 — Backtested Equity Curve (v1 or v2)

Given optimal weights, compute a rebased-to-100 historical portfolio value over the
lookback period, overlaid against the ALSI (`^J203.JO`) as benchmark.

```python
# services/backtest_service.py
def compute_equity_curve(prices: pd.DataFrame, weights: dict) -> dict:
    w = pd.Series({f"{k}.JO": v for k, v in weights.items()})
    w = w.reindex(prices.columns).fillna(0)
    portfolio_returns = prices.pct_change().dropna().dot(w)
    portfolio_curve = (1 + portfolio_returns).cumprod() * 100

    alsi = yf.download("^J203.JO", period="3y", auto_adjust=True)["Close"]
    alsi_curve = (alsi / alsi.iloc[0]) * 100
    alsi_aligned = alsi_curve.reindex(portfolio_curve.index, method="ffill")

    return {
        "dates": portfolio_curve.index.strftime("%Y-%m-%d").tolist(),
        "portfolio": portfolio_curve.round(2).tolist(),
        "benchmark": alsi_aligned.round(2).tolist(),
        "total_return_pct": round((portfolio_curve.iloc[-1] / 100 - 1) * 100, 2),
        "benchmark_return_pct": round((alsi_aligned.iloc[-1] / 100 - 1) * 100, 2),
        "alpha_pct": round(
            (portfolio_curve.iloc[-1] - alsi_aligned.iloc[-1]) / alsi_aligned.iloc[-1] * 100, 2
        ),
    }
```

Render in a Recharts `<LineChart>` below the frontier. Portfolio in emerald,
ALSI in muted slate. Total return and alpha annotated in the top-right corner.
Reveal animation: `pathLength 0→1` on the SVG stroke, 1200ms ease-in-out.

### Feature 3 — Sensitivity Table (v2)

A 5×5 grid of Sharpe Ratios across combinations of target return (rows) and target
volatility (columns). The maximum-Sharpe cell is highlighted in emerald. Cell background
opacity scales with Sharpe value — darker = higher Sharpe.

```jsx
// components/SensitivityTable.jsx
// Row headers: "μ =" values at 5 evenly spaced return targets
// Column headers: "σ =" values at 5 evenly spaced vol targets
// Each cell: Sharpe value in font-mono text-[10px]
// Max Sharpe cell: bg-nb-emerald text-black
// Other cells: bg-nb-emerald at opacity proportional to (Sharpe / maxSharpe)
// Entire table reveals with a staggered cell fade-in on mount
```

### Feature 4 — Portfolio Comparison Mode (v2)

After a first optimization, a `SAVE & COMPARE` button appears. Users can run up to 3
optimizations with different tickers or constraints and compare side-by-side.

```jsx
// ComparePanel.jsx
// Comparison renders as a horizontal grid of 2-3 cards
// Each card: ticker list, weight bars, Return / Vol / Sharpe
// Delta column between cards: +/- in cyan (better) or red (worse)
// "CLEAR COMPARISON" resets to single-portfolio mode
```

### Feature 5 — Cold Start Warning (include in v1)

On page load, ping `/health` with a 4-second timeout. Show a non-blocking amber banner
if the backend takes too long:

```jsx
// components/ColdStartBanner.jsx
{showWarning && (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="border border-nb-amber font-mono text-[9px] text-amber-500
               tracking-wide px-3 py-2 mt-3"
  >
    BACKEND WARMING UP — first optimization may take 30–60s
  </motion.div>
)}
```

Dismiss automatically once `/health` resolves. The banner must not block interaction.

---

## Backend — Core Service Implementations

### `data_service.py`

```python
import yfinance as yf
import pandas as pd
import asyncio
import os

TIMEOUT = int(os.getenv("YFINANCE_TIMEOUT", "20"))

async def fetch_prices(tickers: list[str], period: str = "3y") -> tuple[pd.DataFrame, list[str]]:
    formatted = [f"{t}.JO" for t in tickers]
    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: yf.download(formatted, period=period, auto_adjust=True,
                             progress=False, timeout=TIMEOUT)
    )
    prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
    min_rows = int(len(prices) * 0.95)
    clean = prices.dropna(thresh=min_rows, axis=1).dropna()

    dropped = [t.replace(".JO", "") for t in formatted if f"{t}" not in clean.columns]
    if clean.shape[1] < 2:
        raise ValueError("Fewer than 2 tickers have sufficient data.")
    return clean, dropped


async def validate_ticker(ticker: str) -> dict:
    formatted = f"{ticker}.JO"
    loop = asyncio.get_event_loop()
    try:
        info = await loop.run_in_executor(None, lambda: yf.Ticker(formatted).fast_info)
        return {"valid": True, "ticker": ticker,
                "name": getattr(info, "company_name", ticker)}
    except Exception:
        return {"valid": False, "ticker": ticker}
```

### `optimizer_service.py`

```python
import time
import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier, expected_returns, risk_models

def run_optimization(prices: pd.DataFrame, request) -> dict:
    start = time.time()
    mu = expected_returns.mean_historical_return(prices)

    if request.estimator == "ledoit_wolf":
        S = risk_models.CovarianceShrinkage(prices).ledoit_wolf()
    else:
        S = risk_models.sample_cov(prices)

    ef = EfficientFrontier(mu, S)
    ef.add_constraint(lambda w: w <= request.max_weight)
    ef.add_constraint(lambda w: w >= 0.0)
    ef.max_sharpe(risk_free_rate=request.rf_rate)
    weights = ef.clean_weights()
    perf = ef.portfolio_performance(risk_free_rate=request.rf_rate, verbose=False)

    mc = _monte_carlo(mu, S, request.rf_rate, request.n_simulations)
    frontier = _frontier_line(mu, S, request.rf_rate)

    weight_list = [
        {
            "ticker": t.replace(".JO", ""),
            "weight": round(w, 6),
            "contribution_to_return": round(w * float(mu.get(t, 0)), 6),
        }
        for t, w in weights.items() if w > 1e-5
    ]

    return {
        "weights": weight_list,
        "expected_return": round(perf[0], 6),
        "volatility": round(perf[1], 6),
        "sharpe_ratio": round(perf[2], 6),
        "monte_carlo": mc,
        "frontier": frontier,
        "optimal_point": {"vol": round(perf[1], 6), "ret": round(perf[0], 6)},
        "duration_ms": round((time.time() - start) * 1000),
        "weights_sum_check": round(sum(weights.values()), 6),
    }


def _monte_carlo(mu, S, rf, n):
    results = []
    mu_arr = mu.values
    S_arr = S.values if hasattr(S, 'values') else np.array(S)
    n_assets = len(mu_arr)
    for _ in range(n):
        w = np.random.dirichlet(np.ones(n_assets))
        ret = float(w @ mu_arr)
        vol = float(np.sqrt(w @ S_arr @ w))
        sharpe = (ret - rf) / vol if vol > 0 else 0
        results.append({"vol": round(vol, 5), "ret": round(ret, 5), "sharpe": round(sharpe, 4)})
    return results


def _frontier_line(mu, S, rf, n_points=40):
    points = []
    mu_min = float(mu.min())
    mu_max = float(mu.max())
    for target in np.linspace(mu_min, mu_max, n_points):
        try:
            ef = EfficientFrontier(mu, S)
            ef.add_constraint(lambda w: w >= 0)
            ef.efficient_return(target)
            perf = ef.portfolio_performance(risk_free_rate=rf, verbose=False)
            points.append({"vol": round(perf[1], 5), "ret": round(perf[0], 5)})
        except Exception:
            continue
    return points
```

### `schemas.py`

```python
from pydantic import BaseModel, validator, Field

class OptimizeRequest(BaseModel):
    tickers: list[str] = Field(..., min_items=3, max_items=15)
    rf_rate: float = Field(0.1050, ge=0.0, le=1.0)
    period: str = Field("3y", pattern="^(1y|2y|3y|5y)$")
    max_weight: float = Field(0.40, ge=0.05, le=1.0)
    estimator: str = Field("ledoit_wolf", pattern="^(ledoit_wolf|sample)$")
    n_simulations: int = Field(5000, ge=1000, le=10000)

    @validator("tickers")
    def clean_tickers(cls, v):
        cleaned = list(dict.fromkeys([t.upper().strip() for t in v]))
        return cleaned

    @validator("max_weight")
    def weight_must_be_feasible(cls, v, values):
        n = len(values.get("tickers", []))
        if n > 0 and v < 1.0 / n:
            raise ValueError(f"max_weight {v:.2f} too low for {n} assets.")
        return v

class OptimizeResponse(BaseModel):
    weights: list[dict]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    monte_carlo: list[dict]
    frontier: list[dict]
    optimal_point: dict
    rf_rate_used: float
    rf_rate_source: str
    period_used: str
    tickers_dropped: list[str]
    duration_ms: int
    weights_sum_check: float
```

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import optimizer, market, health

app = FastAPI(title="JSE Portfolio Optimizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173"), "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(optimizer.router)
app.include_router(market.router)
app.include_router(health.router)

@app.on_event("startup")
async def startup():
    from services.rf_service import get_rf_rate
    rate = await get_rf_rate()
    print(f"[startup] FRED Rf rate: {rate['rate_pct']}% (source: {rate['source']})")
```

---

## Error Handling Matrix

| Scenario | Backend Response | Frontend Display |
|---|---|---|
| Invalid ticker | 422, `invalid_tickers: [...]` | Red chip border, tooltip "Not found on JSE" |
| Ticker < 1Y history | Dropped, listed in `tickers_dropped` | Amber banner "XYZ dropped — insufficient history" |
| Singular covariance | Ledoit-Wolf auto-applied | Log line "⚠ Switched to Ledoit-Wolf estimator" |
| `max_weight` too low for n assets | 422, explanation message | Red inline error below slider |
| FRED key missing | `source: "fallback"` in response | Amber FALLBACK badge — no disruption to UX |
| FRED unreachable | `source: "fallback"` silently | Amber FALLBACK badge — no disruption to UX |
| yfinance rate limited | 429, `retry_after` field | "Data provider busy — retry in Xs" with countdown |
| Sharpe < 0.5 | Normal response, low Sharpe value | Sharpe metric card renders in `nb-amber` |
| Backend timeout | 504 | "Optimization timed out. Try fewer tickers." |
| Network down | fetch throws | "Cannot reach backend" with RETRY button |
| weights_sum_check != 1.0 | Log warning server-side | No user-facing display — investigate in logs |

---

## Animations Specification

| Element | Animation | Trigger | Config |
|---|---|---|---|
| Ticker chip entry | `opacity 0→1, scale 0.85→1, x -8→0` | On add | 150ms ease-out |
| Ticker chip exit | `opacity 1→0, scale 1→0.85, x 0→8` | On remove | 120ms ease-out |
| Validation spinner | Rotate 360° continuously | On validate call | 600ms linear loop |
| Log lines | `opacity 0→1, x -12→0` | SSE event received | 180ms ease-out |
| Slider value readout | `scale 1→1.12→1` | On drag | 120ms |
| OPTIMIZE button press | Background `cyan→surface→cyan` | On click | 200ms |
| OPTIMIZE error shake | `x: [-6, 6, -6, 6, 0]` | On error | 350ms |
| Stage 03 reveal | `opacity 0→1, y 28→0`, custom cubic | Optimization done | 450ms |
| Monte Carlo dots | Batch render 60 dots every 40ms | Stage 03 mount | ~600ms total |
| Weight rows | `opacity 0→1, x 14→0`, staggered | Stage 03 mount | 250ms, 80ms stagger |
| Weight bar fill | `width 0%→target%` | Stage 03 mount | 600ms ease-out, staggered |
| Metric count-up | Value 0→final, ease-out cubic | Stage 03 mount | 800–1000ms |
| Metric border flash | Border emerald/cyan → nb-border | Stage 03 mount | 800ms delay 300ms |
| Equity curve draw | `pathLength 0→1` SVG stroke | Stage 03 mount | 1200ms ease-in-out |
| Sector bar segments | `width 0→target%`, staggered by segment | Stage 03 mount | 400ms, 60ms stagger |
| Cold start banner | `opacity 0→1, y 6→0` | Health timeout | 300ms |

---

## `requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.1
httpx==0.27.0
yfinance==0.2.40
pypfopt==1.5.5
pandas==2.2.2
numpy==1.26.4
scipy==1.13.0
python-dotenv==1.0.1
```

---

## Deployment

### Backend — Render

- Runtime: Python 3.11
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set these in the Render dashboard (not in code):
  - `FRED_API_KEY` — your 32-char key from fred.stlouisfed.org
  - `CORS_ORIGIN` — e.g. `https://jse-optimizer.vercel.app`
  - `FALLBACK_RF_RATE` — `0.1050`
  - `YFINANCE_TIMEOUT` — `20`
  - `MAX_TICKERS` — `15`
- Enable auto-deploy from main branch
- Free tier cold-starts after 15min inactivity — ColdStartBanner handles the UX

### Frontend — Vercel

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

Set in Vercel dashboard: `VITE_API_URL=https://your-backend.onrender.com`

### `.env.example` (commit this to git, never `.env`)

```bash
# Backend
FRED_API_KEY=your_32_char_fred_key_here
FALLBACK_RF_RATE=0.1050
CORS_ORIGIN=http://localhost:5173
YFINANCE_TIMEOUT=20
MAX_TICKERS=15

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## Implementation Order

1. Scaffold — Vite frontend + FastAPI backend, CORS, `/health`, confirm cross-origin request works

2. FRED integration — `rf_service.py` with full fallback chain, `/rf-rate` endpoint,
   `useRfRate.js`, confirm live SA 10Y yield appears in UI with FRED LIVE badge

3. Backend data layer — `data_service.py`, `.JO` suffix, `/validate/{ticker}`, `/search`

4. Backend optimizer — `optimizer_service.py`, Monte Carlo, parametric frontier,
   `/optimize` JSON endpoint (non-streaming first for easier debugging)

5. Backend SSE — convert to `/optimize/stream`, test events arrive correctly in browser

6. Frontend Stage 01 — autocomplete dropdown, chip add/remove, validation, animations

7. Frontend Stage 02 — parameters panel with FRED badge, SSE log consumer,
   OPTIMIZE button states, blinking cursor

8. Frontend Stage 03 — Recharts frontier chart, batched dot reveal, staggered weight bars,
   count-up metric cards

9. Sector breakdown — `SectorBreakdown.jsx` from static `sector_map.json`, staggered bar

10. Backtested equity curve — `backtest_service.py`, ALSI fetch, `EquityCurve.jsx`

11. Export — CSV download (plain JS), PDF via jsPDF + html2canvas

12. Animations pass — layer all Framer Motion after logic is stable; test on 4x CPU throttle

13. Error handling — implement every row in the error matrix; test by removing FRED key,
    submitting bad tickers, and using Chrome offline mode

14. Cold start UX — `ColdStartBanner.jsx`, health ping with 4-second timeout detection

15. Deploy — Render first (set FRED_API_KEY, confirm `/rf-rate` returns live data in
    production logs), then Vercel with `VITE_API_URL` pointed at Render

---

## Key Invariants — Enforce Throughout

- `font-mono` on every financial figure — never sans-serif for numbers
- Emerald for positive/optimal only, cyan for CTAs/targets only, amber for warnings only
- Border-radius maximum 4px — enforced in Tailwind config
- All errors shown inline within the relevant stage — no toast notifications
- `rf_rate_used` and `rf_rate_source` always returned in the API response
- FRED key stored only in backend env — never in frontend code or committed to git
- `weights_sum_check` always included in the response for debugging weight arithmetic
- Weights displayed must visually sum to 100% — round to 1 decimal and verify
