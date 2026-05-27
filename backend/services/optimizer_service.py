import time
import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier, expected_returns, risk_models, EfficientSemivariance


def run_optimization(prices: pd.DataFrame, request, rf_rate: float) -> dict:
    start = time.time()
    mu = expected_returns.mean_historical_return(prices)
    returns = expected_returns.returns_from_prices(prices).dropna()

    # Calculate standard covariance matrix
    S = (risk_models.CovarianceShrinkage(prices).ledoit_wolf()
         if request.estimator == "ledoit_wolf"
         else risk_models.sample_cov(prices))

    # Calculate semicovariance matrix (downside covariance)
    semi_cov = risk_models.semicovariance(prices, benchmark=rf_rate / 252)

    # Optimization
    weights = {}
    if request.objective == "max_sortino":
        mu_min, mu_max = float(mu.min()), float(mu.max())
        best_sortino = -float('inf')
        best_weights = None
        
        if mu_max > rf_rate:
            for target in np.linspace(rf_rate + 0.002, mu_max - 0.002, 30):
                try:
                    es = EfficientSemivariance(mu, returns, weight_bounds=(0.0, request.max_weight))
                    es.efficient_return(target)
                    w_opt = es.clean_weights()
                    perf_es = es.portfolio_performance(risk_free_rate=rf_rate)
                    sortino = perf_es[2]
                    if sortino > best_sortino:
                        best_sortino = sortino
                        best_weights = w_opt
                except Exception:
                    continue
        
        if best_weights is None:
            try:
                es = EfficientSemivariance(mu, returns, weight_bounds=(0.0, request.max_weight))
                es.min_semivariance()
                weights = es.clean_weights()
            except Exception as e:
                raise ValueError(f"Downside risk optimization failed: {str(e)}")
        else:
            weights = best_weights
    elif request.objective == "min_volatility":
        ef = EfficientFrontier(mu, S, weight_bounds=(0.0, request.max_weight))
        try:
            ef.min_volatility()
            weights = ef.clean_weights()
        except Exception as e:
            raise ValueError(f"Min volatility optimization failed: {str(e)}")
    else:
        ef = EfficientFrontier(mu, S, weight_bounds=(0.0, request.max_weight))
        try:
            ef.max_sharpe(risk_free_rate=rf_rate)
            weights = ef.clean_weights()
        except ValueError as e:
            if "risk-free" in str(e).lower() or "risk_free" in str(e).lower() or all(mu < rf_rate):
                raise ValueError(
                    f"The risk-free rate ({rf_rate*100:.2f}%) is higher than the expected returns of all selected assets. "
                    "Optimization is mathematically impossible. Please lower the risk-free rate or choose different assets."
                )
            raise ValueError(f"Optimization solver error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Optimization solver error: {str(e)}")

    w_arr = np.array([weights.get(t, 0.0) for t in prices.columns])
    exp_ret = float(w_arr @ mu.values)
    
    # Standard Volatility
    S_arr = S.values if hasattr(S, "values") else np.array(S)
    port_vol = float(np.sqrt(w_arr @ S_arr @ w_arr))
    sharpe_ratio = (exp_ret - rf_rate) / port_vol if port_vol > 0 else 0.0

    # Downside risk and Sortino
    port_returns = returns.values @ w_arr
    daily_rf = rf_rate / 252
    downside_diff = np.minimum(0, port_returns - daily_rf)
    downside_risk = float(np.sqrt(np.mean(downside_diff ** 2) * 252))
    sortino_ratio = (exp_ret - rf_rate) / downside_risk if downside_risk > 0 else 0.0

    # Marginal risk contribution
    active_cov = semi_cov.values if request.objective == "max_sortino" else S_arr
    active_risk = downside_risk if request.objective == "max_sortino" else port_vol
    marginal = active_cov @ w_arr
    risk_contrib = (w_arr * marginal / active_risk) if active_risk > 0 else np.zeros_like(w_arr)
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

    mc = _monte_carlo_vectorised(mu, S_arr, returns, rf_rate, request.n_simulations, request.objective)
    frontier = _frontier_line(mu, S, returns, rf_rate, request.max_weight, request.objective)

    asset_returns = {t.replace(".JO", ""): float(v) for t, v in mu.items()}
    
    covariance = {}
    for t1 in S.columns:
        t1_clean = t1.replace(".JO", "")
        covariance[t1_clean] = {}
        for t2 in S.columns:
            t2_clean = t2.replace(".JO", "")
            covariance[t1_clean][t2_clean] = float(S.loc[t1, t2])

    semicovariance = {}
    for t1 in semi_cov.columns:
        t1_clean = t1.replace(".JO", "")
        semicovariance[t1_clean] = {}
        for t2 in semi_cov.columns:
            t2_clean = t2.replace(".JO", "")
            semicovariance[t1_clean][t2_clean] = float(semi_cov.loc[t1, t2])

    optimal_point_vol = downside_risk if request.objective == "max_sortino" else port_vol

    return {
        "weights": weight_list,
        "expected_return": round(exp_ret, 6),
        "volatility": round(port_vol, 6),
        "sharpe_ratio": round(sharpe_ratio, 6),
        "sortino_ratio": round(sortino_ratio, 6),
        "downside_risk": round(downside_risk, 6),
        "monte_carlo": mc,
        "frontier": frontier,
        "optimal_point": {"vol": round(optimal_point_vol, 6), "ret": round(exp_ret, 6)},
        "duration_ms": round((time.time() - start) * 1000),
        "weights_sum_check": round(sum(weights.values()), 6),
        "asset_returns": asset_returns,
        "covariance": covariance,
        "semicovariance": semicovariance,
        "objective": request.objective,
    }


