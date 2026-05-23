SECTOR_MAP = {
    # Consumer Discretionary
    "MRP": "Consumer Discretionary", "TFG": "Consumer Discretionary",
    "TRU": "Consumer Discretionary", "BID": "Consumer Discretionary",
    "PPH": "Consumer Discretionary",
    # Consumer Staples
    "SHP": "Consumer Staples", "PIK": "Consumer Staples",
    "WHL": "Consumer Staples", "DCP": "Consumer Staples",
    "CLS": "Consumer Staples",
    # Financials
    "SBK": "Financials", "FSR": "Financials", "NED": "Financials",
    "ABG": "Financials", "DSY": "Financials", "SLM": "Financials",
    "CPI": "Financials", "REM": "Financials", "OML": "Financials",
    "OMU": "Financials", "OUT": "Financials",
    # Resources
    "AGL": "Resources", "BHP": "Resources", "SOL": "Resources",
    "SAP": "Resources", "SSW": "Resources", "IMP": "Resources",
    "GFI": "Resources", "HAR": "Resources", "AMS": "Resources",
    "EXX": "Resources", "KIO": "Resources",
    # Industrials
    "BTI": "Industrials", "APN": "Industrials", "JSE": "Industrials",
    "BVT": "Industrials",
    # Technology
    "NPN": "Technology", "PRX": "Technology",
    # Telecommunications
    "MTN": "Telecommunications", "VOD": "Telecommunications",
    # Real Estate
    "GRT": "Real Estate",
}


def compute_sector_exposure(weights: dict) -> list[dict]:
    exposure: dict[str, float] = {}
    for ticker, weight in weights.items():
        sector = SECTOR_MAP.get(ticker.replace(".JO", ""), "Other")
        exposure[sector] = exposure.get(sector, 0) + weight
    return [
        {"sector": s, "weight": round(w, 4)}
        for s, w in sorted(exposure.items(), key=lambda x: -x[1])
    ]
