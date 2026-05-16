# JSE Portfolio Optimizer — Implementation Plan

This document is the step-by-step build guide for the JSE Portfolio Optimizer. Each step includes the exact file to create, the complete code to write, and a verification check. Follow the steps in order — later steps depend on earlier ones.

Bugs present in the original spec have been corrected here. Do not reference the original `JSE_Portfolio_Optimizer_Plan.md` for implementation details; use this document as the authoritative source.

---

## Step 0 — Repo Scaffold

Create the directory structure and install dependencies.

```
jse-portfolio-optimizer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── data/
│   │   └── lib/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── main.py
│   └── requirements.txt
├── .env.example
└── .gitignore
```

**Actions:**
1. `mkdir -p jse-portfolio-optimizer/{frontend,backend/{routers,services,models}}`
2. Inside `frontend/`: `npm create vite@latest . -- --template react`
3. `npm install tailwindcss@3 postcss autoprefixer framer-motion recharts axios jspdf html2canvas`
4. `npx tailwindcss init -p`
5. Create `backend/requirements.txt`:
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
6. Create `.gitignore`:
```
.env
node_modules/
__pycache__/
dist/
.venv/
*.pyc
```
7. Create `.env.example`:
```bash
# Backend
FRED_API_KEY=your_32_char_fred_key_here
FALLBACK_RF_RATE=0.1050
CORS_ORIGIN=http://localhost:5173
YFINANCE_TIMEOUT=20

# Frontend
VITE_API_URL=http://localhost:8000
```

**Verification:** `curl http://localhost:8000/health` returns `{"status":"ok"}` after Step 2 is complete.

---

## Step 1 — Tailwind Design System

**File: `frontend/tailwind.config.js`**
```js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
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

**File: `frontend/src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-nb-bg text-nb-text font-mono; }
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.cursor { animation: blink 800ms step-end infinite; }
```

**File: `frontend/src/lib/constants.js`**
```js
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export const MAX_TICKERS = 15;
export const MIN_TICKERS = 3;
export const DEFAULT_RF_PCT = 10.50;
export const DEFAULT_MAX_WEIGHT = 0.40;
export const DEFAULT_PERIOD = '3y';
export const DEFAULT_ESTIMATOR = 'ledoit_wolf';
export const DEFAULT_N_SIMS = 5000;
```

---

## Step 2 — Backend: Health + CORS + Lifespan

**File: `backend/main.py`**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import optimizer, market, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.rf_service import get_rf_rate
    rate = await get_rf_rate()
    print(f"[startup] FRED Rf rate: {rate['rate_pct']}% (source: {rate['source']})")
    yield

app = FastAPI(title="JSE Portfolio Optimizer API", version="1.0.0", lifespan=lifespan)

# Filter None in case CORS_ORIGIN env var is not set
origins = list(filter(None, [os.getenv("CORS_ORIGIN"), "http://localhost:5173"]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    # allow_credentials intentionally omitted — no cookies used
)

app.include_router(optimizer.router)
app.include_router(market.router)
app.include_router(health.router)
```

**File: `backend/routers/health.py`**
```python
from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok"}
```

**Verification:** `curl http://localhost:8000/health` → `{"status":"ok"}`

---

## Step 3 — Backend: FRED Risk-Free Rate Service

Get a free FRED API key at fred.stlouisfed.org/docs/api/api_key.html. Store as `FRED_API_KEY` in `.env`. The series `IRLTLT01ZAM156N` is the SA 10-year government bond yield — do not substitute another series.

**File: `backend/services/rf_service.py`**
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
CACHE_TTL_HOURS = 6

_cache: dict = {"data": None, "fetched_at": None}


async def get_rf_rate() -> dict:
    if _cache["data"] is not None:
        age = datetime.utcnow() - _cache["fetched_at"]
        if age < timedelta(hours=CACHE_TTL_HOURS):
            return _cache["data"]

    if not FRED_API_KEY:
        logger.warning("FRED_API_KEY not set — using fallback Rf rate.")
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

        rate_decimal, rate_date = None, None
        for obs in data.get("observations", []):
            raw = obs.get("value", ".")
            if raw == "." or raw is None:
                continue
            try:
                rate_decimal = float(raw) / 100.0
                rate_date = obs["date"]
                break
            except (ValueError, TypeError):
                continue

        if rate_decimal is None:
            raise ValueError("All recent FRED observations contain missing values.")

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

**File: `backend/routers/market.py`** (rf-rate endpoint only at this step; validate endpoints added in Step 8)
```python
from fastapi import APIRouter
from services.rf_service import get_rf_rate

router = APIRouter()

@router.get("/rf-rate")
async def rf_rate_endpoint():
    return await get_rf_rate()
```

**Verification:** `curl http://localhost:8000/rf-rate` returns `{"source":"FRED","rate_pct":...}` with key set, or `{"source":"fallback",...}` without.

---

## Step 4 — Backend: Data Service

Note: both `fetch_prices` (bulk, used by JSON endpoint) and `fetch_single` (per-ticker, used by SSE stream) must be defined here. The original spec omitted `fetch_single`, which causes `AttributeError` at runtime.

