"""
app.py
======
FastAPI application server for the InternHub Text-to-SQL chatbot.

AUTHENTICATION REMOVED: In testing mode as requested.
This allows any user to access the chatbot and run SQL queries.
"""

import os
import math
import re
import logging
import pandas as pd
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from vanna_setup import vn, connect_to_postgres

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

# ── Config ─────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
]

# ── Models ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str


def get_request_context(request: Request) -> Dict[str, str]:
    """Read lightweight role context from request headers."""
    role = (request.headers.get("x-user-role") or request.headers.get("x-hasura-role") or "admin").strip().lower()
    department_id = (
        request.headers.get("x-department-id")
        or request.headers.get("x-hasura-department-id")
        or ""
    ).strip()

    return {
        "role": role,
        "department_id": department_id,
    }


def ensure_department_person_context(ctx: Dict[str, str]) -> None:
    """Require department id when department_person role is used."""
    if ctx["role"] == "department_person" and not ctx["department_id"]:
        raise HTTPException(400, "x-department-id header is required for department_person role")


def strip_sql_comments(sql: str) -> str:
    """Remove SQL comments before applying security checks."""
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    sql = re.sub(r"--.*?$", "", sql, flags=re.MULTILINE)
    return sql


def is_department_scoped_sql(sql: str, department_id: str) -> bool:
    """Best-effort check that SQL includes explicit department filtering."""
    if not department_id:
        return False

    sanitized_sql = strip_sql_comments(sql).lower()
    quoted_dept = department_id.lower()

    # Require the exact department id literal plus a recognizable department filter column.
    has_dept_value = quoted_dept in sanitized_sql
    has_dept_column = (
        "department_id" in sanitized_sql
        or "departments.id" in sanitized_sql
        or ".id" in sanitized_sql and "departments" in sanitized_sql
    )

    return has_dept_value and has_dept_column


def build_scoped_question(question: str, department_id: str) -> str:
    """Inject strict department filter instruction for department_person role."""
    return (
        f"{question}\n\n"
        "Security rule: You must return SQL scoped only to this department. "
        f"Always include a WHERE filter for department_id = '{department_id}'."
    )


def sanitize_for_json(value: Any) -> Any:
    """Recursively convert NaN/Infinity floats to None for strict JSON compliance."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {k: sanitize_for_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_for_json(item) for item in value]
    return value


def dataframe_to_json_payload(df: pd.DataFrame) -> Dict[str, Any]:
    """Convert DataFrame to JSON-safe payload (no NaN/Infinity)."""
    if df is None or df.empty:
        return {"results": [], "columns": []}

    cleaned = df.copy()
    cleaned = cleaned.replace([float("inf"), float("-inf")], pd.NA)
    cleaned = cleaned.where(pd.notnull(cleaned), None)

    payload = {
        "results": cleaned.to_dict(orient="records"),
        "columns": list(cleaned.columns),
    }
    return sanitize_for_json(payload)

# ── Lifespan ───────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up InternHub AI Server (TESTING MODE - AUTH DISABLED)")
    try:
        connect_to_postgres()
    except Exception as e:
        logger.error(f"Postgres connection failed: {e}")
    yield
    logger.info("Shutting down InternHub AI Server.")

# ── App Init ───────────────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan, title="InternHub Vanna 2.0 API (Testing)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Endpoints ──────────────────────────────────────────────────────────

@app.get("/api/v0/config")
async def get_config():
    """Vanna-chat compatible discovery endpoint."""
    return {
        "api_base":    "/api/v0",
        "product":     "InternHub AI SQL",
        "llm_model":   os.getenv("GROQ_MODEL", "llama3-70b-8192"),
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/v0/generate_sql")
async def generate_sql(payload: ChatRequest, request: Request):
    """Generate SQL from natural language (Auth Disabled)."""
    try:
        ctx = get_request_context(request)
        ensure_department_person_context(ctx)

        question = payload.question
        if ctx["role"] == "department_person":
            question = build_scoped_question(payload.question, ctx["department_id"])

        sql = vn.generate_sql(question=question)

        if ctx["role"] == "department_person" and not is_department_scoped_sql(sql, ctx["department_id"]):
            raise HTTPException(403, "Generated SQL is not scoped to your department")

        return {"sql": sql}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SQL generation failed: {e}")
        raise HTTPException(500, f"Error generating SQL: {str(e)}")

@app.post("/api/v0/run_sql")
async def run_sql(payload: Dict[str, str], request: Request):
    """Execute raw SQL result (Auth Disabled)."""
    sql = payload.get("sql")
    if not sql:
        raise HTTPException(400, "SQL missing")

    ctx = get_request_context(request)
    ensure_department_person_context(ctx)

    if ctx["role"] == "department_person" and not is_department_scoped_sql(sql, ctx["department_id"]):
        raise HTTPException(403, "Department access denied: SQL must filter your department_id")
    
    try:
        df = vn.run_sql(sql)
        return dataframe_to_json_payload(df)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SQL execution failed: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@app.post("/api/v0/ask")
async def ask(payload: ChatRequest, request: Request):
    """Full natural language query lifecycle (Auth Disabled)."""
    try:
        ctx = get_request_context(request)
        ensure_department_person_context(ctx)

        question = payload.question
        if ctx["role"] == "department_person":
            question = build_scoped_question(payload.question, ctx["department_id"])

        sql = vn.generate_sql(question=question)
        if ctx["role"] == "department_person" and not is_department_scoped_sql(sql, ctx["department_id"]):
            raise HTTPException(403, "Generated SQL is not scoped to your department")

        df = vn.run_sql(sql)
        sql_payload = dataframe_to_json_payload(df)
        
        return {
            "question": payload.question,
            "sql": sql,
            "results": sql_payload["results"],
            "columns": sql_payload["columns"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ask query failed: {e}")
        raise HTTPException(500, f"Error processing query: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
