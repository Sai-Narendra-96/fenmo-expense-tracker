# 💰 Expense Tracker

A minimal, full-stack personal expense tracking application built with **FastAPI** (Python) and **React** (Vite).

> **Live App**: [https://expense-tracker-surya.vercel.app](https://expense-tracker-surya.vercel.app)  
> **API**: [https://expense-tracker-api-xxxx.onrender.com](https://expense-tracker-api-xxxx.onrender.com/health)

---

## Features

- **Add expenses** with amount, category, description, and date
- **View all expenses** in a clean, responsive table
- **Filter by category** to focus on specific spending areas
- **Sort by date** (newest first) for chronological review
- **Total amount** displayed dynamically based on current filters
- **Category breakdown** summary showing spending per category
- **Idempotent submissions** — safe to retry on network failures or double-clicks
- **Input validation** on both client and server
- **Loading and error states** throughout the UI

---

## Tech Stack

| Layer      | Technology         | Why                                                       |
|------------|--------------------|-----------------------------------------------------------|
| Backend    | FastAPI (Python)   | Fast, modern, automatic OpenAPI docs, Pydantic validation |
| Database   | SQLite             | Zero-config, ACID-compliant, ideal for single-server personal tools |
| Frontend   | React + Vite       | Fast dev experience, component-based, widely understood   |
| Deployment | Render + Vercel    | Free tier, simple setup, reliable for small apps          |

---

## Key Design Decisions

### 1. Money as Integer Cents (Paise)
Amounts are stored as **integer cents** (paise) in the database to avoid floating-point precision errors that plague money calculations. The API accepts and returns human-readable decimal values (e.g., `150.50`) but converts internally.

### 2. Idempotency for Safe Retries
Every `POST /expenses` request can include an `idempotency_key`. If the same key is sent twice (e.g., due to a network retry or double-click), the server returns the original response instead of creating a duplicate. This is critical for a tool used in real-world conditions with unreliable networks.

### 3. SQLite for Persistence
SQLite is the right tool for a personal finance application:
- No external service to configure or maintain
- ACID-compliant transactions out of the box
- WAL mode enabled for better concurrent read performance
- Easily portable — the entire database is a single file
- More than sufficient for personal expense tracking volumes

### 4. Server-Side Filtering & Sorting
Filtering and sorting happen on the backend via query parameters rather than purely client-side. This keeps the API contract clean and would scale naturally if the dataset grew beyond what's comfortable to load entirely in the browser.

### 5. Client-Side Retry with Backoff
The frontend API client includes automatic retry logic with exponential backoff for transient failures (5xx errors, network timeouts). Client errors (4xx) are not retried.

---

## Trade-offs (Due to Timebox)

- **No authentication**: This is a personal tool; auth would be the first addition for multi-user support.
- **No pagination**: With a personal expense tracker, the dataset is typically manageable. For larger datasets, cursor-based pagination would be added.
- **No edit/delete**: Focused on the core acceptance criteria. PATCH and DELETE endpoints would follow the same patterns.
- **SQLite on Render**: SQLite works well with Render's persistent disk, but for a multi-instance deployment, PostgreSQL would be the right choice.
- **Basic styling**: Kept intentionally simple and functional per the assignment guidance. No CSS framework — just clean, hand-written CSS.

---

## What I Intentionally Did Not Do

- **Over-engineer the frontend**: No state management library (Redux, Zustand) — React's `useState` and `useEffect` are sufficient for this scope.
- **Add a CSS framework**: Tailwind or Bootstrap would add build complexity for minimal benefit at this scale.
- **Server-side rendering**: Not needed for a personal tool — a simple SPA is the right fit.
- **Complex category management**: Categories are predefined in the frontend dropdown. A full CRUD for categories would be a future enhancement.

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── main.py              # FastAPI app with endpoints
│   ├── database.py          # SQLite connection and schema
│   ├── schemas.py           # Pydantic validation models
│   ├── requirements.txt     # Python dependencies
│   └── tests/
│       └── test_api.py      # API integration tests
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx           # Main app component
│       ├── api.js            # API client with retry logic
│       ├── index.css         # Styles
│       ├── main.jsx          # Entry point
│       └── components/
│           ├── ExpenseForm.jsx
│           ├── ExpenseList.jsx
│           ├── ExpenseFilters.jsx
│           └── CategorySummary.jsx
├── render.yaml              # Render deployment config
├── .gitignore
└── README.md
```

---

## Running Locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at: `http://localhost:5173`

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

### Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## API Reference

### `POST /expenses`

Create a new expense.

**Request Body:**
```json
{
  "amount": 150.50,
  "category": "Food",
  "description": "Lunch at cafeteria",
  "date": "2025-02-17",
  "idempotency_key": "optional-unique-key"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "amount": 150.50,
  "category": "Food",
  "description": "Lunch at cafeteria",
  "date": "2025-02-17",
  "created_at": "2025-02-17T10:30:00"
}
```

### `GET /expenses`

List expenses with optional filters.

**Query Parameters:**
- `category` — Filter by exact category match
- `sort=date_desc` — Sort by date, newest first

**Response (200):** Array of expense objects.

### `GET /health`

Health check. Returns `{"status": "ok"}`.
