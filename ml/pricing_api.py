from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import threading
import time
import requests
import os

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class Product(BaseModel):
    price: float
    expense: float
    sales_volume: int

class Suggestion(BaseModel):
    suggested_price: float
    predicted_sales: int
    expected_revenue: float

# Route for price suggestion
@app.post("/suggest-price", response_model=List[Suggestion])
def suggest_price(products: List[Product]):
    suggestions = []

    for product in products:
        df = pd.DataFrame({
            "price": [product.price - 5, product.price, product.price + 5],
            "sales_volume": [product.sales_volume + 5, product.sales_volume, product.sales_volume - 5]
        })

        if df["sales_volume"].nunique() < 2:
            suggestions.append({
                "suggested_price": product.price,
                "predicted_sales": product.sales_volume,
                "expected_revenue": product.price * product.sales_volume
            })
            continue

        model = LinearRegression()
        model.fit(df[["price"]], df["sales_volume"])

        price_range = np.linspace(df["price"].min(), df["price"].max(), 100)
        predicted_sales = model.predict(price_range.reshape(-1, 1))
        revenue = price_range * predicted_sales
        best_index = np.argmax(revenue)

        suggestions.append({
            "suggested_price": round(float(price_range[best_index]), 2),
            "predicted_sales": int(predicted_sales[best_index]),
            "expected_revenue": round(float(revenue[best_index]), 2)
        })

    return suggestions
