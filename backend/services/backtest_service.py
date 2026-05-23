import yfinance as yf
import pandas as pd
import numpy as np
import asyncio


async def compute_equity_curve(prices: pd.DataFrame, weights: dict, period: str) -> dict:
    loop = asyncio.get_running_loop()

    w = pd.Series({f"{k}.JO": v for k, v in weights.items()})
    w = w.reindex(prices.columns).fillna(0)
    if w.sum() > 0:
        w = w / w.sum()

    portfolio_returns = prices.pct_change().dropna().dot(w)
    portfolio_curve = (1 + portfolio_returns).cumprod() * 100

    benchmark_curve = None

    # Helper to extract Series from yf.download DataFrame
    def extract_close(df):
        if df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            close_col = [col for col in df.columns if col[0] == "Close"]
            if close_col:
                return df[close_col[0]].dropna()
        elif "Close" in df:
            return df["Close"].dropna()
        return None

    # Try ^J203.JO
    try:
        raw = await loop.run_in_executor(
            None,
            lambda: yf.download("^J203.JO", period=period, auto_adjust=True, progress=False, group_by="ticker")
        )
        series = extract_close(raw)
        if series is not None and len(series) > 0:
            benchmark_curve = (series / series.iloc[0]) * 100
    except Exception:
        pass

    # Try EZA if ^J203.JO fails
    if benchmark_curve is None:
        try:
            raw = await loop.run_in_executor(
                None,
                lambda: yf.download("EZA", period=period, auto_adjust=True, progress=False, group_by="ticker")
            )
            series = extract_close(raw)
            if series is not None and len(series) > 0:
                benchmark_curve = (series / series.iloc[0]) * 100
        except Exception:
            pass

    # Fallback: daily compound return at 8% annualized (assuming 252 trading days/year)
    if benchmark_curve is None:
        n_days = len(portfolio_curve)
        daily_rate = (1 + 0.08) ** (1 / 252) - 1
        compounded = (1 + daily_rate) ** np.arange(n_days)
        benchmark_aligned = pd.Series(compounded * 100, index=portfolio_curve.index)
    else:
        # Align benchmark to portfolio index
        benchmark_aligned = benchmark_curve.reindex(portfolio_curve.index, method="ffill").fillna(100)

    port_ret = (portfolio_curve.iloc[-1] / 100 - 1) * 100
    bench_ret = (benchmark_aligned.iloc[-1] / 100 - 1) * 100
    return {
        "dates": portfolio_curve.index.strftime("%Y-%m-%d").tolist(),
        "portfolio": portfolio_curve.round(2).tolist(),
        "benchmark": benchmark_aligned.round(2).tolist(),
        "total_return_pct": round(port_ret, 2),
        "benchmark_return_pct": round(bench_ret, 2),
        "alpha_pct": round(port_ret - bench_ret, 2),
    }
