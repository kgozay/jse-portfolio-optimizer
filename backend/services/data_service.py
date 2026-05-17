import yfinance as yf
import pandas as pd
import asyncio
import os

TIMEOUT = int(os.getenv("YFINANCE_TIMEOUT", "20"))


def _fetch_ticker_history(formatted_ticker: str, period: str) -> pd.Series:
    """
    Fetch close prices for a single ticker using Ticker.history().
    More reliable than yf.download() on cloud servers where Yahoo Finance
    rate-limits bulk download requests.
    """
    ticker_obj = yf.Ticker(formatted_ticker)
    hist = ticker_obj.history(period=period, timeout=TIMEOUT)
    if hist.empty:
        raise ValueError(f"No data returned for {formatted_ticker}.")
    close = hist["Close"].dropna()
    if len(close) < 50:
        raise ValueError(
            f"{formatted_ticker.replace('.JO', '')} has insufficient history (< 50 rows)."
        )
    return close


async def fetch_prices(tickers: list[str], period: str = "3y") -> tuple[pd.DataFrame, list[str]]:
    loop = asyncio.get_running_loop()
    formatted = [f"{t}.JO" for t in tickers]

    # Fetch all tickers concurrently
    tasks = [
        loop.run_in_executor(None, _fetch_ticker_history, ft, period)
        for ft in formatted
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    prices_dict = {}
    dropped = []
    for ticker, ft, result in zip(tickers, formatted, results):
        if isinstance(result, Exception):
            dropped.append(ticker)
        else:
            prices_dict[ft] = result

    if len(prices_dict) < 3:
        raise ValueError(
            f"Only {len(prices_dict)} ticker(s) have sufficient data. "
            f"Need at least 3. Dropped: {dropped}"
        )

    clean = pd.DataFrame(prices_dict).dropna()
    return clean, dropped


async def fetch_single(ticker: str, period: str = "3y") -> pd.Series:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, _fetch_ticker_history, f"{ticker}.JO", period
    )


async def validate_ticker(ticker: str) -> dict:
    formatted = f"{ticker}.JO"
    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(None, lambda: yf.Ticker(formatted).fast_info)
        return {"valid": True, "ticker": ticker,
                "name": getattr(info, "company_name", ticker)}
    except Exception:
        return {"valid": False, "ticker": ticker}