**File: `backend/services/data_service.py`**
```python
import yfinance as yf
import pandas as pd
import asyncio
import os

TIMEOUT = int(os.getenv("YFINANCE_TIMEOUT", "20"))


async def fetch_prices(tickers: list[str], period: str = "3y") -> tuple[pd.DataFrame, list[str]]:
    formatted = [f"{t}.JO" for t in tickers]
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: yf.download(formatted, period=period, auto_adjust=True,
                             progress=False, timeout=TIMEOUT)
    )
    prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
    min_rows = int(len(prices) * 0.95)
    clean = prices.dropna(thresh=min_rows, axis=1).dropna()
    dropped = [t for t in tickers if f"{t}.JO" not in clean.columns]

    if clean.shape[1] < 3:
        raise ValueError(
            f"Only {clean.shape[1]} ticker(s) have sufficient data after cleaning. "
            f"Need at least 3. Dropped: {dropped}"
        )
    return clean, dropped


async def fetch_single(ticker: str, period: str = "3y") -> pd.Series:
    formatted = f"{ticker}.JO"
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: yf.download(formatted, period=period, auto_adjust=True,
                             progress=False, timeout=TIMEOUT)
    )
    close = raw["Close"] if "Close" in raw.columns else raw.iloc[:, 0]
    if close.dropna().shape[0] < 50:
        raise ValueError(f"{ticker} has insufficient history (< 50 rows).")
    return close.dropna()


async def validate_ticker(ticker: str) -> dict:
    formatted = f"{ticker}.JO"
    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(None, lambda: yf.Ticker(formatted).fast_info)
        return {"valid": True, "ticker": ticker,
                "name": getattr(info, "company_name", ticker)}
    except Exception:
        return {"valid": False, "ticker": ticker}
```

---

## Step 5 — Backend: Pydantic Schemas

Note: `requirements.txt` uses Pydantic v2. Use `@field_validator` and `Annotated[list[str], Field(min_length=...)]` — the v1 `@validator` and `min_items=` silently do nothing in v2.

**File: `backend/models/schemas.py`**
```python
from typing import Annotated
from pydantic import BaseModel, Field, field_validator

class OptimizeRequest(BaseModel):
    tickers: Annotated[list[str], Field(min_length=3, max_length=15)]
    rf_rate: float = Field(0.1050, ge=0.0, le=1.0)
    period: str = Field("3y", pattern="^(1y|2y|3y|5y)$")
    max_weight: float = Field(0.40, ge=0.05, le=1.0)
    estimator: str = Field("ledoit_wolf", pattern="^(ledoit_wolf|sample)$")
    n_simulations: int = Field(5000, ge=1000, le=10000)

    @field_validator("tickers")
    @classmethod
    def clean_tickers(cls, v):
        return list(dict.fromkeys([t.upper().strip() for t in v]))

    @field_validator("max_weight")
    @classmethod
    def weight_must_be_feasible(cls, v, info):
        n = len(info.data.get("tickers", []))
        if n > 0 and v < 1.0 / n:
            raise ValueError(f"max_weight {v:.2f} is too low for {n} assets (min = {1/n:.2f}).")
        return v


class WeightItem(BaseModel):
    ticker: str
    weight: float
    contribution_to_return: float
    contribution_to_risk: float


class OptimizeResponse(BaseModel):
    weights: list[WeightItem]
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

---

## Step 6 — Backend: Optimizer Service

Note: Monte Carlo uses fully vectorised NumPy — not a Python loop. The frontend receives max 1000 points (downsampled server-side). `contribution_to_risk` (marginal risk contribution) is required for the CSV export.

**File: `backend/services/optimizer_service.py`**
```python
import time
import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier, expected_returns, risk_models


def run_optimization(prices: pd.DataFrame, request, rf_rate: float) -> dict:
    start = time.time()
    mu = expected_returns.mean_historical_return(prices)

    S = (risk_models.CovarianceShrinkage(prices).ledoit_wolf()
         if request.estimator == "ledoit_wolf"
         else risk_models.sample_cov(prices))

    ef = EfficientFrontier(mu, S)
    ef.add_constraint(lambda w: w <= request.max_weight)
    ef.add_constraint(lambda w: w >= 0.0)
    ef.max_sharpe(risk_free_rate=rf_rate)
    weights = ef.clean_weights()
    perf = ef.portfolio_performance(risk_free_rate=rf_rate, verbose=False)

    # Marginal risk contribution: w_i * (S @ w)_i / portfolio_vol
    w_arr = np.array([weights.get(t, 0.0) for t in prices.columns])
    S_arr = S.values if hasattr(S, "values") else np.array(S)
    port_vol = float(np.sqrt(w_arr @ S_arr @ w_arr))
    marginal = S_arr @ w_arr
    risk_contrib = (w_arr * marginal / port_vol) if port_vol > 0 else np.zeros_like(w_arr)
    risk_contrib_map = dict(zip(prices.columns, risk_contrib))

    weight_list = [
        {
            "ticker": t.replace(".JO", ""),
            "weight": round(w, 6),
            "contribution_to_return": round(w * float(mu.get(t, 0)), 6),
            "contribution_to_risk": round(float(risk_contrib_map.get(t, 0)), 6),
        }
        for t, w in weights.items() if w > 1e-5
    ]

    mc = _monte_carlo_vectorised(mu, S_arr, rf_rate, request.n_simulations)
    frontier = _frontier_line(mu, S, rf_rate)

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


def _monte_carlo_vectorised(mu, S_arr, rf: float, n: int) -> list[dict]:
    n_assets = len(mu)
    mu_arr = mu.values if hasattr(mu, "values") else np.array(mu)
    W = np.random.dirichlet(np.ones(n_assets), size=n)
    rets = W @ mu_arr
    vols = np.sqrt(np.einsum("ij,jk,ik->i", W, S_arr, W))
    sharpes = np.where(vols > 0, (rets - rf) / vols, 0.0)

    idx = np.random.choice(n, size=min(1000, n), replace=False)
    return [
        {"vol": round(float(vols[i]), 5),
         "ret": round(float(rets[i]), 5),
         "sharpe": round(float(sharpes[i]), 4)}
        for i in idx
    ]


def _frontier_line(mu, S, rf: float, n_points: int = 40) -> list[dict]:
    mu_min, mu_max = float(mu.min()), float(mu.max())
    points = []
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

---

## Step 7 — Backend: Sector Service

Note: no duplicate ticker keys — Python silently takes the last definition, giving wrong sector assignments.

