"""
Dashboard routes that:
- Teach GPT the REAL Mongo schema (KPI w/ totals + monthly + daily + category breakdown, Products, Transactions)
- Let GPT propose a query + chart
- Preprocess KPI into melted DataFrames: kpi_totals, kpi_expensesByCategory, kpi_monthly, kpi_daily
- Build charts with Plotly and return as Base64 PNG

.env needs:
  MONGO_URI=mongodb+srv://user:pass@cluster/dbname?retryWrites=true&w=majority
  OPENAI_API_KEY=sk-...

Optional:
  DB_NAME=dashboarddb
"""

import os
import re
import json
import base64
import logging
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
import plotly.express as px
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from openai import OpenAI
from datetime import datetime

# ----------------------------
# Setup & Logging
# ----------------------------
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "dashboarddb")

if not MONGO_URI:
    raise RuntimeError("Missing MONGO_URI in environment")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("dashboard")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client[DB_NAME]

router = APIRouter()

# ----------------------------
# Request model
# ----------------------------
class DashboardRequest(BaseModel):
    prompt: str

# ----------------------------
# Utilities
# ----------------------------
def _clean_json(raw: str) -> str:
    """Extract a JSON object from GPT output and strip code fences."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()
    m = re.search(r"\{.*\}\s*$", raw, flags=re.DOTALL)
    return m.group(0) if m else raw


def _to_base64_fig(fig) -> str:
    """Render a Plotly figure to base64 PNG."""
    fig.update_layout(
        height=420,
        font=dict(size=12),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=40, r=10, t=50, b=40),
    )
    try:
        img_bytes = fig.to_image(format="png", width=900, height=420)
    except Exception as e:
        # Kaleido likely missing: provide a tiny fallback image via imshow
        log.warning(f"Kaleido render failed, returning fallback: {e}")
        fig = px.imshow([[0]], text_auto=True, title="Chart render fallback (install `kaleido`)")
        img_bytes = fig.to_image(format="png", width=900, height=420)

    return base64.b64encode(img_bytes).decode("utf-8")


def _df_from_docs(docs: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(docs)
    if "_id" in df.columns:
        df = df.drop(columns=["_id"])
    for col in df.columns:
        if "date" in col.lower() or "created" in col.lower() or "updated" in col.lower():
            try:
                df[col] = pd.to_datetime(df[col])
            except Exception:
                pass
    return df


# ----------------------------
# KPI Preprocessing (melt)
# ----------------------------
def melt_kpi_document(doc: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """
    Convert a single KPI document into multiple flat DataFrames:
      - kpi_totals: metric,value
      - kpi_expensesByCategory: category,value
      - kpi_monthly: month,revenue,expenses,operationalExpenses,nonOperationalExpenses
      - kpi_daily: date,revenue,expenses
    """
    totals_df = pd.DataFrame([
        {"metric": "totalRevenue", "value": doc.get("totalRevenue", 0)},
        {"metric": "totalExpenses", "value": doc.get("totalExpenses", 0)},
        {"metric": "totalProfit",  "value": doc.get("totalProfit",  0)},
    ])

    exp_cat_dict = doc.get("expensesByCategory", {}) or {}
    exp_df = pd.DataFrame(
        [{"category": k, "value": v} for k, v in exp_cat_dict.items()]
    )

    monthly_df = pd.DataFrame(doc.get("monthlyData", []) or [])
    daily_df = pd.DataFrame(doc.get("dailyData", []) or [])

    # Normalize types
    if not monthly_df.empty and "month" in monthly_df.columns:
        # optionally capitalize
        monthly_df["month"] = monthly_df["month"].astype(str)

    if not daily_df.empty and "date" in daily_df.columns:
        try:
            daily_df["date"] = pd.to_datetime(daily_df["date"])
        except Exception:
            pass

        # Ensure numeric
        for c in ("revenue", "expenses"):
            if c in daily_df.columns:
                daily_df[c] = pd.to_numeric(daily_df[c], errors="coerce").fillna(0)

    return {
        "kpi_totals": totals_df,
        "kpi_expensesByCategory": exp_df,
        "kpi_monthly": monthly_df,
        "kpi_daily": daily_df,
    }


async def fetch_kpi_frames() -> Dict[str, pd.DataFrame]:
    """
    Fetch the latest KPI doc (by createdAt desc if available), then melt it into DataFrames.
    """
    sort_spec = [("createdAt", -1)]
    try:
        doc = await db.kpis.find_one({}, sort=sort_spec)
    except Exception as e:
        log.warning(f"Failed fetching KPI doc w/ sort, falling back: {e}")
        doc = await db.kpis.find_one({})

    if not doc:
        log.info("No KPI document found, returning empty frames.")
        return {
            "kpi_totals": pd.DataFrame(columns=["metric", "value"]),
            "kpi_expensesByCategory": pd.DataFrame(columns=["category", "value"]),
            "kpi_monthly": pd.DataFrame(columns=["month", "revenue", "expenses", "operationalExpenses", "nonOperationalExpenses"]),
            "kpi_daily": pd.DataFrame(columns=["date", "revenue", "expenses"]),
        }

    frames = melt_kpi_document(doc)
    for name, df in frames.items():
        log.info(f"[KPI] {name} rows={len(df)} cols={list(df.columns)}")
    return frames


async def fetch_products_df() -> pd.DataFrame:
    docs = await db.products.find({}).to_list(None)
    df = _df_from_docs(docs)
    # Add margin if possible
    if not df.empty and "price" in df.columns and "expense" in df.columns:
        df["margin"] = pd.to_numeric(df["price"], errors="coerce").fillna(0) - pd.to_numeric(df["expense"], errors="coerce").fillna(0)
    log.info(f"[Products] rows={len(df)} cols={list(df.columns)}")
    return df


async def fetch_transactions_df() -> pd.DataFrame:
    docs = await db.transactions.find({}).to_list(None)
    df = _df_from_docs(docs)
    # Product count
    if not df.empty and "productIds" in df.columns:
        df["productCount"] = df["productIds"].apply(lambda x: len(x) if isinstance(x, list) else 0)
    log.info(f"[Transactions] rows={len(df)} cols={list(df.columns)}")
    return df


# ----------------------------
# Schema shown to GPT
# ----------------------------
async def build_schema_for_llm() -> Dict[str, Any]:
    """
    Teach GPT the REAL schema. KPI is split into four logical datasets:
      - kpi_totals(metric,value)
      - kpi_expensesByCategory(category,value)
      - kpi_monthly(month,revenue,expenses,operationalExpenses,nonOperationalExpenses)
      - kpi_daily(date,revenue,expenses)
    Plus products & transactions.
    """
    # We *describe* them, not necessarily reading actual docs
    schema = {
        "datasets": {
            "kpi_totals": {
                "fields": ["metric (totalRevenue|totalExpenses|totalProfit)", "value (number)"],
                "note": "Overall KPI totals (one row per metric). Recommended charts: bar or pie, x=metric, y=value."
            },
            "kpi_expensesByCategory": {
                "fields": ["category (salaries|supplies|services|...)", "value (number)"],
                "note": "Expense split by category. Charts: pie/bar, x=category, y=value."
            },
            "kpi_monthly": {
                "fields": ["month (string)", "revenue (number)", "expenses (number)", "operationalExpenses (number)", "nonOperationalExpenses (number)"],
                "note": "Monthly KPI time-series (12 rows). Charts: line or bar, x=month, y=revenue/expenses."
            },
            "kpi_daily": {
                "fields": ["date (YYYY-MM-DD)", "revenue (number)", "expenses (number)"],
                "note": "Daily KPI time-series (365 rows). Charts: line, x=date, y=revenue/expenses."
            },
            "products": {
                "fields": ["price (number)", "expense (number)", "margin (derived)", "transactions (array)", "createdAt (timestamp)"],
                "note": "Product pricing. Charts: scatter price vs expense, histogram price, etc."
            },
            "transactions": {
                "fields": ["buyer (string)", "amount (number)", "productIds (array)", "productCount (derived)", "createdAt (timestamp)"],
                "note": "Transactions log. Charts: histogram/box of amount, group by buyer, time-series by createdAt."
            },
        }
    }
    log.info(f"LLM schema: {schema}")
    return schema


# ----------------------------
# LLM Planner
# ----------------------------
def _normalize_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    log.info(f"Normalizing plan: {plan}")

    ds = str(plan.get("dataset") or "").strip()
    valid_ds = {
        "kpi_totals",
        "kpi_expensesByCategory",
        "kpi_monthly",
        "kpi_daily",
        "products",
        "transactions",
    }
    if ds not in valid_ds:
        if ds.lower() in {"kpis", "kpi", "totals"}:
            ds = "kpi_totals"
        else:
            ds = "kpi_totals"
    plan["dataset"] = ds

    # chart type normalization
    ch = str(plan.get("chart_type") or "").strip().lower()
    ch_map = {
        "bar": "bar", "bar chart": "bar",
        "line": "line", "line chart": "line",
        "scatter": "scatter", "scatter plot": "scatter",
        "pie": "pie", "pie chart": "pie",
        "histogram": "histogram",
        "box": "box", "box plot": "box",
    }
    plan["chart_type"] = ch_map.get(ch, "bar")

    # defaults
    if ds == "kpi_totals":
        plan["x"] = plan.get("x") or "metric"
        plan["y"] = plan.get("y") or "value"
    elif ds == "kpi_expensesByCategory":
        plan["x"] = plan.get("x") or "category"
        plan["y"] = plan.get("y") or "value"
    elif ds == "kpi_monthly":
        plan["x"] = plan.get("x") or "month"
        plan["y"] = plan.get("y") or "revenue"
    elif ds == "kpi_daily":
        plan["x"] = plan.get("x") or "date"
        plan["y"] = plan.get("y") or "revenue"
    elif ds == "products":
        if plan["chart_type"] in ("scatter", "line"):
            plan["x"] = plan.get("x") or "price"
            plan["y"] = plan.get("y") or "expense"
        else:
            plan["x"] = plan.get("x") or "createdAt"
            plan["y"] = plan.get("y") or "price"
    elif ds == "transactions":
        if plan["chart_type"] in ("box", "histogram"):
            plan["x"] = plan.get("x") or "amount"
            plan["y"] = plan.get("y") or None
        else:
            plan["x"] = plan.get("x") or "buyer"
            plan["y"] = plan.get("y") or "amount"

    # optional
    plan["filter"] = plan.get("filter") or None
    plan["calculation"] = plan.get("calculation") or None

    # 🔧 Extra safeguard: exclude profit if user meant only revenue vs expenses
    # (works if prompt text is passed in plan or stored globally)
    from fastapi import Request  # or pass `req.prompt` into normalize
    
    # 🔧 Extra safeguard: filter only when prompt implies Revenue vs Expenses only
        # 🔧 Extra safeguard: align kpi_totals filter with the *prompt*
    if ds == "kpi_totals" and plan.get("filter") is None:
        prompt_text = str(plan.get("reason", "")).lower()

        has_rev = "revenue" in prompt_text
        has_exp = "expense" in prompt_text
        has_prof = "profit" in prompt_text

        metrics = []
        if has_rev:
            metrics.append("totalRevenue")
        if has_exp:
            metrics.append("totalExpenses")
        if has_prof:
            metrics.append("totalProfit")

        if metrics:
            plan["filter"] = {"metric": metrics}

    return plan



async def llm_plan(prompt: str) -> Dict[str, Any]:
    """
    Ask GPT to propose:
      {
        "dataset": "<kpi_totals|kpi_expensesByCategory|kpi_monthly|kpi_daily|products|transactions>",
        "chart_type": "<bar|line|scatter|pie|histogram|box>",
        "x": "<field>",
        "y": "<field or null>",
        "filter": {<field>: [..]} or null,
        "calculation": "newCol = expr" or null,
        "reason": "..."
      }
    JSON ONLY. No Chart.js configs.
    """
    schema = await build_schema_for_llm()

    sys = (
        "You are a data viz planner for a Mongo-backed dashboard.\n"
        "You must return STRICT JSON **only** (no markdown, no prose) with keys:\n"
        '{\n'
        '  "dataset": "<kpi_totals|kpi_expensesByCategory|kpi_monthly|kpi_daily|products|transactions>",\n'
        '  "chart_type": "<bar|line|scatter|pie|histogram|box>",\n'
        '  "x": "<field>",\n'
        '  "y": "<field or null>",\n'
        '  "filter": { "<field>": ["val1","val2"] } or null,\n'
        '  "calculation": "newCol = <python_expr_using_existing_columns>" or null,\n'
        '  "reason": "short sentence"\n'
        '}\n\n'
        "Rules:\n"
        "- For KPI totals use dataset kpi_totals with x=metric, y=value (bar/pie).\n"
        "- For KPI monthly use dataset kpi_monthly (x=month, y in revenue|expenses|operationalExpenses|nonOperationalExpenses).\n"
        "- For KPI daily use dataset kpi_daily (x=date, y in revenue|expenses).\n"
        "- For expenses by category use kpi_expensesByCategory (x=category, y=value).\n"
        "- For products: price, expense, margin are available; scatter price vs expense is common.\n"
        "- For transactions: buyer, amount, productCount, createdAt available; histogram of amount is common.\n"
        "- If unsure, pick a simple valid plan.\n"
        "Return JSON only."
    )

    user = f"User prompt: {prompt}\nSchema: {json.dumps(schema)}\nReturn JSON only."

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": sys},
                      {"role": "user", "content": user}],
            temperature=0,
        )
        raw = resp.choices[0].message.content.strip()
        log.info(f"🔍 LLM raw: {raw}")
        plan = json.loads(_clean_json(raw))
        return _normalize_plan(plan)
    except Exception as e:
        log.warning(f"LLM planning failed, using fallback. Error: {e}")
        return _normalize_plan({
            "dataset": "kpi_totals",
            "chart_type": "bar",
            "x": "metric",
            "y": "value",
            "filter": None,
            "calculation": None,
            "reason": "Fallback plan",
        })


# ----------------------------
# Execution: pick DF by dataset
# ----------------------------
async def get_dataframe_for_dataset(dataset: str) -> pd.DataFrame:
    if dataset.startswith("kpi_"):
        frames = await fetch_kpi_frames()
        return frames.get(dataset, pd.DataFrame())

    if dataset == "products":
        return await fetch_products_df()

    if dataset == "transactions":
        return await fetch_transactions_df()

    # Fallback (shouldn't happen)
    return pd.DataFrame()


def apply_filter(df: pd.DataFrame, plan: Dict[str, Any]) -> pd.DataFrame:
    filt = plan.get("filter")
    if not filt or df.empty:
        return df
    for col, vals in filt.items():
        if col in df.columns and isinstance(vals, list):
            df = df[df[col].isin(vals)]
    return df


def apply_calculation(df: pd.DataFrame, plan: Dict[str, Any]) -> pd.DataFrame:
    calc = plan.get("calculation")
    if not calc or "=" not in calc or df.empty:
        return df
    lhs, rhs = [p.strip() for p in calc.split("=", 1)]
    try:
        local_ctx = {c: df[c] for c in df.columns}
        df[lhs] = pd.eval(rhs, engine="python", local_dict=local_ctx)
        log.info(f"Applied calculation: {calc}")
    except Exception as e:
        log.warning(f"Calculation failed ({calc}): {e}")
    return df


def build_chart(df: pd.DataFrame, plan: Dict[str, Any]) -> str:
    chart = plan.get("chart_type", "bar")
    x = plan.get("x")
    y = plan.get("y")

    log.info(f"Building chart type={chart} x={x} y={y} rows={len(df)} cols={list(df.columns)}")

    if df.empty or not x:
        fig = px.imshow([[1, 2], [3, 4]], text_auto=True, title="No data / invalid plan")
        return _to_base64_fig(fig)

    try:
        if chart == "bar":
            fig = px.bar(df, x=x, y=y, title=f"{y} by {x}" if y else f"{x}")
        elif chart == "line":
            fig = px.line(df, x=x, y=y, markers=True, title=f"{y} over {x}")
        elif chart == "scatter":
            fig = px.scatter(df, x=x, y=y, title=f"{y} vs {x}")
        elif chart == "pie":
            # pie: names=x, values=y
            if y is None:
                # Try to infer numeric column if y missing
                num_cols = [c for c in df.columns if c not in (x,) and pd.api.types.is_numeric_dtype(df[c])]
                y_eff = num_cols[0] if num_cols else None
            else:
                y_eff = y
            if y_eff is None:
                fig = px.imshow([[0]], text_auto=True, title="Pie needs numeric 'y' values")
            else:
                fig = px.pie(df, names=x, values=y_eff, title=f"{y_eff} distribution by {x}")
        elif chart == "histogram":
            fig = px.histogram(df, x=x, title=f"Distribution of {x}")
        elif chart == "box":
            fig = px.box(df, x=x, y=y, title=f"{y} by {x}" if y else f"Box: {x}")
        else:
            fig = px.imshow([[0]], text_auto=True, title="Fallback chart")
        return _to_base64_fig(fig)
    except Exception as e:
        log.warning(f"Chart error: {e}")
        fig = px.imshow([[0]], text_auto=True, title="Chart error")
        return _to_base64_fig(fig)


# ----------------------------
# Route
# ----------------------------
@router.post("/generate")
async def generate(req: DashboardRequest):
    log.info(f"Received prompt: {req.prompt!r}")
    try:
        # 1) Plan with GPT
        plan = await llm_plan(req.prompt)

        # 2) Load dataframe for dataset
        df = await get_dataframe_for_dataset(plan["dataset"])

        # 3) Apply filter & calculation if any
        df = apply_filter(df, plan)
        df = apply_calculation(df, plan)

        # 4) Build chart
        img64 = build_chart(df, plan)

        return JSONResponse({
            "graph": img64,
            "assistantText": f"Plan: {plan}. Rows: {len(df)}"
        })
    except Exception as e:
        log.error(f"❌ Error in /generate: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
