# JSE Portfolio Optimizer

**Live app → [frontend-kgozays-projects.vercel.app](https://frontend-kgozays-projects.vercel.app)**

Modern Portfolio Theory optimisation for JSE-listed equities. Enter tickers, fetch 3 years of price history, and get the maximum Sharpe Ratio portfolio via Efficient Frontier modelling.

---

## Stack

- **Frontend** — React 18, Vite, Tailwind CSS, Recharts, Framer Motion
- **Backend** — FastAPI (Python 3.11), yfinance, PyPortfolioOpt
- **Risk-free rate** — FRED API (SA 10Y bond yield, series `IRLTLT01ZAM156N`)
- **Streaming** — Server-Sent Events for live optimisation log
- **Deploy** — Vercel (frontend) + Render (backend)

---

## Local Development

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

Copy `.env.example` to `.env` and fill in `FRED_API_KEY` and `VITE_API_URL`.

---

## License

MIT
