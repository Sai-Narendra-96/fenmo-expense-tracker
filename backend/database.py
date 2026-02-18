"""
Database module for the Expense Tracker.

Uses SQLite for persistence — a solid choice for a single-server personal finance tool:
- Zero configuration, file-based, no external service needed
- ACID-compliant transactions
- Easily portable and backupable
- More than sufficient for personal expense tracking workloads

Money is stored as INTEGER cents (paise) to avoid floating-point precision issues.
"""

import sqlite3
import os
from contextlib import contextmanager

DATABASE_PATH = os.environ.get("DATABASE_PATH", "expenses.db")


def get_connection() -> sqlite3.Connection:
    """Create a new database connection with proper settings."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # Better concurrent read performance
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """Context manager for database connections with automatic cleanup."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database schema. Safe to call multiple times (IF NOT EXISTS)."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
                category TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                idempotency_key TEXT UNIQUE
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC)
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_idempotency
            ON expenses(idempotency_key) WHERE idempotency_key IS NOT NULL
        """)
