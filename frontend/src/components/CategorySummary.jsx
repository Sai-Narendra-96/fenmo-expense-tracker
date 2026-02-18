/**
 * CategorySummary — displays a breakdown of spending per category.
 * This is a "nice-to-have" feature showing total per category.
 */
export default function CategorySummary({ expenses }) {
  if (expenses.length === 0) return null;

  const byCategory = {};
  expenses.forEach(exp => {
    if (!byCategory[exp.category]) {
      byCategory[exp.category] = { total: 0, count: 0 };
    }
    byCategory[exp.category].total += exp.amount;
    byCategory[exp.category].count += 1;
  });

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="category-summary">
      <h3>Category Breakdown</h3>
      <div className="summary-bars">
        {sorted.map(([category, { total, count }]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div key={category} className="summary-row">
              <div className="summary-label">
                <span className="category-tag">{category}</span>
                <span className="summary-count">{count} expense{count !== 1 ? 's' : ''}</span>
              </div>
              <div className="summary-bar-track">
                <div
                  className="summary-bar-fill"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="summary-amount">₹{total.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
