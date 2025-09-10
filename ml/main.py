from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import routes.dashboard_api as dashboard
import routes.pricing_api as pricing 

import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Dashboard Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pricing.router, tags=["Pricing"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"message": "AI Backend Running"}
