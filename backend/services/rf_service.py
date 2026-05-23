import httpx
import os
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

FRED_API_KEY = os.getenv("FRED_API_KEY")
FRED_SERIES_ID = "IRLTLT01ZAM156N"
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
FALLBACK_RF = float(os.getenv("FALLBACK_RF_RATE", "0.1050"))
CACHE_TTL_HOURS = 6

_cache: dict = {"data": None, "fetched_at": None}

async def get_rf_rate() -> dict:
    if _cache["data"] is not None:
        age = datetime.now(timezone.utc) - _cache["fetched_at"]
        if age < timedelta(hours=CACHE_TTL_HOURS):
            return _cache["data"]

    if not FRED_API_KEY:
        logger.warning("FRED_API_KEY not set — using fallback Rf rate.")
        return _build_fallback("FRED_API_KEY env var not configured")

    params = {
        "series_id": FRED_SERIES_ID,
        "api_key": FRED_API_KEY,
        "sort_order": "desc",
        "limit": 3,
        "file_type": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(FRED_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        rate_decimal, rate_date = None, None
        for obs in data.get("observations", []):
            raw = obs.get("value", ".")
            if raw == "." or raw is None:
                continue
            try:
                rate_decimal = float(raw) / 100.0
                rate_date = obs["date"]
                break
            except (ValueError, TypeError):
                continue

        if rate_decimal is None:
            raise ValueError("All recent FRED observations contain missing values.")

        result = {
            "rate": round(rate_decimal, 6),
            "rate_pct": round(rate_decimal * 100, 4),
            "date": rate_date,
            "source": "FRED",
            "series_id": FRED_SERIES_ID,
        }
        _cache["data"] = result
        _cache["fetched_at"] = datetime.now(timezone.utc)
        logger.info(f"FRED Rf rate: {result['rate_pct']}% (as of {rate_date})")
        return result

    except httpx.HTTPStatusError as e:
        logger.error(f"FRED HTTP {e.response.status_code}: {e}")
    except httpx.RequestError as e:
        logger.error(f"FRED network error: {e}")
    except Exception as e:
        logger.error(f"FRED unexpected error: {e}")

    return _build_fallback("FRED API unreachable")

def _build_fallback(reason: str = "") -> dict:
    if reason:
        logger.warning(f"Using hardcoded Rf fallback. Reason: {reason}")
    return {
        "rate": FALLBACK_RF,
        "rate_pct": round(FALLBACK_RF * 100, 2),
        "date": "fallback",
        "source": "fallback",
        "series_id": FRED_SERIES_ID,
    }
