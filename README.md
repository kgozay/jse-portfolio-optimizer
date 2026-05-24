# JSE Portfolio Optimizer

**Live app → [frontend-kgozays-projects.vercel.app](https://frontend-kgozays-projects.vercel.app)**

A full-stack web application that applies Modern Portfolio Theory (MPT) to JSE-listed equities. Enter any combination of JSE tickers, and the app fetches three years of adjusted closing prices, runs Efficient Frontier optimisation, and returns the maximum Sharpe Ratio portfolio — all streamed live to the browser.

---

## Features

- **Ticker search & autocomplete** — search by ticker or company name across all JSE listings
- **Live optimization log** — Server-Sent Events stream each fetch step in real time (Stage 02)
- **Efficient Frontier chart** — interactive scatter of Monte Carlo portfolios with the optimal point highlighted
- **Portfolio weights** — animated horizontal bars per holding with sector colour coding
- **Sector exposure** — stacked breakdown of the final portfolio's JSE sector allocation
- **Backtested equity curve** — simulated portfolio performance vs ALSI benchmark
- **Sensitivity table** — Sharpe Ratio across a return/volatility grid around the optimal point
- **Live risk-free rate** — SA 10Y government bond yield fetched from FRED on every page load, user-editable
- **PDF & CSV export** — one-click client-side report generation
- **Cold-start banner** — amber warning if the Render backend is warming up from a free-tier spin-down

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (dark neo-brutalist, max border-radius 4px) |
| Charts | Recharts |
| Animations | Framer Motion |
| HTTP client | Axios |
| Backend | FastAPI (Python 3.11) |
| Price data | yfinance (JSE `.JO` suffix, 3Y daily adjusted close) |
| Optimiser | PyPortfolioOpt — Ledoit-Wolf covariance, Sharpe max |
| Risk-free rate | FRED API — series `IRLTLT01ZAM156N` (SA 10Y bond yield) |
| Streaming | Server-Sent Events (SSE) |
| Export | jsPDF + html2canvas |
| Deploy | Vercel (frontend) + Render (backend) |

---

## How It Works

The UI is a top-down three-stage pipeline:

1. **Stage 01 — Input**: Add 3–15 JSE tickers using the autocomplete search. Each chip shows the company name; invalid tickers are flagged red via a live `/validate` call.
2. **Stage 02 — Parameters & Compute**: Set the optimisation window (1–5 years), max single-stock weight, Monte Carlo simulation count, and risk-free rate. Hit **OPTIMIZE** to start the SSE stream. Log lines animate in as each ticker's price history is fetched and validated.
3. **Stage 03 — Output**: Results render with spring animations — Efficient Frontier chart, weight bars, sector breakdown, equity curve, and sensitivity table. Compare mode lets you run a second optimisation side by side.

### Backend flow

```
POST /optimize/stream (SSE)
  → data_service.py      — fetch & clean yfinance price history
  → rf_service.py        — live SA 10Y rate from FRED (6h cache, 10.50% fallback)
  → optimizer_service.py — PyPortfolioOpt Sharpe max + vectorised Monte Carlo
  → sector_service.py    — sector exposure from static JSE sector map
  → SSE stream           — log lines + final JSON result back to client
```

### Monte Carlo

Simulations are vectorised using `np.random.dirichlet` batch draws and `np.einsum` — no Python loops. The backend computes up to 10 000 portfolios for statistics but downsamples to 1 000 points before sending to the frontend to keep SVG rendering fast.

---

## Local Development

### Prerequisites

- Python 3.11
- Node.js 18+
- Free [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Environment variables

Copy `.env.example` to `.env` in the repo root and fill in your values:

```env
# Backend
FRED_API_KEY=your_32_char_fred_key_here
FALLBACK_RF_RATE=0.1050
CORS_ORIGIN=http://localhost:5173
YFINANCE_TIMEOUT=20

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [frontend-kgozays-projects.vercel.app](https://frontend-kgozays-projects.vercel.app) |
| Backend | Render (free tier) | [jse-portfolio-optimizer.onrender.com](https://jse-portfolio-optimizer.onrender.com) |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full environment variable reference, redeploy instructions, and known behaviours (cold starts, Yahoo Finance rate limiting, FRED fallback).

### Key deployment notes

- **Backend first** — set `FRED_API_KEY`, `CORS_ORIGIN`, `FALLBACK_RF_RATE`, and `YFINANCE_TIMEOUT` in Render before deploying the frontend.
- **Python version** — `backend/runtime.txt` pins Python to `3.11.9`; Render's default (3.14) breaks numpy/scipy wheel installs.
- **Cold starts** — Render free tier spins down after 15 min of inactivity. The `ColdStartBanner` component shows an amber warning if `/health` doesn't respond within 4 seconds.
- **Yahoo Finance rate limiting** — `data_service.py` includes retry/backoff (2×), a 4-hour in-process TTL cache, and 0.5 s inter-request delays to work around Render's cloud IP flagging.

---

## Project Structure

```
jse-portfolio-optimizer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StageInput.jsx          # Stage 01 — ticker entry + autocomplete
│   │   │   ├── StageCompute.jsx        # Stage 02 — parameters + live log
│   │   │   ├── StageOutput.jsx         # Stage 03 — frontier chart + weights
│   │   │   ├── FrontierChart.jsx       # Recharts scatter + frontier + optimal point
│   │   │   ├── WeightBar.jsx           # Animated weight bars
│   │   │   ├── MetricCard.jsx          # Return / Vol / Sharpe animated cards
│   │   │   ├── SectorBreakdown.jsx     # Stacked sector exposure bar
│   │   │   ├── EquityCurve.jsx         # Backtested portfolio vs ALSI
│   │   │   ├── SensitivityTable.jsx    # Sharpe across return/vol grid
│   │   │   ├── ComparePanel.jsx        # Side-by-side portfolio comparison
│   │   │   ├── ColdStartBanner.jsx     # Backend warm-up notice
│   │   │   └── ExportButton.jsx        # PDF + CSV export
│   │   ├── hooks/
│   │   │   ├── useOptimizer.js         # POST + SSE consumer + state machine
│   │   │   ├── useRfRate.js            # Fetches live Rf from /rf-rate
│   │   │   ├── useTickerValidation.js  # Debounced /validate call
│   │   │   └── useCountUp.js           # Animated number count-up
│   │   ├── data/
│   │   │   ├── jse_tickers.json        # JSE listings: ticker, name, sector, cap tier
│   │   │   └── sector_map.json         # Ticker → JSE sector mapping
│   │   └── lib/
│   │       └── constants.js            # Palette tokens, default params
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── main.py                         # FastAPI app, CORS, lifespan startup
│   ├── routers/
│   │   ├── optimizer.py                # /optimize/stream (SSE), /optimize (JSON)
│   │   ├── market.py                   # /rf-rate, /validate/{ticker}, /search
│   │   └── health.py                   # /health
│   ├── services/
│   │   ├── data_service.py             # yfinance fetch, clean, validate
│   │   ├── optimizer_service.py        # PyPortfolioOpt + Monte Carlo
│   │   ├── rf_service.py               # FRED API with fallback chain
│   │   ├── backtest_service.py         # Equity curve vs ALSI
│   │   └── sector_service.py           # Sector exposure from static map
│   ├── models/schemas.py               # Pydantic v2 request/response models
│   ├── requirements.txt
│   └── runtime.txt                     # Pins Python 3.11.9 for Render
│
├── .env.example
├── CLAUDE.md
├── DEPLOYMENT.md
└── README.md
```

---

## Design System

- **Dark neo-brutalist** — monochrome base, hard borders, no rounded corners (max 4px)
- **Colour semantics** — emerald = positive/optimal; cyan = CTAs; amber = warnings; red = errors. Never decorative.
- **`font-mono` on all financial figures** — returns, weights, Sharpe, volatility
- **All errors inline** — no toast notifications; error states render within their stage

---

## API Reference

The FastAPI backend serves auto-generated docs at `/docs` (Swagger) and `/redoc`.

| Endpoint | Method | Description |
|---|---|---|
| `/optimize/stream` | POST | SSE stream — live log + final result |
| `/optimize` | POST | JSON endpoint — blocking optimisation |
| `/rf-rate` | GET | Current SA 10Y bond yield from FRED |
| `/validate/{ticker}` | GET | Check if a ticker has sufficient price history |
| `/search` | GET | Autocomplete search over JSE ticker list |
| `/health` | GET | Liveness check (used by ColdStartBanner) |

---

## License

MIT
