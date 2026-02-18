# Expense Tracker

A minimal full-stack expense tracking app — FastAPI backend + React frontend.

**Live:** https://fenmo-expense-tracker-pink.vercel.app  
**API:** https://fenmo-expense-tracker-jn5t.onrender.com/health

---

## What It Does

- Add expenses (amount, category, description, date)
- View expenses in a table with running total
- Filter by category, sort by date (newest first)
- Category breakdown summary
- Idempotent POST requests — safe to retry on flaky networks or double-clicks
- Client-side retry with exponential backoff for 5xx / network errors
- Input validation on both frontend and backend

---

## Tech Stack

| Layer | Tech | Reason |
|-------|------|--------|
| Backend | FastAPI + SQLite | Lightweight, auto-generates OpenAPI docs, zero-config DB |
| Frontend | React + Vite | Fast dev loop, simple component model |
| Deploy | Render + Vercel | Free tier, easy setup |

---

## Design Decisions

**Money as integer cents (paise):** Stored as integers in SQLite to avoid floating-point rounding. The API accepts/returns decimals (e.g. `150.50`) and converts internally.

**Idempotency keys:** The frontend generates a unique key per form submission and attaches it to the POST request. If the same key hits the server twice (retry, double-click), the server returns the original record instead of creating a duplicate.

**SQLite:** Good fit for a single-user personal tool — ACID transactions, WAL mode for reads, no external services. For multi-instance deploys, I'd swap to Postgres.

**Server-side filtering/sorting:** Filtering and sorting happen via query params on the backend, not purely in the browser. Scales better if the dataset grows.

---

## Trade-offs

- **No auth** — it's a personal tool. Auth would be first priority for multi-user.
- **No pagination** — fine for personal volumes. Would add cursor-based pagination for larger datasets.
- **No edit/delete** — focused on core acceptance criteria. PATCH/DELETE would follow the same patterns.
- **No CSS framework** — kept styling minimal and hand-written per the assignment guidance.
- **No state management library** — `useState`/`useEffect` are enough at this scope.

---

## Project Structure

```
fenmo-expense-tracker/
├── backend/
│   ├── main.py            # API endpoints
│   ├── database.py        # SQLite setup + schema
│   ├── schemas.py         # Pydantic models
│   ├── requirements.txt
│   └── tests/
│       └── test_api.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js         # API client with retry logic
│   │   ├── index.css
│   │   └── components/
│   │       ├── ExpenseForm.jsx
│   │       ├── ExpenseList.jsx
│   │       ├── ExpenseFilters.jsx
│   │       └── CategorySummary.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── render.yaml
├── vercel.json
└── README.md
```

---

## Running Locally

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Docs at http://localhost:8000/docs

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs at http://localhost:5173 — proxies API calls to localhost:8000.

**Tests:**
```bash
cd backend
pytest tests/ -v
```

---

## API

**POST /expenses** — Create expense. Body: `{ amount, category, description, date, idempotency_key }`. Returns 201.

**GET /expenses** — List expenses. Optional params: `category`, `sort=date_desc`. Returns 200.

**GET /health** — Returns `{"status": "ok"}`.
