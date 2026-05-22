# JSE Portfolio Optimizer — Deployment Context

Last updated: 2026-05-17

---

## Live URLs

| Service | URL | Platform |
|---|---|---|
| Frontend | https://frontend-kgozays-projects.vercel.app | Vercel |
| Backend | https://jse-portfolio-optimizer.onrender.com | Render (free tier) |
| GitHub repo | https://github.com/kgozay/jse-portfolio-optimizer | GitHub |

---

## Architecture Summary

Full-stack MPT portfolio optimizer for JSE equities.

- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts + Framer Motion, deployed to Vercel
- **Backend**: FastAPI (Python 3.11) + yfinance + PyPortfolioOpt, deployed to Render
- **Risk-free rate**: Live SA 10Y bond yield from FRED API (series `IRLTLT01ZAM156N`)
- **Streaming**: Server-Sent Events (SSE) for live optimization log in Stage 02

---

## Environment Variables

### Render (backend)
| Variable | Value | Notes |
|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | Required — Render defaults to 3.14 which breaks numpy/scipy |
| `CORS_ORIGIN` | `https://frontend-kgozays-projects.vercel.app` | Must match Vercel URL exactly |
| `FALLBACK_RF_RATE` | `0.1050` | Used if FRED API is unreachable |
| `YFINANCE_TIMEOUT` | `20` | Seconds before yfinance fetch times out |
| `FRED_API_KEY` | *(your key)* | Get free at fred.stlouisfed.org/docs/api/api_key.html — IRLTLT01ZAM156N series |

### Vercel (frontend)
| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://jse-portfolio-optimizer.onrender.com` | Set and active |

---

## Known Behaviours

- **Cold starts**: Render free tier spins down after 15 min of inactivity. First request can take 30–60s. The `ColdStartBanner` component shows an amber warning if `/health` doesn't respond within 4s.
- **FRED badge**: Shows **FRED LIVE** (cyan) if `FRED_API_KEY` is set and the API responds. Shows **FALLBACK** (amber) if the key is missing or FRED is unreachable — optimization still works at 10.50%.
- **Sharpe < 0.5**: Sharpe metric card renders in amber as a warning.
- **Monte Carlo rendering**: Backend computes N simulations (1K–10K) but only sends 1000 points to the frontend to avoid SVG performance issues.
- **Yahoo Finance rate limiting**: Render's cloud IP range is flagged by Yahoo Finance's bot-detection. `data_service.py` handles this with:
  - Retry with backoff: retries up to 2x on "Too Many Requests" (waits 4s then 10s + jitter)
  - 4-hour in-process TTL cache: repeated runs within a Render instance never re-hit Yahoo
  - 0.5s inter-request delay in `fetch_prices` to avoid burst detection
  - If first run of a cold-started instance still rate-limits, wait ~30s and retry — cache makes all subsequent runs instant

---

## Repo Structure

```
jse-portfolio-optimizer/
├── frontend/               # Vercel deployment
│   ├── src/
│   │   ├── components/     # StageInput, StageCompute, StageOutput, etc.
│   │   ├── hooks/          # useOptimizer, useRfRate, useCountUp, useTickerValidation
│   │   ├── data/           # jse_tickers.json (30 seed tickers)
│   │   └── lib/            # constants.js
│   └── .vercel/            # Vercel project link (projectId: prj_l2YHPRbVBgcavxDZOijk7gV6EiKi)
├── backend/                # Render deployment
│   ├── main.py             # FastAPI app, CORS, lifespan startup
│   ├── routers/            # optimizer.py, market.py, health.py
│   ├── services/           # rf_service, data_service, optimizer_service, etc.
│   ├── models/schemas.py   # Pydantic v2 request/response models
│   └── runtime.txt         # Pins Python to 3.11.9 for Render
├── CLAUDE.md               # Claude Code guidance
├── IMPLEMENTATION_PLAN.md  # Full step-by-step build plan with all code
└── DEPLOYMENT.md           # This file
```

---

## Deployment History

| Date | Event |
|---|---|
| 2026-05-17 | Initial commit pushed to GitHub (`kgozay/jse-portfolio-optimizer`) |
| 2026-05-17 | Frontend deployed to Vercel (project: `frontend`, org: `kgozays-projects`) |
| 2026-05-17 | Render build failed — Python 3.14 default, no numpy/scipy wheels |
| 2026-05-17 | Fixed: added `backend/runtime.txt` with `3.11.9` + `PYTHON_VERSION` env var |
| 2026-05-17 | Backend deployed successfully to Render |
| 2026-05-17 | `VITE_API_URL` set in Vercel, frontend redeployed — full stack live |
| 2026-05-17 | Yahoo Finance rate limiting — all ticker fetches failing with "Too Many Requests" |
| 2026-05-17 | Fix: rewrote `data_service.py` with retry/backoff + 4h TTL cache + 0.5s inter-request delay |

---

## Redeploy Instructions

### Frontend (after any code change)
```bash
cd frontend
npx vercel --prod
```

### Backend (auto-deploys from GitHub)
Any push to `main` triggers a Render redeploy automatically.

### To update an env var in Vercel
```bash
cd frontend
npx vercel env rm VITE_API_URL production   # remove old
npx vercel env add VITE_API_URL production  # add new (prompts for value)
npx vercel --prod                           # redeploy to pick it up
```

---

## Things Still To Do / Test

- [ ] Add `FRED_API_KEY` to Render env vars — without it the risk-free rate uses fallback
- [ ] Test full optimization flow: add 3+ tickers → OPTIMIZE → verify Stage 03 renders
- [ ] Verify SSE log streams correctly (Stage 02 log lines animate in as each ticker fetches)
- [ ] Test CSV export — check "Contribution to Risk (%)" column has non-zero values
- [ ] Test PDF export in Chrome
- [ ] Test cold start UX — wait 15+ min then trigger an optimization
- [ ] Test invalid ticker (e.g. `XXXXXX`) — chip should go red
- [ ] Test FRED LIVE badge — only shows when `FRED_API_KEY` is set and source is "FRED"
- [ ] Consider adding a custom domain in Vercel (currently on `frontend-kgozays-projects.vercel.app`)
