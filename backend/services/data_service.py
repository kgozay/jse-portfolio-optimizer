import yfinance as yf
import pandas as pd
import asyncio
import os

TIMEOUT = int(os.getenv("YFINANCE_TIMEOUT", "20"))


async def fetch_prices(tickers: list[str], period: str = "3y") -> tuple[pd.DataFrame, list[str]]:
    formatted = [f"{t}.JO" for t in tickers]
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: yf.download(formatted, period=period, auto_adjust=True,
                             progress=False, timeout=TIMEOUT)
    )
    prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
    min_rows = int(len(prices) * 0.95)
    clean = prices.dropna(thresh=min_rows, axis=1).dropna()
    dropped = [t for t in tickers if f"{t}.JO" not in clean.columns]

    if clean.shape[1] < 3:
        raise ValueError(
            f"Only {clean.shape[1]} ticker(s) have sufficient data after cleaning. "
            f"Need at least 3. Dropped: {dropped}"
        )
    return clean, dropped


async def fetch_single(ticker: str, period: str = "3y") -> pd.Series:
    formatted = f"{ticker}.JO"
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: yf.download(formatted, period=period, auto_adjust=True,
                             progress=False, timeout=TIMEOUT)
    )
    close = raw["Close"] if "Close" in raw.columns else raw.iloc[:, 0]
    if close.dropna().shape[0] < 50:
        raise ValueError(f"{ticker} has insufficient history (< 50 rows).")
    return close.dropna()


async def validate_ticker(ticker: str) -> dict:
    formatted = f"{ticker}.JO"
    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(None, lambda: yf.Ticker(formatted).fast_info)
        return {"valid": True, "ticker": ticker,
                "name": getattr(info, "company_name", ticker)}
    except Exception:
        return {"valid": False, "ticker": ticker}
