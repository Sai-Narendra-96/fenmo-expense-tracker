"""
Expense Tracker API — FastAPI Backend

Endpoints:
  POST /expenses   - Create a new expense (idempotent via optional idempotency_key)
  GET  /expenses   - List expenses with optional filtering and sorting

Production considerations:
  - Idempotency support for safe retries (network issues, double-clicks)
  - Proper money handling (integer cents internally)
  - Input validation via Pydantic
  - CORS configured for frontend origin
  - Structured error responses
"""

import os
import uuid
import sqlite3
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_db
from schemas import ExpenseCreate, ExpenseResponse

app = FastAPI(
    title="Expense Tracker API",
    version="1.0.0",
    description="A minimal, production-ready personal expense tracking API",
)

# CORS — allow frontend origins (strip whitespace to avoid mis-match)
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Initialize database on application startup."""
    init_db()


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "ok"}


@app.post("/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(expense: ExpenseCreate):
    """
    Create a new expense entry.

    Supports idempotency: if an `idempotency_key` is provided and a matching
    expense already exists, the existing expense is returned instead of creating
    a duplicate. This makes it safe for clients to retry on network failures.
    """
    with get_db() as conn:
        # Check idempotency: if this key was already used, return the existing record
        if expense.idempotency_key:
            existing = conn.execute(
                "SELECT * FROM expenses WHERE idempotency_key = ?",
                (expense.idempotency_key,)
            ).fetchone()
            if existing:
                return _row_to_response(existing)

        expense_id = str(uuid.uuid4())
        amount_cents = expense.amount_cents()

        try:
            conn.execute(
                """
                INSERT INTO expenses (id, amount_cents, category, description, date, idempotency_key)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    expense_id,
                    amount_cents,
                    expense.category,
                    expense.description,
                    expense.date,
                    expense.idempotency_key,
                ),
            )
        except sqlite3.IntegrityError:
            # Race condition on idempotency key — fetch and return existing
            if expense.idempotency_key:
                existing = conn.execute(
                    "SELECT * FROM expenses WHERE idempotency_key = ?",
                    (expense.idempotency_key,)
                ).fetchone()
                if existing:
                    return _row_to_response(existing)
            raise HTTPException(status_code=409, detail="Duplicate expense entry")

        row = conn.execute(
            "SELECT * FROM expenses WHERE id = ?", (expense_id,)
        ).fetchone()

    return _row_to_response(row)


@app.get("/expenses", response_model=list[ExpenseResponse])
def list_expenses(
    category: Optional[str] = Query(None, description="Filter by category"),
    sort: Optional[str] = Query(None, description="Sort order: 'date_desc' for newest first"),
):
    """
    List all expenses with optional filtering and sorting.

    Query parameters:
      - category: Filter expenses by exact category match
      - sort: Use 'date_desc' to sort by date descending (newest first)
    """
    query = "SELECT * FROM expenses WHERE 1=1"
    params: list = []

    if category:
        query += " AND category = ?"
        params.append(category)

    if sort == "date_desc":
        query += " ORDER BY date DESC, created_at DESC"
    else:
        query += " ORDER BY created_at DESC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    return [_row_to_response(row) for row in rows]


def _row_to_response(row: sqlite3.Row) -> ExpenseResponse:
    """Convert a database row to an API response, converting cents back to rupees."""
    return ExpenseResponse(
        id=row["id"],
        amount=row["amount_cents"] / 100.0,
        category=row["category"],
        description=row["description"],
        date=row["date"],
        created_at=row["created_at"],
    )