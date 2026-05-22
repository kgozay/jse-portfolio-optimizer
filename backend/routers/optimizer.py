import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import OptimizeRequest
from services import data_service, optimizer_service, rf_service, sector_service

router = APIRouter()


def sse(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


@router.post("/optimize/stream")
async def optimize_stream(request: OptimizeRequest):
    async def event_generator():
        rf = await rf_service.get_rf_rate()
        yield sse("log", {"msg": f"Rf: {rf['rate_pct']:.2f}% ({rf['source'].upper()})", "status": "ok"})

        prices_per_ticker: dict = {}
        for ticker in request.tickers:
            try:
                series = await data_service.fetch_single(ticker, request.period)
                prices_per_ticker[ticker] = series
                yield sse("fetch", {"ticker": f"{ticker}.JO", "rows": len(series), "status": "ok"})
            except Exception as e:
                yield sse("fetch", {"ticker": f"{ticker}.JO", "status": "error", "msg": str(e)})

        import pandas as pd
        
        # Build initial df and clean it using ffill, bfill, dropna
        prices_df = pd.DataFrame(prices_per_ticker).ffill().bfill().dropna()
        active_tickers = list(prices_df.columns)
        tickers_dropped = [t for t in request.tickers if t not in active_tickers]

        n_active = len(active_tickers)
        if n_active < 3:
            yield sse("error", {
                "msg": f"Only {n_active} asset(s) have sufficient data (Need at least 3). "
                       f"Dropped: {tickers_dropped}"
            })
            return

        if len(prices_df) < 50:
            yield sse("error", {
                "msg": f"Insufficient overlapping historical data (only {len(prices_df)} rows). "
                       f"Need at least 50 trading days."
            })
            return

        if request.max_weight < 1.0 / n_active:
            yield sse("error", {
                "msg": f"With {n_active} active assets, the maximum weight must be at least {100/n_active:.1f}% "
                       f"(currently set to {request.max_weight*100:.1f}%). "
                       f"Please increase Max Weight or add more valid assets."
            })
            return

        yield sse("log", {"msg": "Building covariance matrix...", "status": "ok"})

        try:
            result = optimizer_service.run_optimization(prices_df, request, rf["rate"])
        except Exception as e:
            yield sse("error", {"msg": str(e)})
            return

        sector_exposure = sector_service.compute_sector_exposure(
            {w["ticker"]: w["weight"] for w in result["weights"]}
        )

        yield sse("log", {"msg": f"Optimization complete ({result['duration_ms']}ms)", "status": "ok"})
        yield sse("done", {
            **result,
            "rf_rate_used": rf["rate"],
            "rf_rate_source": rf["source"],
            "period_used": request.period,
            "tickers_dropped": tickers_dropped,
            "sector_exposure": sector_exposure,
        })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/optimize")
async def optimize_json(request: OptimizeRequest):
    """Non-streaming endpoint — use for debugging before the SSE stream is wired up."""
    from fastapi import HTTPException
    rf = await rf_service.get_rf_rate()
    try:
        prices, dropped = await data_service.fetch_prices(request.tickers, request.period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    n_active = len(prices.columns)
    if request.max_weight < 1.0 / n_active:
        raise HTTPException(
            status_code=400,
            detail=f"With {n_active} active assets, the maximum weight must be at least {100/n_active:.1f}% "
                   f"(currently set to {request.max_weight*100:.1f}%). "
                   f"Please increase Max Weight or add more valid assets."
        )

    try:
        result = optimizer_service.run_optimization(prices, request, rf["rate"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    sector_exposure = sector_service.compute_sector_exposure(
        {w["ticker"]: w["weight"] for w in result["weights"]}
    )
    return {
        **result,
        "rf_rate_used": rf["rate"],
        "rf_rate_source": rf["source"],
        "period_used": request.period,
        "tickers_dropped": dropped,
        "sector_exposure": sector_exposure,
    }


@router.post("/backtest")
async def backtest(request: OptimizeRequest):
    from services.backtest_service import compute_equity_curve
    from fastapi import HTTPException
    try:
        prices, _ = await data_service.fetch_prices(request.tickers, request.period)
        rf = await rf_service.get_rf_rate()
        result = optimizer_service.run_optimization(prices, request, rf["rate"])
        weights = {w["ticker"]: w["weight"] for w in result["weights"]}
        return await compute_equity_curve(prices, weights, request.period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
