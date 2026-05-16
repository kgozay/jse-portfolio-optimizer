# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Full-stack web app for Modern Portfolio Theory (MPT) optimization of JSE-listed equities. Users input JSE tickers, the app fetches 3 years of price history via yfinance, and returns the maximum Sharpe Ratio portfolio using Efficient Frontier modeling. The UI is a dark neo-brutalist three-stage pipeline: **01 Input → 02 Parameters/Compute → 03 Output**.

The full implementation spec (component code, API shapes, animation specs, deployment steps) is in `JSE_Portfolio_Optimizer_Plan.md` in this directory.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Recharts, Framer Motion, Axios |
| Backend | FastAPI (Python 3.11), yfinance, PyPortfolioOpt, httpx |
| Risk-free rate | FRED API — series `IRLTLT01ZAM156N` (SA 10Y bond yield) |
| Streaming | Server-Sent Events (SSE) for live optimization log |
| Export | jsPDF + html2canvas |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Commands

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
npm run dev        # localhost:5173
npm run build
npm run preview
```

### Environment
Copy `.env.example` to `.env`:
- `FRED_API_KEY` — get free key at fred.stlouisfed.org/docs/api/api_key.html
- `VITE_API_URL` — `http://localhost:8000` for local dev

---

## Architecture

### Backend flow
Request → `routers/optimizer.py` → `services/data_service.py` (yfinance) → `services/optimizer_service.py` (PyPortfolioOpt) → SSE stream back to client.

The SSE router assembles the **complete response** (including `rf_rate_used`, `rf_rate_source`, `period_used`, `tickers_dropped`) by calling `rf_service` and `sector_service` around the optimizer. `optimizer_service.run_optimization()` returns only the mathematical results — it does not know about the request context.

Key distinction in `data_service.py`: `fetch_prices()` is a bulk batch fetch used by the JSON endpoint; `fetch_single()` is called per-ticker in the SSE stream so each fetch can emit a live log line as it completes. Both must exist.

### Frontend flow
`App.jsx` is the sole stateful orchestrator — it holds `tickers[]` and `runId`. All child stages are props-driven. `useOptimizer.js` owns the SSE connection: it sends the POST, reads the stream, and exposes `{ optimize, cancel, logs, result, status }`. Stage 03 is conditionally rendered from `result` with a `key={runId}` so all animations re-trigger on each new run.

### Data flow for risk-free rate
On backend startup, `lifespan()` pre-fetches the FRED rate into a 6-hour in-memory cache. `useRfRate.js` fetches `/rf-rate` on mount and pre-populates the Stage 02 input. The user can override the value; the override is sent in the POST body as `rf_rate`. The response always echoes back `rf_rate_used` and `rf_rate_source`.

---

## Key Invariants

- **`font-mono` on all financial figures** — never sans-serif for numbers
- **Colour semantics** — emerald = positive/optimal; cyan = CTAs/targets; amber = warnings; red = errors. Never decorative.
- **Border-radius max 4px** — enforced in `tailwind.config.js`
- **All errors inline within their stage** — no toast notifications
- **Pydantic v2 API** — use `@field_validator` and `Annotated[list[str], Field(min_length=...)]`; `@validator` and `min_items=` are v1 and silently do nothing in v2
- **`asyncio.get_running_loop()`** — not `get_event_loop()` (deprecated 3.10+, broken 3.12+)
- **Monte Carlo is vectorised** — use `np.random.dirichlet` batch + `np.einsum`, not a Python loop. Send max 1000 points to the frontend (downsampled server-side); full set used for statistics only.

---

## Common Pitfalls

- `SECTOR_MAP` in `sector_service.py` — no duplicate ticker keys; Python silently takes the last, giving wrong sector assignments
- After `fetch_prices` drops tickers with insufficient history, confirm `≥ 3` remain before calling the optimizer
- `max_weight` feasibility: if `max_weight < 1/n_tickers`, PyPortfolioOpt will fail — validated in schema but must be re-checked after tickers are dropped
- `CORS_ORIGIN` env var may be unset — filter `None` from the origins list before passing to FastAPI's CORSMiddleware; `allow_credentials` should be omitted (no cookies)
- `contribution_to_risk` (marginal risk contribution via `S @ w / portfolio_vol`) must be computed and included — it is a required column in the CSV export

---

## FRED API

Series `IRLTLT01ZAM156N` is the only reliable FRED series for the SA 10Y benchmark yield. FRED returns observations as strings and sometimes returns `"."` for the most recent unpublished month — the service fetches 3 observations and skips `"."` values. Fallback rate is `0.1050` (10.50%), configurable via `FALLBACK_RF_RATE` env var.

---

## Deployment

Deploy **backend first**: set `FRED_API_KEY`, `CORS_ORIGIN`, `FALLBACK_RF_RATE=0.1050`, `YFINANCE_TIMEOUT=20` in Render. Verify `/rf-rate` returns `source: "FRED"` in startup logs before deploying the frontend. Render free tier cold-starts after 15 min of inactivity — `ColdStartBanner` handles this in the UI.

Frontend on Vercel: set `VITE_API_URL` to the Render service URL.
