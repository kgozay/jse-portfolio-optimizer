from fastapi import APIRouter
from services.rf_service import get_rf_rate
from services.data_service import validate_ticker

router = APIRouter()

@router.get("/rf-rate")
async def rf_rate_endpoint():
    return await get_rf_rate()

@router.get("/validate/{ticker}")
async def validate(ticker: str):
    return await validate_ticker(ticker.upper())
