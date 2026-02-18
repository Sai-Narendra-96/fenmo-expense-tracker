/**
 * ExpenseList — displays expenses in a table with total amount.
 * Handles empty state, loading state, and error state.
 */
export default function ExpenseList({ expenses, isLoading, error }) {
  if (error) {
    return (
      <div className="expense-list">
        <div className="error-banner">
          <p>Failed to load expenses: {error}</p>
          <p className="error-hint">Please check your connection and try refreshing.</p>
        </div>
      </div>
    );
  }

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="expense-list">
      <div className="list-header">
        <h2>Expenses</h2>
        <div className="total-badge">
          Total: <strong>₹{total.toFixed(2)}</strong>
        </div>
      </div>

      {isLoading && expenses.length === 0 ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <p>No expenses found.</p>
          <p className="empty-hint">Add your first expense using the form above.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td className="cell-date">{formatDate(expense.date)}</td>
                    <td>
                      <span className="category-tag">{expense.category}</span>
                    </td>
                    <td className="cell-description">
                      {expense.description || <span className="text-muted">—</span>}
                    </td>
                    <td className="text-right cell-amount">₹{expense.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