**File: `backend/services/sector_service.py`**
```python
SECTOR_MAP = {
    # Consumer Discretionary
    "MRP": "Consumer Discretionary", "TFG": "Consumer Discretionary",
    "CPI": "Consumer Discretionary", "TRU": "Consumer Discretionary",
    # Consumer Staples
    "SHP": "Consumer Staples", "PIK": "Consumer Staples",
    "WHL": "Consumer Staples", "DCP": "Consumer Staples",
    # Financials
    "SBK": "Financials", "FSR": "Financials", "NED": "Financials",
    "ABG": "Financials", "DSY": "Financials", "SLM": "Financials",
    # Resources
    "AGL": "Resources", "BHP": "Resources", "SOL": "Resources",
    "SAP": "Resources", "SSW": "Resources", "IMP": "Resources",
    "GFI": "Resources", "HAR": "Resources", "AMS": "Resources",
    # Industrials
    "BTI": "Industrials", "APN": "Industrials", "JSE": "Industrials",
    # Technology
    "NPN": "Technology", "PRX": "Technology",
    # Telecommunications
    "MTN": "Telecommunications", "VOD": "Telecommunications",
}


def compute_sector_exposure(weights: dict) -> list[dict]:
    exposure: dict[str, float] = {}
    for ticker, weight in weights.items():
        sector = SECTOR_MAP.get(ticker.replace(".JO", ""), "Other")
        exposure[sector] = exposure.get(sector, 0) + weight
    return [
        {"sector": s, "weight": round(w, 4)}
        for s, w in sorted(exposure.items(), key=lambda x: -x[1])
    ]
```

---

## Step 8 — Backend: Optimizer Router + Market Routes

The router assembles the complete response (including `rf_rate_used`, `rf_rate_source`, `period_used`, `tickers_dropped`). The optimizer service only returns mathematical results — it does not know about the request context.

**File: `backend/routers/optimizer.py`**
```python
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import OptimizeRequest
from services import data_service, optimizer_service, rf_service, sector_service

router = APIRouter()


def sse(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


@router.post("/optimize/stream")
async def optimize_stream(request: OptimizeRequest):
    async def event_generator():
        rf = await rf_service.get_rf_rate()
        yield sse("log", {"msg": f"Rf: {rf['rate_pct']:.2f}% ({rf['source'].upper()})", "status": "ok"})

        prices_per_ticker: dict = {}
        for ticker in request.tickers:
            try:
                series = await data_service.fetch_single(ticker, request.period)
                prices_per_ticker[ticker] = series
                yield sse("fetch", {"ticker": f"{ticker}.JO", "rows": len(series), "status": "ok"})
            except Exception as e:
                yield sse("fetch", {"ticker": f"{ticker}.JO", "status": "error", "msg": str(e)})

        import pandas as pd
        valid_tickers = list(prices_per_ticker.keys())
        if len(valid_tickers) < 3:
            yield sse("error", {"msg": f"Only {len(valid_tickers)} tickers fetched successfully. Need at least 3."})
            return

        prices_df = pd.DataFrame(prices_per_ticker)
        prices_df.dropna(inplace=True)
        tickers_dropped = [t for t in request.tickers if t not in valid_tickers]

        yield sse("log", {"msg": "Building covariance matrix...", "status": "ok"})

        try:
            result = optimizer_service.run_optimization(prices_df, request, rf["rate"])
        except Exception as e:
            yield sse("error", {"msg": str(e)})
            return

        sector_exposure = sector_service.compute_sector_exposure(
            {w["ticker"]: w["weight"] for w in result["weights"]}
        )

        yield sse("log", {"msg": f"Optimization complete ({result['duration_ms']}ms)", "status": "ok"})
        yield sse("done", {
            **result,
            "rf_rate_used": rf["rate"],
            "rf_rate_source": rf["source"],
            "period_used": request.period,
            "tickers_dropped": tickers_dropped,
            "sector_exposure": sector_exposure,
        })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/optimize")
async def optimize_json(request: OptimizeRequest):
    """Non-streaming endpoint — use for debugging before the SSE stream is wired up."""
    import pandas as pd
    rf = await rf_service.get_rf_rate()
    prices, dropped = await data_service.fetch_prices(request.tickers, request.period)
    result = optimizer_service.run_optimization(prices, request, rf["rate"])
    sector_exposure = sector_service.compute_sector_exposure(
        {w["ticker"]: w["weight"] for w in result["weights"]}
    )
    return {
        **result,
        "rf_rate_used": rf["rate"],
        "rf_rate_source": rf["source"],
        "period_used": request.period,
        "tickers_dropped": dropped,
        "sector_exposure": sector_exposure,
    }


@router.post("/backtest")
async def backtest(request: OptimizeRequest):
    from services.backtest_service import compute_equity_curve
    prices, _ = await data_service.fetch_prices(request.tickers, request.period)
    rf = await rf_service.get_rf_rate()
    result = optimizer_service.run_optimization(prices, request, rf["rate"])
    weights = {w["ticker"]: w["weight"] for w in result["weights"]}
    return await compute_equity_curve(prices, weights, request.period)
```

**Update `backend/routers/market.py`** to add the validate endpoint:
```python
from fastapi import APIRouter
from services.rf_service import get_rf_rate
from services.data_service import validate_ticker

router = APIRouter()

@router.get("/rf-rate")
async def rf_rate_endpoint():
    return await get_rf_rate()

@router.get("/validate/{ticker}")
async def validate(ticker: str):
    return await validate_ticker(ticker.upper())
```

**Verification:** POST `http://localhost:8000/optimize` with:
```json
{"tickers":["NPN","SBK","AGL"],"rf_rate":0.105,"period":"3y","max_weight":0.4,"estimator":"ledoit_wolf","n_simulations":1000}
```
Response must include `weights`, `expected_return`, `volatility`, `sharpe_ratio`, `rf_rate_used`, `rf_rate_source`, `tickers_dropped`, `sector_exposure`.

---

## Step 9 — Backend: Backtest Service

