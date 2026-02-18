import { useState, useEffect, useCallback } from 'react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import ExpenseFilters from './components/ExpenseFilters';
import CategorySummary from './components/CategorySummary';
import { fetchExpenses, createExpense, ApiError } from './api';

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortByDate, setSortByDate] = useState(true);

  // Derive unique categories from loaded expenses for the filter dropdown
  const [allExpenses, setAllExpenses] = useState([]);
  const categories = [...new Set(allExpenses.map(e => e.category))].sort();

  /**
   * Load expenses from the API based on current filters.
   */
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (sortByDate) params.sort = 'date_desc';
      const data = await fetchExpenses(params);
      setExpenses(data);
    } catch (err) {
      setFetchError(err.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, sortByDate]);

  /**
   * Load ALL expenses (unfiltered) to build the category list.
   */
  const loadAllExpenses = useCallback(async () => {
    try {
      const data = await fetchExpenses();
      setAllExpenses(data);
    } catch {
      // Silently fail — category list will just be empty
    }
  }, []);

  // Fetch expenses when filters change
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Fetch all expenses on mount for category list
  useEffect(() => {
    loadAllExpenses();
  }, [loadAllExpenses]);

  /**
   * Handle new expense submission.
   * Returns true if successful (so the form can reset).
   */
  async function handleCreateExpense(expenseData) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createExpense(expenseData);
      // Refresh both filtered and all expenses
      await Promise.all([loadExpenses(), loadAllExpenses()]);
      return true;
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Failed to add expense. Please try again.';
      setSubmitError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>💰 Expense Tracker</h1>
        <p className="app-subtitle">Track your personal expenses</p>
      </header>

      <main className="app-main">
        <section className="form-section">
          <ExpenseForm
            onSubmit={handleCreateExpense}
            isSubmitting={isSubmitting}
          />
          {submitError && (
            <div className="error-banner submit-error">
              {submitError}
            </div>
          )}
        </section>

        <section className="list-section">
          <ExpenseFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortByDate={sortByDate}
            onSortChange={setSortByDate}
          />
          <ExpenseList
            expenses={expenses}
            isLoading={isLoading}
            error={fetchError}
          />
        </section>

        <section className="summary-section">
          <CategorySummary expenses={allExpenses} />
        </section>
      </main>

      <footer className="app-footer">
        <p>Expense Tracker &mdash; Built with FastAPI &amp; React</p>
      </footer>
    </div>
  );
}