def _monte_carlo_vectorised(mu, S_arr, returns_df, rf: float, n: int, objective: str) -> list[dict]:
    n_assets = len(mu)
    mu_arr = mu.values if hasattr(mu, "values") else np.array(mu)
    W = np.random.dirichlet(np.ones(n_assets), size=n)
    rets = W @ mu_arr
    
    # Calculate standard volatilities
    vols = np.sqrt(np.einsum("ij,jk,ik->i", W, S_arr, W))
    sharpes = np.where(vols > 0, (rets - rf) / vols, 0.0)
    
    # Calculate downside risk
    port_rets = W @ returns_df.values.T
    daily_rf = rf / 252
    downside_diff = np.minimum(0, port_rets - daily_rf)
    downside_vols = np.sqrt(np.mean(downside_diff**2, axis=1) * 252)
    sortinos = np.where(downside_vols > 0, (rets - rf) / downside_vols, 0.0)

    idx = np.random.choice(n, size=min(1000, n), replace=False)
    
    points = []
    for i in idx:
        pt = {
            "ret": round(float(rets[i]), 5),
            "volatility": round(float(vols[i]), 5),
            "downside_risk": round(float(downside_vols[i]), 5),
            "sharpe": round(float(sharpes[i]), 4),
            "sortino": round(float(sortinos[i]), 4),
        }
        pt["vol"] = pt["downside_risk"] if objective == "max_sortino" else pt["volatility"]
        points.append(pt)
        
    return points


def _frontier_line(mu, S, returns, rf: float, max_weight: float, objective: str, n_points: int = 40) -> list[dict]:
    mu_min, mu_max = float(mu.min()), float(mu.max())
    points = []
    S_arr = S.values if hasattr(S, "values") else np.array(S)
    
    for target in np.linspace(mu_min + 0.001, mu_max - 0.001, n_points):
        try:
            if objective == "max_sortino":
                es = EfficientSemivariance(mu, returns, weight_bounds=(0.0, max_weight))
                es.efficient_return(target)
                w = es.clean_weights()
                w_arr = np.array([w.get(t, 0.0) for t in returns.columns])
                perf = es.portfolio_performance(risk_free_rate=rf)
                vol = float(np.sqrt(w_arr @ S_arr @ w_arr))
                points.append({
                    "vol": round(perf[1], 5),
                    "ret": round(perf[0], 5),
                    "downside_risk": round(perf[1], 5),
                    "volatility": round(vol, 5)
                })
            else:
                ef = EfficientFrontier(mu, S, weight_bounds=(0.0, max_weight))
                ef.efficient_return(target)
                w = ef.clean_weights()
                w_arr = np.array([w.get(t, 0.0) for t in S.columns])
                perf = ef.portfolio_performance(risk_free_rate=rf, verbose=False)
                
                # Downside risk calculation
                port_returns = returns.values @ w_arr
                daily_rf = rf / 252
                downside_diff = np.minimum(0, port_returns - daily_rf)
                downside_risk = float(np.sqrt(np.mean(downside_diff ** 2) * 252))
                
                points.append({
                    "vol": round(perf[1], 5),
                    "ret": round(perf[0], 5),
                    "volatility": round(perf[1], 5),
                    "downside_risk": round(downside_risk, 5)
                })
        except Exception:
            continue
    return points