**File: `backend/services/backtest_service.py`**
```python
import yfinance as yf
import pandas as pd
import asyncio


async def compute_equity_curve(prices: pd.DataFrame, weights: dict, period: str) -> dict:
    loop = asyncio.get_running_loop()
    alsi_raw = await loop.run_in_executor(
        None,
        lambda: yf.download("^J203.JO", period=period, auto_adjust=True, progress=False)
    )
    alsi = alsi_raw["Close"].dropna()

    w = pd.Series({f"{k}.JO": v for k, v in weights.items()})
    w = w.reindex(prices.columns).fillna(0)
    if w.sum() > 0:
        w = w / w.sum()

    portfolio_returns = prices.pct_change().dropna().dot(w)
    portfolio_curve = (1 + portfolio_returns).cumprod() * 100

    alsi_curve = (alsi / alsi.iloc[0]) * 100
    alsi_aligned = alsi_curve.reindex(portfolio_curve.index, method="ffill").fillna(100)

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

---

## Step 10 — Frontend: JSE Ticker Seed Data

This file is required for Stage 01 autocomplete. Without it, the input does nothing.

**File: `frontend/src/data/jse_tickers.json`**
```json
[
  {"ticker":"NPN","name":"Naspers Limited","sector":"Technology","cap_tier":"large"},
  {"ticker":"PRX","name":"Prosus NV","sector":"Technology","cap_tier":"large"},
  {"ticker":"BHP","name":"BHP Group Limited","sector":"Resources","cap_tier":"large"},
  {"ticker":"AGL","name":"Anglo American PLC","sector":"Resources","cap_tier":"large"},
  {"ticker":"SOL","name":"Sasol Limited","sector":"Resources","cap_tier":"large"},
  {"ticker":"SBK","name":"Standard Bank Group","sector":"Financials","cap_tier":"large"},
  {"ticker":"FSR","name":"Firstrand Limited","sector":"Financials","cap_tier":"large"},
  {"ticker":"NED","name":"Nedbank Group","sector":"Financials","cap_tier":"large"},
  {"ticker":"ABG","name":"Absa Group Limited","sector":"Financials","cap_tier":"large"},
  {"ticker":"DSY","name":"Discovery Limited","sector":"Financials","cap_tier":"large"},
  {"ticker":"SLM","name":"Sanlam Limited","sector":"Financials","cap_tier":"large"},
  {"ticker":"SHP","name":"Shoprite Holdings","sector":"Consumer Staples","cap_tier":"large"},
  {"ticker":"PIK","name":"Pick n Pay Stores","sector":"Consumer Staples","cap_tier":"large"},
  {"ticker":"WHL","name":"Woolworths Holdings","sector":"Consumer Staples","cap_tier":"large"},
  {"ticker":"MRP","name":"Mr Price Group","sector":"Consumer Discretionary","cap_tier":"large"},
  {"ticker":"TFG","name":"The Foschini Group","sector":"Consumer Discretionary","cap_tier":"large"},
  {"ticker":"TRU","name":"Truworths International","sector":"Consumer Discretionary","cap_tier":"large"},
  {"ticker":"MTN","name":"MTN Group Limited","sector":"Telecommunications","cap_tier":"large"},
  {"ticker":"VOD","name":"Vodacom Group Limited","sector":"Telecommunications","cap_tier":"large"},
  {"ticker":"GFI","name":"Gold Fields Limited","sector":"Resources","cap_tier":"large"},
  {"ticker":"HAR","name":"Harmony Gold Mining","sector":"Resources","cap_tier":"large"},
  {"ticker":"AMS","name":"Anglo American Platinum","sector":"Resources","cap_tier":"large"},
  {"ticker":"IMP","name":"Impala Platinum Holdings","sector":"Resources","cap_tier":"large"},
  {"ticker":"SSW","name":"Sibanye Stillwater","sector":"Resources","cap_tier":"large"},
  {"ticker":"SAP","name":"Sappi Limited","sector":"Resources","cap_tier":"mid"},
  {"ticker":"APN","name":"Aspen Pharmacare","sector":"Industrials","cap_tier":"large"},
  {"ticker":"BTI","name":"British American Tobacco","sector":"Industrials","cap_tier":"large"},
  {"ticker":"CPI","name":"Capitec Bank Holdings","sector":"Financials","cap_tier":"large"},
  {"ticker":"REM","name":"Remgro Limited","sector":"Financials","cap_tier":"large"},
  {"ticker":"OML","name":"Old Mutual Limited","sector":"Financials","cap_tier":"large"}
]
```

---

## Step 11 — Frontend: Hooks

**File: `frontend/src/hooks/useRfRate.js`**
```js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, DEFAULT_RF_PCT } from '../lib/constants';

