import yfinance as yf
import pandas as pd
import numpy as np
import asyncio


async def compute_equity_curve(prices: pd.DataFrame, weights: dict, period: str, rf_rate: float = 0.105, benchmark: str = "J203") -> dict:
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

    if benchmark == "EQUAL_WEIGHT":
        # Mean return of selected active tickers
        eq_returns = prices.pct_change().dropna().mean(axis=1)
        benchmark_aligned = (1 + eq_returns).cumprod() * 100
    else:
        symbol = "^J203.JO" if benchmark == "J203" else "^J200.JO"
        try:
            raw = await loop.run_in_executor(
                None,
                lambda: yf.download(symbol, period=period, auto_adjust=True, progress=False, group_by="ticker")
            )
            series = extract_close(raw)
            if series is not None and len(series) > 0:
                benchmark_curve = (series / series.iloc[0]) * 100
        except Exception:
            pass

        # Try EZA if index download fails
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

        # Fallback: daily compound return at 8% annualised
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
    
    # Calculate Max Drawdown
    cum_max = portfolio_curve.cummax()
    drawdown = (portfolio_curve - cum_max) / cum_max
    max_drawdown = float(drawdown.min() * 100)
    
    # Calculate Sortino Ratio (downside risk-adjusted return relative to risk-free rate)
    daily_rf = rf_rate / 252
    downside_diff = np.minimum(0, portfolio_returns - daily_rf)
    downside_deviation = float(np.sqrt(np.mean(downside_diff ** 2) * 252))
    
    # Calculate Portfolio Annual Return (CAGR)
    ann_return = float((1 + portfolio_returns).prod() ** (252 / len(portfolio_returns)) - 1)
    sortino_ratio = (ann_return - rf_rate) / downside_deviation if downside_deviation > 0 else 0.0
    
    # Calculate Portfolio Beta relative to the Benchmark
    benchmark_returns = benchmark_aligned.pct_change().dropna()
    aligned_df = pd.DataFrame({"port": portfolio_returns, "bench": benchmark_returns}).dropna()
    if len(aligned_df) > 1:
        cov_matrix = aligned_df.cov()
        cov_pb = cov_matrix.loc["port", "bench"]
        var_b = cov_matrix.loc["bench", "bench"]
        beta = float(cov_pb / var_b) if var_b > 1e-8 else 1.0
    else:
        beta = 1.0
        
    return {
        "dates": portfolio_curve.index.strftime("%Y-%m-%d").tolist(),
        "portfolio": portfolio_curve.round(2).tolist(),
        "benchmark": benchmark_aligned.round(2).tolist(),
        "total_return_pct": round(port_ret, 2),
        "benchmark_return_pct": round(bench_ret, 2),
        "alpha_pct": round(port_ret - bench_ret, 2),
        "max_drawdown_pct": round(max_drawdown, 2),
        "sortino_ratio": round(sortino_ratio, 2),
        "beta": round(beta, 2),
    }
