/**
 * ExpenseFilters — controls for filtering by category and sorting.
 */
export default function ExpenseFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  sortByDate,
  onSortChange,
}) {
  return (
    <div className="expense-filters">
      <div className="filter-group">
        <label htmlFor="filter-category">Filter by category:</label>
        <select
          id="filter-category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>
          <input
            type="checkbox"
            checked={sortByDate}
            onChange={(e) => onSortChange(e.target.checked)}
          />
          Sort by date (newest first)
        </label>
      </div>
    </div>
  );
}
