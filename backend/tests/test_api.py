"""
Tests for the Expense Tracker API.

Covers:
  - Creating expenses with validation
  - Listing and filtering expenses
  - Idempotency handling for duplicate submissions
  - Edge cases: negative amounts, missing fields
"""

import os
import sys
import pytest

# Use an in-memory (temp file) test database
os.environ["DATABASE_PATH"] = ":memory:"

# Ensure backend module is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import init_db


@pytest.fixture(autouse=True)
def setup_db():
    """Re-initialize the database before each test."""
    os.environ["DATABASE_PATH"] = "test_expenses.db"
    # Remove old test db
    if os.path.exists("test_expenses.db"):
        os.remove("test_expenses.db")
    init_db()
    yield
    if os.path.exists("test_expenses.db"):
        os.remove("test_expenses.db")


@pytest.fixture
def client():
    return TestClient(app)


VALID_EXPENSE = {
    "amount": 150.50,
    "category": "Food",
    "description": "Lunch at cafeteria",
    "date": "2025-02-17",
}


class TestCreateExpense:
    def test_create_expense_success(self, client):
        resp = client.post("/expenses", json=VALID_EXPENSE)
        assert resp.status_code == 201
        data = resp.json()
        assert data["amount"] == 150.50
        assert data["category"] == "Food"
        assert data["description"] == "Lunch at cafeteria"
        assert data["date"] == "2025-02-17"
        assert "id" in data
        assert "created_at" in data

    def test_create_expense_negative_amount_rejected(self, client):
        expense = {**VALID_EXPENSE, "amount": -10}
        resp = client.post("/expenses", json=expense)
        assert resp.status_code == 422

    def test_create_expense_zero_amount_rejected(self, client):
        expense = {**VALID_EXPENSE, "amount": 0}
        resp = client.post("/expenses", json=expense)
        assert resp.status_code == 422

    def test_create_expense_missing_category(self, client):
        expense = {"amount": 100, "description": "test", "date": "2025-01-01"}
        resp = client.post("/expenses", json=expense)
        assert resp.status_code == 422

    def test_create_expense_invalid_date(self, client):
        expense = {**VALID_EXPENSE, "date": "not-a-date"}
        resp = client.post("/expenses", json=expense)
        assert resp.status_code == 422

    def test_idempotency_prevents_duplicate(self, client):
        expense = {**VALID_EXPENSE, "idempotency_key": "unique-key-123"}
        resp1 = client.post("/expenses", json=expense)
        resp2 = client.post("/expenses", json=expense)
        assert resp1.status_code == 201
        assert resp2.status_code == 201
        assert resp1.json()["id"] == resp2.json()["id"]  # Same record returned

    def test_different_idempotency_keys_create_separate(self, client):
        expense1 = {**VALID_EXPENSE, "idempotency_key": "key-a"}
        expense2 = {**VALID_EXPENSE, "idempotency_key": "key-b"}
        resp1 = client.post("/expenses", json=expense1)
        resp2 = client.post("/expenses", json=expense2)
        assert resp1.json()["id"] != resp2.json()["id"]


class TestListExpenses:
    def test_list_empty(self, client):
        resp = client.get("/expenses")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_created_expenses(self, client):
        client.post("/expenses", json=VALID_EXPENSE)
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Transport"})
        resp = client.get("/expenses")
        assert len(resp.json()) == 2

    def test_filter_by_category(self, client):
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Food"})
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Transport"})
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Food"})

        resp = client.get("/expenses", params={"category": "Food"})
        data = resp.json()
        assert len(data) == 2
        assert all(e["category"] == "Food" for e in data)

    def test_sort_by_date_desc(self, client):
        client.post("/expenses", json={**VALID_EXPENSE, "date": "2025-01-01"})
        client.post("/expenses", json={**VALID_EXPENSE, "date": "2025-03-01"})
        client.post("/expenses", json={**VALID_EXPENSE, "date": "2025-02-01"})

        resp = client.get("/expenses", params={"sort": "date_desc"})
        data = resp.json()
        dates = [e["date"] for e in data]
        assert dates == ["2025-03-01", "2025-02-01", "2025-01-01"]

    def test_filter_and_sort_combined(self, client):
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Food", "date": "2025-01-01"})
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Transport", "date": "2025-02-01"})
        client.post("/expenses", json={**VALID_EXPENSE, "category": "Food", "date": "2025-03-01"})

        resp = client.get("/expenses", params={"category": "Food", "sort": "date_desc"})
        data = resp.json()
        assert len(data) == 2
        assert data[0]["date"] == "2025-03-01"
        assert data[1]["date"] == "2025-01-01"


class TestHealthCheck:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
