import yfinance as yf
import pandas as pd
import asyncio
import os
import time
import random

TIMEOUT = int(os.getenv("YFINANCE_TIMEOUT", "20"))

_CACHE_TTL = 14400  # 4 hours
_price_cache: dict = {}  # (ticker, period) -> (series, fetched_at)


def _get_cached(key):
    entry = _price_cache.get(key)
    if entry and (time.time() - entry[1]) < _CACHE_TTL:
        return entry[0]
    return None


def _fetch_ticker_history(formatted_ticker: str, period: str) -> pd.Series:
    key = (formatted_ticker, period)
    cached = _get_cached(key)
    if cached is not None:
        return cached

    delays = [4, 10]
    last_exc: Exception = ValueError(f"No data returned for {formatted_ticker}.")

    for i, delay in enumerate(delays + [None]):
        try:
            ticker_obj = yf.Ticker(formatted_ticker)
            hist = ticker_obj.history(period=period, timeout=TIMEOUT)
            if hist.empty:
                raise ValueError(f"No data returned for {formatted_ticker}.")
            close = hist["Close"].dropna()
            if len(close) < 50:
                raise ValueError(
                    f"{formatted_ticker.replace('.JO', '')} has insufficient history (< 50 rows)."
                )
            _price_cache[key] = (close, time.time())
            return close
        except Exception as e:
            msg = str(e).lower()
            last_exc = e
            if ("too many requests" in msg or "rate limit" in msg or "429" in msg) and delay is not None:
                time.sleep(delay + random.uniform(0, 2))
                continue
            raise

    raise last_exc


async def fetch_prices(tickers: list[str], period: str = "3y") -> tuple[pd.DataFrame, list[str]]:
    loop = asyncio.get_running_loop()
    formatted = [f"{t}.JO" for t in tickers]

    prices_dict = {}
    dropped = []
    for ticker, ft in zip(tickers, formatted):
        try:
            series = await loop.run_in_executor(None, _fetch_ticker_history, ft, period)
            prices_dict[ft] = series
        except Exception:
            dropped.append(ticker)
        await asyncio.sleep(0.5)

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
