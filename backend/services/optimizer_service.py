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

    ef = EfficientFrontier(mu, S, weight_bounds=(0.0, request.max_weight))
    
    try:
        ef.max_sharpe(risk_free_rate=rf_rate)
    except ValueError as e:
        if "risk-free" in str(e).lower() or "risk_free" in str(e).lower() or all(mu < rf_rate):
            raise ValueError(
                f"The risk-free rate ({rf_rate*100:.2f}%) is higher than the expected returns of all selected assets. "
                "Optimization is mathematically impossible. Please lower the risk-free rate or choose different assets."
            )
        raise ValueError(f"Optimization solver error: {str(e)}")
        
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
    frontier = _frontier_line(mu, S, rf_rate, request.max_weight)

    # Clean tickers for asset returns and covariance
    asset_returns = {t.replace(".JO", ""): float(v) for t, v in mu.items()}
    covariance = {}
    for t1 in S.columns:
        t1_clean = t1.replace(".JO", "")
        covariance[t1_clean] = {}
        for t2 in S.columns:
            t2_clean = t2.replace(".JO", "")
            covariance[t1_clean][t2_clean] = float(S.loc[t1, t2])

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
        "asset_returns": asset_returns,
        "covariance": covariance,
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


def _frontier_line(mu, S, rf: float, max_weight: float, n_points: int = 40) -> list[dict]:
    mu_min, mu_max = float(mu.min()), float(mu.max())
    points = []
    for target in np.linspace(mu_min, mu_max, n_points):
        try:
            ef = EfficientFrontier(mu, S, weight_bounds=(0.0, max_weight))
            ef.efficient_return(target)
            perf = ef.portfolio_performance(risk_free_rate=rf, verbose=False)
            points.append({"vol": round(perf[1], 5), "ret": round(perf[0], 5)})
        except Exception:
            continue
    return points
