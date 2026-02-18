/**
 * API client for the Expense Tracker backend.
 *
 * Key production features:
 * - Idempotency keys on POST requests to safely handle retries
 * - Automatic retry with exponential backoff for transient failures
 * - Structured error handling
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Generate a unique idempotency key for POST requests.
 * Uses crypto.randomUUID() where available, with a fallback.
 */
function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an API request with retry logic.
 * Retries up to `maxRetries` times with exponential backoff for network errors and 5xx responses.
 */
async function apiRequest(url, options = {}, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (response.ok) {
        return await response.json();
      }

      // Don't retry client errors (4xx) — only server errors (5xx)
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.detail || `Request failed with status ${response.status}`,
          response.status
        );
      }

      // Server error — will retry
      lastError = new ApiError(`Server error: ${response.status}`, response.status);
    } catch (err) {
      if (err instanceof ApiError && err.status < 500) {
        throw err; // Don't retry client errors
      }
      lastError = err;
    }

    // Exponential backoff before retry
    if (attempt < maxRetries) {
      await sleep(Math.min(1000 * Math.pow(2, attempt), 5000));
    }
  }

  throw lastError;
}

/**
 * Custom error class for API errors with status codes.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Create a new expense.
 * Includes an idempotency key so retries won't create duplicates.
 */
export async function createExpense(expense, idempotencyKey = null) {
  return apiRequest('/expenses', {
    method: 'POST',
    body: JSON.stringify({
      ...expense,
      idempotency_key: idempotencyKey || generateIdempotencyKey(),
    }),
  });
}

/**
 * Fetch expenses with optional filters.
 * @param {Object} params - { category?: string, sort?: 'date_desc' }
 */
export async function fetchExpenses(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.sort) searchParams.set('sort', params.sort);

  const queryString = searchParams.toString();
  const url = `/expenses${queryString ? `?${queryString}` : ''}`;

  return apiRequest(url);
}
