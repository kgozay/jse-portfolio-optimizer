import yfinance as yf
import pandas as pd
import asyncio
import os
import time
import random
import threading

TIMEOUT = int(os.getenv("YFINANCE_TIMEOUT", "20"))

_CACHE_TTL = 14400  # 4 hours
_price_cache: dict = {}  # (ticker, period) -> (series, fetched_at)
_cache_lock = threading.Lock()


def _get_cached(key):
    with _cache_lock:
        entry = _price_cache.get(key)
    if entry and (time.time() - entry[1]) < _CACHE_TTL:
        return entry[0]
    return None


def _set_cached(key, value):
    with _cache_lock:
        _price_cache[key] = (value, time.time())


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
            _set_cached(key, close)
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

    prices_dict: dict = {}
    dropped: list[str] = []
    sem = asyncio.Semaphore(3)

    async def fetch_one(ticker: str, ft: str) -> None:
        async with sem:
            try:
                series = await loop.run_in_executor(None, _fetch_ticker_history, ft, period)
                prices_dict[ft] = series
            except Exception:
                dropped.append(ticker)

    await asyncio.gather(*[fetch_one(t, ft) for t, ft in zip(tickers, formatted)])

    if len(prices_dict) < 3:
        raise ValueError(
            f"Only {len(prices_dict)} ticker(s) have sufficient data. "
            f"Need at least 3. Dropped: {dropped}"
        )

    clean = pd.DataFrame(prices_dict).ffill().bfill().dropna()
    if len(clean) < 50:
        raise ValueError(
            f"Insufficient overlapping historical data for the selected tickers. "
            f"Only {len(clean)} overlapping trading days found."
        )
    return clean, dropped


async def fetch_single(ticker: str, period: str = "3y") -> pd.Series:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, _fetch_ticker_history, f"{ticker}.JO", period
    )


JSE_TICKERS = {
    # Technology
    "NPN": "Naspers Limited",
    "PRX": "Prosus NV",
    # Resources
    "BHP": "BHP Group Limited",
    "AGL": "Anglo American PLC",
    "SOL": "Sasol Limited",
    "GFI": "Gold Fields Limited",
    "HAR": "Harmony Gold Mining",
    "AMS": "Anglo American Platinum",
    "IMP": "Impala Platinum Holdings",
    "SSW": "Sibanye Stillwater",
    "SAP": "Sappi Limited",
    "EXX": "Exxaro Resources",
    "KIO": "Kumba Iron Ore",
    "MNP": "Mondi PLC",
    # Financials
    "SBK": "Standard Bank Group",
    "FSR": "Firstrand Limited",
    "NED": "Nedbank Group",
    "ABG": "Absa Group Limited",
    "DSY": "Discovery Limited",
    "SLM": "Sanlam Limited",
    "CPI": "Capitec Bank Holdings",
    "REM": "Remgro Limited",
    "OML": "Old Mutual Limited",
    "SNT": "Santam Limited",
    # Consumer Staples
    "SHP": "Shoprite Holdings",
    "PIK": "Pick n Pay Stores",
    "WHL": "Woolworths Holdings",
    "CLS": "Clicks Group Limited",
    "AVI": "AVI Limited",
    "BID": "Bid Corporation Limited",
    "SPP": "The Spar Group",
    # Consumer Discretionary
    "MRP": "Mr Price Group",
    "TFG": "The Foschini Group",
    "TRU": "Truworths International",
    "PPH": "Pepkor Holdings",
    "ITU": "Italtile Limited",
    "CFR": "Compagnie Financiere Richemont SA",
    # Telecommunications
    "MTN": "MTN Group Limited",
    "VOD": "Vodacom Group Limited",
    "MCG": "MultiChoice Group",
    "TKG": "Telkom SA SOC",
    # Industrials
    "APN": "Aspen Pharmacare",
    "BTI": "British American Tobacco",
    "WBO": "Wilson Bayly Holmes-Ovcon",
    # Real Estate
    "GRT": "Growthpoint Properties",
    "RDF": "Redefine Properties",
    "SRE": "Sirius Real Estate",
}


async def validate_ticker(ticker: str) -> dict:
    ticker_clean = ticker.upper().strip().replace(".JO", "")
    if ticker_clean in JSE_TICKERS:
        return {"valid": True, "ticker": ticker_clean, "name": JSE_TICKERS[ticker_clean]}

    formatted = f"{ticker_clean}.JO"
    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(None, lambda: yf.Ticker(formatted).fast_info)
        return {"valid": True, "ticker": ticker_clean,
                "name": getattr(info, "company_name", ticker_clean)}
    except Exception:
        return {"valid": False, "ticker": ticker_clean}
