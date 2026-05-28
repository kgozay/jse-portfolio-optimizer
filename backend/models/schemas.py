from typing import Annotated
from pydantic import BaseModel, Field, field_validator

class OptimiseRequest(BaseModel):
    tickers: Annotated[list[str], Field(min_length=3, max_length=15)]
    rf_rate: float = Field(0.1050, ge=0.0, le=1.0)
    period: str = Field("3y", pattern="^(1y|2y|3y|5y)$")
    max_weight: float = Field(0.40, ge=0.05, le=1.0)
    estimator: str = Field("ledoit_wolf", pattern="^(ledoit_wolf|sample)$")
    n_simulations: int = Field(5000, ge=1000, le=10000)
    objective: str = Field("max_sharpe", pattern="^(max_sharpe|min_volatility|max_sortino)$")
    benchmark: str = Field("J203", pattern="^(J203|J200|EQUAL_WEIGHT)$")

    @field_validator("tickers")
    @classmethod
    def clean_tickers(cls, v):
        return list(dict.fromkeys([t.upper().strip() for t in v]))


class WeightItem(BaseModel):
    ticker: str
    weight: float
    contribution_to_return: float
    contribution_to_risk: float


class OptimiseResponse(BaseModel):
    weights: list[WeightItem]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    downside_risk: float
    var_value: float
    cvar_value: float
    monte_carlo: list[dict]
    frontier: list[dict]
    asset_points: list[dict]
    optimal_point: dict
    rf_rate_used: float
    rf_rate_source: str
    period_used: str
    tickers_dropped: list[str]
    duration_ms: int
    weights_sum_check: float
    semicovariance: dict[str, dict[str, float]]
    objective: str
