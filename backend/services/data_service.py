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


def _clean_price_series(series: pd.Series) -> pd.Series:
    cleaned = series.copy()
    n = len(series)
    if n < 3:
        return cleaned
    for i in range(1, n - 1):
        prev_val = cleaned.iloc[i - 1]
        curr_val = cleaned.iloc[i]
        next_val = cleaned.iloc[i + 1]
        if prev_val <= 0 or next_val <= 0 or curr_val <= 0:
            continue
        ratio_prev = curr_val / prev_val
        ratio_next = curr_val / next_val
        is_drop = (ratio_prev < 0.15) and (ratio_next < 0.15)
        is_spike = (ratio_prev > 7.0) and (ratio_next > 7.0)
        if is_drop or is_spike:
            cleaned.iloc[i] = (prev_val + next_val) / 2.0
    return cleaned


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
            close = _clean_price_series(close)
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
    # Original 39
    "NPN": "Naspers Limited",
    "PRX": "Prosus NV",
    "BHP": "BHP Group Limited",
    "AGL": "Anglo American PLC",
    "SOL": "Sasol Limited",
    "SBK": "Standard Bank Group",
    "FSR": "Firstrand Limited",
    "NED": "Nedbank Group",
    "ABG": "Absa Group Limited",
    "DSY": "Discovery Limited",
    "SLM": "Sanlam Limited",
    "SHP": "Shoprite Holdings",
    "PIK": "Pick n Pay Stores",
    "WHL": "Woolworths Holdings",
    "MRP": "Mr Price Group",
    "TFG": "The Foschini Group",
    "TRU": "Truworths International",
    "MTN": "MTN Group Limited",
    "VOD": "Vodacom Group Limited",
    "GFI": "Gold Fields Limited",
    "HAR": "Harmony Gold Mining",
    "AMS": "Anglo American Platinum",
    "IMP": "Impala Platinum Holdings",
    "SSW": "Sibanye Stillwater",
    "SAP": "Sappi Limited",
    "APN": "Aspen Pharmacare",
    "BTI": "British American Tobacco",
    "CPI": "Capitec Bank Holdings",
    "REM": "Remgro Limited",
    "OML": "Old Mutual Limited",
    "OMU": "Old Mutual Limited",
    "BID": "Bid Corporation",
    "BVT": "Bidvest Group",
    "CLS": "Clicks Group",
    "EXX": "Exxaro Resources",
    "KIO": "Kumba Iron Ore",
    "GRT": "Growthpoint Properties",
    "OUT": "OUTsurance Group",
    "PPH": "Pepkor Holdings",

    # Expanded 50 (88 unique total)
    "CFR": "Compagnie Financiere Richemont SA",
    "ANG": "AngloGold Ashanti plc",
    "GLN": "Glencore plc",
    "MNP": "Mondi plc",
    "INP": "Investec plc",
    "INL": "Investec Limited",
    "ARI": "African Rainbow Minerals",
    "MCF": "Momentum Metropolitan Holdings",
    "RDF": "Redefine Properties Limited",
    "NEPI": "NEPI Rockcastle NV",
    "RES": "Resilient REIT Limited",
    "HYP": "Hyprop Investments Limited",
    "VKE": "Vukile Property Fund",
    "ATT": "Attacq Limited",
    "EQU": "Equites Property Fund",
    "NTC": "Netcare Limited",
    "LHS": "Life Healthcare Group",
    "MCG": "MultiChoice Group",
    "TKG": "Telkom SA SOC Limited",
    "BLU": "Blue Label Telecoms",
    "AFT": "Afrimat Limited",
    "PPC": "PPC Limited",
    "RLO": "Barloworld Limited",
    "KAP": "KAP Industrial Holdings",
    "AVI": "AVI Limited",
    "TBS": "Tiger Brands Limited",
    "DGC": "DRDGOLD Limited",
    "PAN": "Pan African Resources",
    "THA": "Tharisa plc",
    "MER": "Merafe Resources",
    "SPG": "Super Group Limited",
    "SUI": "Sun International Limited",
    "TSG": "Tsogo Sun Gaming Limited",
    "CLH": "City Lodge Hotels Limited",
    "SPAR": "The Spar Group Limited",
    "RCL": "RCL Foods Limited",
    "RFG": "RFG Foods Holdings",
    "OCE": "Oceana Group Limited",
    "MOT": "Motus Holdings Limited",
    "PMG": "Purple Group Limited",
    "PSG": "PSG Financial Services",
    "JSE": "JSE Limited",
    "ZED": "Zeda Limited",
    "ADH": "ADvTECH Limited",
    "CUR": "Curro Holdings Limited",
    "KST": "Karooooo Ltd",
    "ALH": "Altron Limited",
    "BYI": "Bytes Technology Group",
    "SNT": "Santam Limited",
    "REN": "Renergen Limited"
}


async def validate_ticker(ticker: str) -> dict:
    ticker_clean = ticker.upper().strip().replace(".JO", "")
    if ticker_clean in JSE_TICKERS:
        return {"valid": True, "ticker": ticker_clean, "name": JSE_TICKERS[ticker_clean]}

    formatted = f"{ticker_clean}.JO"
    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(None, lambda: yf.Ticker(formatted).fast_info)
        # Accessing 'currency' forces yfinance to fetch metadata, raising an exception if the ticker is invalid/delisted
        currency = await loop.run_in_executor(None, lambda: getattr(info, 'currency', None))
        if not currency:
            raise ValueError("Symbol not found or delisted")
        return {"valid": True, "ticker": ticker_clean,
                "name": getattr(info, "company_name", ticker_clean)}
    except Exception:
        return {"valid": False, "ticker": ticker_clean}
