from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import optimizer, market, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.rf_service import get_rf_rate
    rate = await get_rf_rate()
    print(f"[startup] FRED Rf rate: {rate['rate_pct']}% (source: {rate['source']})")
    yield

app = FastAPI(title="JSE Portfolio Optimizer API", version="1.0.0", lifespan=lifespan)

# Filter None and support comma-separated CORS origins
cors_env = os.getenv("CORS_ORIGIN")
env_origins = [o.strip() for o in cors_env.split(",")] if cors_env else []
origins = list(filter(None, env_origins + ["http://localhost:5173"]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    # allow_credentials intentionally omitted — no cookies used
)

app.include_router(optimizer.router)
app.include_router(market.router)
app.include_router(health.router)