export function useRfRate() {
  const [rfData, setRfData] = useState({
    rate: DEFAULT_RF_PCT / 100,
    rate_pct: DEFAULT_RF_PCT,
    date: null,
    source: 'loading',
    series_id: 'IRLTLT01ZAM156N',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/rf-rate`)
      .then(res => { setRfData(res.data); setLoading(false); })
      .catch(() => { setRfData(prev => ({ ...prev, source: 'fallback' })); setLoading(false); });
  }, []);

  return { rfData, loading };
}
```

**File: `frontend/src/hooks/useCountUp.js`**

Note: `setValue(0)` at the start of the effect ensures the animation re-runs from zero on every new `target` (second optimization run).

```js
import { useState, useEffect } from 'react';

export function useCountUp(target, duration = 800, decimals = 2) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals]);
  return value;
}
```

**File: `frontend/src/hooks/useOptimizer.js`**

Note: `AbortController` cancels any in-flight request when `optimize()` is called again. The `try/catch/finally` pattern prevents the UI from hanging in `status: 'running'` on network errors.

```js
import { useState, useRef } from 'react';
import { API_URL } from '../lib/constants';

export function useOptimizer() {
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const abortRef = useRef(null);

  const optimize = async (payload) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('running');
    setLogs([]);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/optimize/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
          } else if (event.type === 'error') {
            setLogs(prev => [...prev, { ...event, status: 'error' }]);
            setStatus('error');
          } else {
            setLogs(prev => [...prev, event]);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus('error');
      setLogs(prev => [...prev, { type: 'log', msg: err.message, status: 'error' }]);
    }
  };

  const cancel = () => {
    if (abortRef.current) abortRef.current.abort();
    setStatus('idle');
  };

  return { optimize, cancel, logs, result, status };
}
```

**File: `frontend/src/hooks/useTickerValidation.js`**
```js
import { useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/constants';

export function useTickerValidation(onResult) {
  const timerRef = useRef(null);

  const validate = useCallback((ticker) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/validate/${ticker}`);
        onResult(ticker, data.valid ? 'valid' : 'invalid', data.name);
      } catch {
        onResult(ticker, 'invalid', null);
      }
    }, 400);
  }, [onResult]);

  return { validate };
}
```

---

## Step 12 — Frontend: Shared Components

**File: `frontend/src/components/StageShell.jsx`**
```jsx
export function StageShell({ number, label, children, id }) {
  return (
    <section id={id} className="border-2 border-nb-border border-t-0 first:border-t-2">
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

**File: `frontend/src/components/TickerChip.jsx`**
```jsx
const STATUS_STYLES = {
  loading: 'border-nb-border text-nb-muted',
  valid:   'border-nb-border text-nb-text',
  invalid: 'border-nb-red text-nb-red',
};

export function TickerChip({ ticker, name, status = 'loading', onRemove }) {
  return (
    <div className={`flex items-center gap-1 border px-2 py-1 font-mono text-[10px] ${STATUS_STYLES[status]}`}>
      {status === 'loading' && (
        <span className="animate-spin inline-block w-2 h-2 border border-nb-muted border-t-transparent rounded-full" />
      )}
      {status === 'valid' && <span className="text-nb-emerald">✓</span>}
      {status === 'invalid' && <span className="text-nb-red">✕</span>}
      <span>{ticker}</span>
      {name && <span className="text-nb-dim hidden sm:inline">— {name}</span>}
      <button onClick={onRemove} className="ml-1 text-nb-dim hover:text-nb-red">×</button>
    </div>
  );
}
```

**File: `frontend/src/components/ColdStartBanner.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../lib/constants';

export function ColdStartBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 4000);
    axios.get(`${API_URL}/health`, { timeout: 4000 })
      .then(() => { clearTimeout(timer); setShow(false); })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="border border-nb-amber font-mono text-[9px] text-amber-500 tracking-wide px-3 py-2 mt-3"
        >
          BACKEND WARMING UP — first optimization may take 30–60s
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Step 13 — Frontend: Stage 01 — Input

**File: `frontend/src/components/TickerAutocomplete.jsx`**
```jsx
import { useState, useRef } from 'react';
import tickerList from '../data/jse_tickers.json';

export function TickerAutocomplete({ value, onChange, onSelect, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase();
    onChange(val);
    if (val.length < 1) { setSuggestions([]); return; }
    const matches = tickerList.filter(t =>
      t.ticker.startsWith(val) || t.name.toUpperCase().includes(val)
    ).slice(0, 6);
    setSuggestions(matches);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      const match = suggestions[0];
      onSelect(match?.ticker ?? value.trim(), match?.name ?? null);
      setSuggestions([]);
    }
    if (e.key === 'Escape') setSuggestions([]);
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        disabled={disabled}
        placeholder="TICKER OR COMPANY NAME"
        className="w-full bg-transparent border border-nb-border font-mono text-[10px]
                   tracking-widest px-3 py-2 text-nb-text placeholder:text-nb-dim
                   focus:border-nb-cyan outline-none disabled:opacity-30"
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 border-2 border-t-0 border-nb-border bg-nb-surface">
          {suggestions.map(s => (
            <button
              key={s.ticker}
              onMouseDown={() => { onSelect(s.ticker, s.name); setSuggestions([]); }}
              className="w-full text-left px-3 py-2 font-mono text-[10px] text-nb-muted hover:bg-nb-border hover:text-nb-text"
            >
              {s.ticker} — {s.name} — {s.cap_tier} cap
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**File: `frontend/src/components/StageInput.jsx`**
```jsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StageShell } from './StageShell';
import { TickerChip } from './TickerChip';
import { TickerAutocomplete } from './TickerAutocomplete';
import { useTickerValidation } from '../hooks/useTickerValidation';
import { MIN_TICKERS, MAX_TICKERS } from '../lib/constants';

export function StageInput({ tickers, setTickers, onOptimize, optimizeDisabled }) {
  const [input, setInput] = useState('');

  const handleValidationResult = useCallback((ticker, status, name) => {
    setTickers(prev => prev.map(t =>
      t.ticker === ticker ? { ...t, status, name: name ?? t.name } : t
    ));
  }, [setTickers]);

  const { validate } = useTickerValidation(handleValidationResult);

  const addTicker = (ticker, name = null) => {
    const upper = ticker.toUpperCase().trim();
    if (!upper || tickers.length >= MAX_TICKERS) return;
    if (tickers.find(t => t.ticker === upper)) return;
    setTickers(prev => [...prev, { ticker: upper, name, status: 'loading' }]);
    validate(upper);
    setInput('');
  };

  const removeTicker = (ticker) => setTickers(prev => prev.filter(t => t.ticker !== ticker));

  return (
    <StageShell number="01" label="INPUT">
      <div className="flex gap-2 mb-4">
        <TickerAutocomplete
          value={input}
          onChange={setInput}
          onSelect={addTicker}
          disabled={tickers.length >= MAX_TICKERS}
        />
        <button
          onClick={() => setTickers([])}
          disabled={tickers.length === 0}
          className="border border-nb-border font-mono text-[9px] tracking-widest px-3
                     text-nb-dim hover:border-nb-border-bright hover:text-nb-muted
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          CLEAR ALL
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
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
        </div>
      </AnimatePresence>

      {tickers.length > 0 && tickers.length < MIN_TICKERS && (
        <p className="font-mono text-[9px] text-nb-amber mt-2">
          Add {MIN_TICKERS - tickers.length} more ticker{MIN_TICKERS - tickers.length > 1 ? 's' : ''} to enable optimization
        </p>
      )}
      {tickers.length >= MAX_TICKERS && (
        <p className="font-mono text-[9px] text-nb-dim mt-2">Maximum {MAX_TICKERS} tickers reached</p>
      )}

      <motion.button
        onClick={onOptimize}
        disabled={optimizeDisabled}
        className="mt-4 w-full border-2 border-nb-cyan font-mono text-[10px] tracking-widest
                   py-3 text-nb-cyan hover:bg-nb-cyan hover:text-nb-bg transition-colors
                   disabled:border-nb-border disabled:text-nb-dim disabled:cursor-not-allowed"
        whileTap={!optimizeDisabled ? { scale: 0.98 } : {}}
      >
        OPTIMIZE PORTFOLIO
      </motion.button>
    </StageShell>
  );
}
```

---

## Step 14 — Frontend: Stage 02 — Parameters & Compute

**File: `frontend/src/components/StageCompute.jsx`**
```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StageShell } from './StageShell';
import { DEFAULT_MAX_WEIGHT, DEFAULT_PERIOD, DEFAULT_ESTIMATOR, DEFAULT_N_SIMS } from '../lib/constants';

export function StageCompute({ rfData, logs, status, onParamsChange }) {
  const [rfOverride, setRfOverride] = useState(null);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [maxWeight, setMaxWeight] = useState(DEFAULT_MAX_WEIGHT);
  const [estimator, setEstimator] = useState(DEFAULT_ESTIMATOR);
  const [nSims, setNSims] = useState(DEFAULT_N_SIMS);

  const effectiveRfPct = rfOverride ?? rfData.rate_pct;
  const params = { rf_rate: effectiveRfPct / 100, period, max_weight: maxWeight, estimator, n_simulations: nSims };

  return (
    <StageShell number="02" label="PARAMETERS">
      <div className="space-y-4">

        {/* Risk-free rate */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">RISK-FREE RATE</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="30"
              step="0.01"
              value={effectiveRfPct.toFixed(2)}
              onChange={e => setRfOverride(parseFloat(e.target.value))}
              className="w-16 bg-transparent text-right font-mono text-sm text-nb-text
                         border border-nb-border focus:border-nb-cyan outline-none px-1"
            />
            <span className="font-mono text-xs text-nb-muted">%</span>
            {rfData.source === 'FRED' && rfOverride === null && (
              <span className="font-mono text-[8px] text-nb-cyan border border-nb-cyan px-1 py-px">FRED LIVE</span>
            )}
            {rfData.source === 'fallback' && (
              <span className="font-mono text-[8px] text-amber-500 border border-amber-500 px-1 py-px">FALLBACK</span>
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
          <p className="font-mono text-[8px] text-nb-dim text-right">
            IRLTLT01ZAM156N · as of {rfData.date}
          </p>
        )}

        {/* Lookback period */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">LOOKBACK</span>
          <div className="flex gap-1">
            {['1y','2y','3y','5y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                      className={`font-mono text-[9px] px-2 py-1 border ${
                        period === p ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
                      }`}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Max weight */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono text-[9px] tracking-widest text-nb-muted">MAX WEIGHT</span>
            <motion.span className="font-mono text-sm text-nb-text"
              animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.12 }} key={maxWeight}>
              {(maxWeight * 100).toFixed(0)}%
            </motion.span>
          </div>
          <input type="range" min="5" max="100" step="5"
                 value={maxWeight * 100}
                 onChange={e => setMaxWeight(parseInt(e.target.value) / 100)}
                 className="w-full accent-nb-cyan" />
        </div>

        {/* Covariance estimator */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">COVARIANCE</span>
          <div className="flex gap-1">
            {[['ledoit_wolf','LEDOIT-WOLF'],['sample','SAMPLE']].map(([val, label]) => (
              <button key={val} onClick={() => setEstimator(val)}
                      className={`font-mono text-[9px] px-2 py-1 border ${
                        estimator === val ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
                      }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Monte Carlo sims */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">MC SIMULATIONS</span>
          <div className="flex gap-1">
            {[[1000,'1K'],[5000,'5K'],[10000,'10K']].map(([val, label]) => (
              <button key={val} onClick={() => setNSims(val)}
                      className={`font-mono text-[9px] px-2 py-1 border ${
                        nSims === val ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
                      }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Execution log */}
        {(status === 'running' || logs.length > 0) && (
          <div className="mt-4 pt-4 border-t border-nb-border space-y-[2px]">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 font-mono text-[10px] py-[3px]"
                >
                  <span className={log.status === 'ok' ? 'text-nb-emerald' : 'text-nb-red'}>
                    {log.status === 'ok' ? '✓' : '⚠'}
                  </span>
                  <span className="text-nb-muted">{log.msg ?? log.ticker}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {status === 'running' && (
              <span className="font-mono text-[10px] text-nb-dim cursor">▌</span>
            )}
          </div>
        )}
      </div>

      {/* App.jsx reads params from this hidden input at optimize-click time */}
      <input type="hidden" data-params={JSON.stringify(params)} id="compute-params" />
    </StageShell>
  );
}
```

---

## Step 15 — Frontend: Stage 03 — Output Components

**File: `frontend/src/components/MetricCard.jsx`**
```jsx
import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';

export function MetricCard({ label, value, suffix = '%', runId, isWarning = false }) {
  const animated = useCountUp(value, 900, 2);
  const color = isWarning ? 'text-nb-amber' : 'text-nb-emerald';

  return (
    <motion.div
      key={runId}
      className="border-2 border-nb-border p-3"
      animate={{ borderColor: [isWarning ? '#FFB340' : '#00C853', '#2C2C2E'] }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <div className="font-mono text-[8px] tracking-widest text-nb-dim">{label}</div>
      <div className={`font-mono text-lg mt-1 ${color}`}>
        {suffix === '%' ? '+' : ''}{animated.toFixed(2)}{suffix}
      </div>
    </motion.div>
  );
}
```

**File: `frontend/src/components/WeightBar.jsx`**
```jsx
import { motion } from 'framer-motion';

export function WeightBar({ ticker, weight, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-2"
    >
      <span className="font-mono text-[10px] text-nb-muted w-8 shrink-0">{ticker}</span>
      <div className="flex-1 bg-nb-surface h-[2px]">
        <motion.div
          className="bg-nb-emerald h-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(weight * 100).toFixed(1)}%` }}
          transition={{ delay: delay + 0.1, duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[10px] text-nb-text w-10 text-right">
        {(weight * 100).toFixed(1)}%
      </span>
    </motion.div>
  );
}
```

**File: `frontend/src/components/FrontierChart.jsx`**
```jsx
import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

function PortfolioTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { ret, vol, sharpe } = payload[0].payload;
  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2">
      <div className="flex gap-3"><span className="text-nb-dim">RET</span><span className="text-nb-emerald">{(ret*100).toFixed(2)}%</span></div>
      <div className="flex gap-3"><span className="text-nb-dim">VOL</span><span className="text-nb-text">{(vol*100).toFixed(2)}%</span></div>
      <div className="flex gap-3"><span className="text-nb-dim">SR </span><span className="text-nb-cyan">{sharpe?.toFixed(3)}</span></div>
    </div>
  );
}

export function FrontierChart({ result }) {
  const [visibleMcPoints, setVisibleMcPoints] = useState([]);

  useEffect(() => {
    if (!result) return;
    setVisibleMcPoints([]);
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

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 36 }}>
        <CartesianGrid stroke="#191919" strokeDasharray="none" />
        <XAxis dataKey="vol" tickFormatter={v => `${(v*100).toFixed(0)}%`}
               tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} />
        <YAxis dataKey="ret" tickFormatter={v => `${(v*100).toFixed(0)}%`}
               tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} />
        <Tooltip content={<PortfolioTooltip />} />
        <ReferenceLine x={result.optimal_point.vol} stroke="rgba(0,200,83,0.25)" strokeDasharray="4 4" strokeWidth={0.75} />
        <ReferenceLine y={result.optimal_point.ret} stroke="rgba(0,200,83,0.25)" strokeDasharray="4 4" strokeWidth={0.75} />
        <Scatter data={visibleMcPoints} fill="rgba(0,190,220,0.22)" />
        <Scatter data={result.frontier} line={{ stroke: '#00D4FF', strokeWidth: 1.5 }} fill="none" />
        <Scatter data={[result.optimal_point]} fill="#00C853" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
```

**File: `frontend/src/components/SectorBreakdown.jsx`**
```jsx
const SECTOR_COLORS = {
  'Financials':              'rgba(255,179,64,0.7)',
  'Resources':               'rgba(255,69,58,0.6)',
  'Industrials':             'rgba(147,112,219,0.6)',
  'Consumer Discretionary':  'rgba(0,180,180,0.6)',
  'Consumer Staples':        'rgba(60,179,113,0.6)',
  'Technology':              'rgba(30,144,255,0.6)',
  'Telecommunications':      'rgba(255,140,0,0.6)',
  'Other':                   'rgba(100,100,100,0.5)',
};

export function SectorBreakdown({ sectors }) {
  return (
    <div className="mt-4">
      <div className="font-mono text-[8px] tracking-widest text-nb-dim mb-2">SECTOR EXPOSURE</div>
      <div className="flex h-1 w-full overflow-hidden">
        {sectors.map(s => (
          <div key={s.sector}
            style={{ width: `${(s.weight * 100).toFixed(1)}%`, backgroundColor: SECTOR_COLORS[s.sector] ?? SECTOR_COLORS['Other'] }}
            title={`${s.sector}: ${(s.weight * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {sectors.map(s => (
          <span key={s.sector} className="font-mono text-[8px] text-nb-dim">
            {s.sector} {(s.weight * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
```

**File: `frontend/src/components/ExportButton.jsx`**
```jsx
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function downloadCSV(result) {
  const headers = ['Ticker','Weight (%)','Contribution to Return (%)','Contribution to Risk (%)'];
  const rows = result.weights.map(w => [
    w.ticker,
    (w.weight * 100).toFixed(2),
    (w.contribution_to_return * 100).toFixed(4),
    (w.contribution_to_risk * 100).toFixed(4),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'portfolio.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF() {
  const node = document.getElementById('stage-output');
  if (!node) return;
  const canvas = await html2canvas(node, { backgroundColor: '#0C0C0D', scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save('portfolio.pdf');
}

export function ExportButton({ result }) {
  return (
    <div className="flex gap-2 mt-4 pt-4 border-t-2 border-nb-border">
      <button onClick={() => downloadCSV(result)}
              className="flex-1 border-2 border-nb-border font-mono text-[9px] tracking-widest
                         py-2 text-nb-muted hover:border-nb-border-bright hover:text-nb-text transition-colors">
        DOWNLOAD CSV
      </button>
      <button onClick={downloadPDF}
              className="flex-1 border-2 border-nb-border font-mono text-[9px] tracking-widest
                         py-2 text-nb-muted hover:border-nb-border-bright hover:text-nb-text transition-colors">
        DOWNLOAD PDF
      </button>
    </div>
  );
}
```

**File: `frontend/src/components/StageOutput.jsx`**

Note: pass `id="stage-output"` to `StageShell` so `html2canvas` can target it for PDF export.

```jsx
import { motion } from 'framer-motion';
import { StageShell } from './StageShell';
import { FrontierChart } from './FrontierChart';
import { WeightBar } from './WeightBar';
import { MetricCard } from './MetricCard';
import { SectorBreakdown } from './SectorBreakdown';
import { ExportButton } from './ExportButton';

export function StageOutput({ result, runId }) {
  if (!result) return null;
  const lowSharpe = result.sharpe_ratio < 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <StageShell number="03" label="OUTPUT" id="stage-output">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <FrontierChart result={result} />
            {result.sector_exposure && <SectorBreakdown sectors={result.sector_exposure} />}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="EXP. RETURN" value={result.expected_return * 100} runId={runId} />
              <MetricCard label="VOLATILITY"  value={result.volatility * 100}      runId={runId} />
              <MetricCard label="SHARPE RATIO" value={result.sharpe_ratio} suffix="" runId={runId} isWarning={lowSharpe} />
            </div>

            <div className="space-y-2 pt-2">
              {result.weights.map((w, i) => (
                <WeightBar key={w.ticker} ticker={w.ticker} weight={w.weight} delay={i * 0.08} />
              ))}
            </div>

            {result.tickers_dropped?.length > 0 && (
              <p className="font-mono text-[9px] text-nb-amber">
                ⚠ Dropped: {result.tickers_dropped.join(', ')} — insufficient history
              </p>
            )}

            <ExportButton result={result} />
          </div>
        </div>
      </StageShell>
    </motion.div>
  );
}
```

---

## Step 16 — Frontend: App.jsx

**File: `frontend/src/App.jsx`**
```jsx
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { StageInput } from './components/StageInput';
import { StageCompute } from './components/StageCompute';
import { StageOutput } from './components/StageOutput';
import { ColdStartBanner } from './components/ColdStartBanner';
import { useOptimizer } from './hooks/useOptimizer';
import { useRfRate } from './hooks/useRfRate';

export default function App() {
  const [tickers, setTickers] = useState([]);
  const [runId, setRunId] = useState(0);
  const { rfData } = useRfRate();
  const { optimize, logs, result, status } = useOptimizer();

  const handleOptimize = async () => {
    const paramsEl = document.getElementById('compute-params');
    const params = paramsEl ? JSON.parse(paramsEl.dataset.params) : {};
    setRunId(id => id + 1);
    await optimize({
      tickers: tickers.map(t => t.ticker),
      ...params,
    });
  };

  const optimizeDisabled = (
    tickers.length < 3 ||
    tickers.some(t => t.status === 'invalid') ||
    status === 'running'
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-0">
      <div className="mb-6">
        <h1 className="font-mono text-[11px] tracking-[0.3em] text-nb-dim">JSE PORTFOLIO OPTIMIZER</h1>
        <p className="font-mono text-[9px] text-nb-dim mt-1">
          Maximum Sharpe Ratio via Efficient Frontier · Modern Portfolio Theory
        </p>
        <ColdStartBanner />
      </div>

      <StageInput
        tickers={tickers}
        setTickers={setTickers}
        onOptimize={handleOptimize}
        optimizeDisabled={optimizeDisabled}
      />

      <StageCompute rfData={rfData} logs={logs} status={status} onParamsChange={() => {}} />

      <AnimatePresence>
        {result && <StageOutput key={runId} result={result} runId={runId} />}
      </AnimatePresence>
    </main>
  );
}
```

---

## Step 17 — Error Handling Pass

After core functionality works, implement every error case:

| Scenario | Implementation |
|---|---|
| Invalid ticker | `TickerChip` shows `✕` with `border-nb-red`; tooltip "Not found on JSE" |
| Ticker insufficient history | `result.tickers_dropped` banner in Stage 03 (already in `StageOutput`) |
| `max_weight` too low | Backend 422; display red inline error below slider in `StageCompute` |
| FRED key missing | `source: "fallback"` → FALLBACK badge (already in `StageCompute`) |
| yfinance rate-limited | Backend 429 → SSE error event → "Data provider busy — retry in Xs" |
| Sharpe < 0.5 | `MetricCard isWarning={true}` → amber colour (already in `StageOutput`) |
| Backend timeout | 504 → `useOptimizer` catch → "Optimization timed out. Try fewer tickers." |
| Network down | Non-abort fetch error → "Cannot reach backend" + RETRY button in Stage 02 |

---

## Step 18 — Deployment

### Backend — Render
- Runtime: Python 3.11
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables (Render dashboard only — never commit):
  - `FRED_API_KEY`
  - `CORS_ORIGIN` = `https://your-app.vercel.app`
  - `FALLBACK_RF_RATE` = `0.1050`
  - `YFINANCE_TIMEOUT` = `20`

### Frontend — Vercel
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` = `https://your-backend.onrender.com`

### Order
1. Deploy backend to Render
2. Verify `GET /rf-rate` returns `"source": "FRED"` in Render startup logs
3. Set `VITE_API_URL` in Vercel to the Render URL
4. Deploy frontend to Vercel
5. Test end-to-end from the production Vercel URL

---

## Verification Checklist

Run through these checks after completing all steps:

1. Submit `NPN, SBK, AGL` → Stage 03 renders; weight bars sum visually to 100%; CSV downloads correctly
2. Submit ticker `XXXXXX` → red chip with `✕`, no optimization possible until removed
3. Remove `FRED_API_KEY` from `.env` → FALLBACK badge shown; optimization still completes
4. Run optimization twice → Stage 03 clears between runs; count-up metrics re-animate from 0
5. Submit 15 tickers with `max_weight` slider at 5% → 422 error with "max_weight too low" message
6. Start optimization → immediately start another → confirm only one stream runs (no race)
7. Open CSV → confirm "Contribution to Risk (%)" column has non-zero values
8. Check Render startup logs → confirm `source: "FRED"` printed on deploy
9. Verify FrontierChart shows MC cloud, frontier line, and emerald optimal diamond
10. PDF export → captures Stage 03 correctly in Chrome
