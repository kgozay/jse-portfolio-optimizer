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
