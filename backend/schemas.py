"""
Pydantic schemas for request validation and response serialization.

Key design decisions:
- Amount is accepted as a float from the client but stored as integer cents internally
  to avoid floating-point precision issues with money.
- Idempotency key is optional but recommended for POST requests to safely handle retries.
- Date is validated as a proper date string (YYYY-MM-DD format).
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP


class ExpenseCreate(BaseModel):
    """Schema for creating a new expense."""
    amount: float = Field(..., gt=0, description="Expense amount in rupees (must be positive)")
    category: str = Field(..., min_length=1, max_length=100, description="Expense category")
    description: str = Field("", max_length=500, description="Optional description")
    date: str = Field(..., description="Date of expense in YYYY-MM-DD format")
    idempotency_key: Optional[str] = Field(None, max_length=255, description="Unique key to prevent duplicate submissions")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        """Ensure date is valid and not in the future."""
        try:
            parsed = date.fromisoformat(v)
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        """Ensure amount has at most 2 decimal places."""
        d = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if d <= 0:
            raise ValueError("Amount must be positive")
        if d > Decimal("99999999.99"):
            raise ValueError("Amount too large")
        return float(d)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Normalize category: strip whitespace and capitalize."""
        return v.strip()

    def amount_cents(self) -> int:
        """Convert amount to integer cents (paise) for storage."""
        return int(Decimal(str(self.amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100)


class ExpenseResponse(BaseModel):
    """Schema for expense in API responses."""
    id: str
    amount: float
    category: str
    description: str
    date: str
    created_at: str

    model_config = {"from_attributes": True}
