import { useState } from 'react';

const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Shopping',
  'Bills & Utilities',
  'Health',
  'Education',
  'Other',
];

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

export default function ExpenseForm({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Please enter a valid positive amount';
    }
    if (!form.category) {
      newErrors.category = 'Please select a category';
    }
    if (!form.date) {
      newErrors.date = 'Please select a date';
    }
    return newErrors;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Generate idempotency key ONCE here so double-clicks reuse the same key
    const idempotencyKey = generateIdempotencyKey();

    const expense = {
      amount: parseFloat(parseFloat(form.amount).toFixed(2)),
      category: form.category,
      description: form.description.trim(),
      date: form.date,
    };

    const success = await onSubmit(expense, idempotencyKey);
    if (success) {
      setForm({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setErrors({});
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form" noValidate>
      <h2>Add Expense</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount">Amount (₹) *</label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
            className={errors.amount ? 'input-error' : ''}
            disabled={isSubmitting}
          />
          {errors.amount && <span className="error-text">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className={errors.category ? 'input-error' : ''}
            disabled={isSubmitting}
          >
            <option value="">Select category</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <span className="error-text">{errors.category}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            id="date"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            className={errors.date ? 'input-error' : ''}
            disabled={isSubmitting}
          />
          {errors.date && <span className="error-text">{errors.date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            name="description"
            type="text"
            placeholder="What was this expense for?"
            maxLength={500}
            value={form.description}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  );
}
