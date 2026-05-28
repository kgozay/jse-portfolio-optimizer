SECTOR_MAP = {
    # Consumer Discretionary
    "MRP": "Consumer Discretionary", "TFG": "Consumer Discretionary",
    "TRU": "Consumer Discretionary", "BID": "Consumer Discretionary",
    "PPH": "Consumer Discretionary", "MCG": "Consumer Discretionary",
    "SUI": "Consumer Discretionary", "TSG": "Consumer Discretionary",
    "CLH": "Consumer Discretionary",

    # Consumer Staples
    "SHP": "Consumer Staples", "PIK": "Consumer Staples",
    "WHL": "Consumer Staples", "DCP": "Consumer Staples",
    "CLS": "Consumer Staples", "SPAR": "Consumer Staples",
    "RCL": "Consumer Staples", "RFG": "Consumer Staples",
    "OCE": "Consumer Staples", "AVI": "Consumer Staples",
    "TBS": "Consumer Staples",

    # Financials
    "SBK": "Financials", "FSR": "Financials", "NED": "Financials",
    "ABG": "Financials", "DSY": "Financials", "SLM": "Financials",
    "CPI": "Financials", "REM": "Financials", "OML": "Financials",
    "OMU": "Financials", "OUT": "Financials", "INP": "Financials",
    "INL": "Financials", "MCF": "Financials", "PMG": "Financials",
    "PSG": "Financials", "JSE": "Financials", "SNT": "Financials",

    # Resources
    "AGL": "Resources", "BHP": "Resources", "SOL": "Resources",
    "SAP": "Resources", "SSW": "Resources", "IMP": "Resources",
    "GFI": "Resources", "HAR": "Resources", "AMS": "Resources",
    "EXX": "Resources", "KIO": "Resources", "CFR": "Resources",
    "ANG": "Resources", "GLN": "Resources", "ARI": "Resources",
    "DGC": "Resources", "PAN": "Resources", "THA": "Resources",
    "MER": "Resources", "REN": "Resources", "AFT": "Resources",

    # Industrials
    "BTI": "Industrials", "APN": "Industrials", "BVT": "Industrials",
    "MNP": "Industrials", "PPC": "Industrials", "RLO": "Industrials",
    "KAP": "Industrials", "SPG": "Industrials", "MOT": "Industrials",
    "ZED": "Industrials", "ADH": "Industrials", "CUR": "Industrials",
    "LHS": "Industrials", "NTC": "Industrials",

    # Technology
    "NPN": "Technology", "PRX": "Technology", "KST": "Technology",
    "ALH": "Technology", "BYI": "Technology",

    # Telecommunications
    "MTN": "Telecommunications", "VOD": "Telecommunications",
    "TKG": "Telecommunications", "BLU": "Telecommunications",

    # Real Estate
    "GRT": "Real Estate", "RDF": "Real Estate", "NEPI": "Real Estate",
    "RES": "Real Estate", "HYP": "Real Estate", "VKE": "Real Estate",
    "ATT": "Real Estate", "EQU": "Real Estate",
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
