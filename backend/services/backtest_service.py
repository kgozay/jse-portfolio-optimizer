import yfinance as yf
import pandas as pd
import numpy as np
import asyncio
from scipy import stats


async def compute_equity_curve(prices: pd.DataFrame, weights: dict, period: str, rf_rate: float = 0.105) -> dict:
    loop = asyncio.get_running_loop()

    w = pd.Series({f"{k}.JO": v for k, v in weights.items()})
    w = w.reindex(prices.columns).fillna(0)
    if w.sum() > 0:
        w = w / w.sum()

    daily_returns = prices.pct_change().dropna()
    portfolio_returns = daily_returns.dot(w)
    portfolio_curve = (1 + portfolio_returns).cumprod() * 100

    benchmark_curve = None
    benchmark_returns = None

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

    # Try JSE All Share Index
    try:
        raw = await loop.run_in_executor(
            None,
            lambda: yf.download("^J203.JO", period=period, auto_adjust=True, progress=False, group_by="ticker")
        )
        series = extract_close(raw)
        if series is not None and len(series) > 0:
            benchmark_curve = (series / series.iloc[0]) * 100
            benchmark_returns = series.pct_change().dropna()
    except Exception:
        pass

    # Try EZA (iShares MSCI South Africa ETF) as fallback
    if benchmark_curve is None:
        try:
            raw = await loop.run_in_executor(
                None,
                lambda: yf.download("EZA", period=period, auto_adjust=True, progress=False, group_by="ticker")
            )
            series = extract_close(raw)
            if series is not None and len(series) > 0:
                benchmark_curve = (series / series.iloc[0]) * 100
                benchmark_returns = series.pct_change().dropna()
        except Exception:
            pass

    # Synthetic 8% annualised benchmark as last resort
    if benchmark_curve is None:
        n_days = len(portfolio_curve)
        daily_rate = (1 + 0.08) ** (1 / 252) - 1
        compounded = (1 + daily_rate) ** np.arange(n_days)
        benchmark_aligned = pd.Series(compounded * 100, index=portfolio_curve.index)
        benchmark_returns_aligned = pd.Series(daily_rate, index=portfolio_returns.index)
    else:
        # BUG-1 fix: use .ffill() instead of deprecated reindex(method='ffill')
        benchmark_aligned = benchmark_curve.reindex(portfolio_curve.index).ffill().fillna(100)
        if benchmark_returns is not None:
            benchmark_returns_aligned = benchmark_returns.reindex(portfolio_returns.index).ffill().fillna(0)
        else:
            benchmark_returns_aligned = benchmark_aligned.pct_change().fillna(0)

    # Jensen's Alpha and Beta via OLS regression on excess returns
    rf_daily = rf_rate / 252
    port_excess = portfolio_returns - rf_daily
    bench_excess = benchmark_returns_aligned.reindex(port_excess.index).fillna(0)
    common_idx = port_excess.index.intersection(bench_excess.index)

    if len(common_idx) >= 20:
        pe = port_excess.loc[common_idx].values
        be = bench_excess.loc[common_idx].values
        # Only regress if benchmark has meaningful variance (not a synthetic flat rate)
        if float(np.std(be)) > 1e-8:
            slope, intercept, r_value, _, _ = stats.linregress(be, pe)
            beta = round(float(slope), 4)
            alpha_pct = round(float(intercept) * 252 * 100, 2)
            r_squared = round(float(r_value ** 2), 4)
        else:
            beta = 1.0
            alpha_pct = round(float(np.mean(pe)) * 252 * 100, 2)
            r_squared = None
    else:
        beta = 1.0
        alpha_pct = round(
            (portfolio_curve.iloc[-1] - benchmark_aligned.iloc[-1]) / benchmark_aligned.iloc[-1] * 100, 2
        )
        r_squared = None

    # Downside risk metrics
    n_days = len(portfolio_returns)
    ann_return = float((portfolio_curve.iloc[-1] / 100) ** (252 / n_days) - 1) if n_days > 0 else 0.0
    downside_returns = portfolio_returns[portfolio_returns < 0]
    downside_vol = float(np.sqrt(252) * downside_returns.std()) if len(downside_returns) > 1 else 1e-6
    sortino = round((ann_return - rf_rate) / downside_vol, 4) if downside_vol > 1e-7 else 0.0

    # Max drawdown from equity curve
    cummax = portfolio_curve.cummax()
    drawdown_series = (portfolio_curve - cummax) / cummax * 100
    max_drawdown_pct = round(float(drawdown_series.min()), 2)

    # VaR and CVaR at 95% confidence (annualised, expressed as positive losses)
    p5 = float(np.percentile(portfolio_returns, 5))
    var_95_pct = round(-p5 * np.sqrt(252) * 100, 2)
    tail_returns = portfolio_returns[portfolio_returns <= p5]
    cvar_95_pct = round(-float(tail_returns.mean()) * np.sqrt(252) * 100, 2) if len(tail_returns) > 0 else var_95_pct

    # Outperformance = simple endpoint excess return (distinct from Jensen's alpha)
    outperformance_pct = round(
        (portfolio_curve.iloc[-1] - benchmark_aligned.iloc[-1]) / benchmark_aligned.iloc[-1] * 100, 2
    )

    return {
        "dates": portfolio_curve.index.strftime("%Y-%m-%d").tolist(),
        "portfolio": portfolio_curve.round(2).tolist(),
        "benchmark": benchmark_aligned.round(2).tolist(),
        "drawdown": drawdown_series.round(2).tolist(),
        "total_return_pct": round((portfolio_curve.iloc[-1] / 100 - 1) * 100, 2),
        "benchmark_return_pct": round((benchmark_aligned.iloc[-1] / 100 - 1) * 100, 2),
        "outperformance_pct": outperformance_pct,
        "alpha_pct": alpha_pct,
        "beta": beta,
        "r_squared": r_squared,
        "sortino_ratio": sortino,
        "max_drawdown_pct": max_drawdown_pct,
        "var_95_pct": var_95_pct,
        "cvar_95_pct": cvar_95_pct,
    }
