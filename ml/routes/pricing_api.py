from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

router = APIRouter()

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
@router.post("/suggest-price", response_model=List[Suggestion])
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

    