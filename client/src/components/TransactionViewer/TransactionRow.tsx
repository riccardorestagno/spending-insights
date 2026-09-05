import React, { useState, useEffect } from 'react';
import { TransactionRowProps, Category } from './types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { API_BASE_URL } from '../../utils/constants';
import { TransactionComment } from './TransactionComment';

interface EditableTransactionRowProps extends TransactionRowProps {
  categories: Category[];
  isEditMode: boolean;
  onCategoryUpdate?: (transactionId: string | number, newCategory: Category) => void;
  onReimbursedUpdate?: (transactionId: string | number, isReimbursed: boolean) => void;
  onCommentChange?: (transactionId: string | number, comment: string | null) => void;
}

export const TransactionRow: React.FC<EditableTransactionRowProps> = ({ 
  transaction, 
  categories,
  isEditMode,
  onCategoryUpdate,
  onReimbursedUpdate,
  onCommentChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(transaction.category);
  const [isReimbursed, setIsReimbursed] = useState<boolean>(transaction.is_reimbursed);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTogglingReimbursed, setIsTogglingReimbursed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reimbursedError, setReimbursedError] = useState<string | null>(null);
  // Scoped to the description cell alone, so the note control only reveals
  // when the pointer is over the description — not anywhere else in the row.
  const [isDescriptionHovered, setIsDescriptionHovered] = useState(false);

  // React reuses this component when a row keeps its id across a refetch, so
  // local state has to follow the props or a reload shows stale values.
  useEffect(() => {
    setSelectedCategory(transaction.category);
    setIsReimbursed(transaction.is_reimbursed);
  }, [transaction.id, transaction.category, transaction.is_reimbursed]);

  const handleReimbursedToggle = async (nextValue: boolean) => {
    // Update immediately, then roll back if the server rejects it
    setIsReimbursed(nextValue);
    setIsTogglingReimbursed(true);
    setReimbursedError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/${transaction.id}/reimbursed?is_reimbursed=${nextValue}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      onReimbursedUpdate?.(transaction.id, nextValue);
    } catch (err) {
      setIsReimbursed(!nextValue);
      setReimbursedError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsTogglingReimbursed(false);
    }
  };

  const handleCategoryChange = async (newCategory: Category) => {
    if (newCategory.value === transaction.category.value) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/${transaction.id}/category?category=${encodeURIComponent(newCategory.value)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      setSelectedCategory(newCategory);
      if (onCategoryUpdate) {
        onCategoryUpdate(transaction.id, newCategory);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      setSelectedCategory(transaction.category);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = categories.find((cat) => cat.value === e.target.value);
    if (newCategory) {
      handleCategoryChange(newCategory);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(transaction.transaction_date)}
      </td>
      <td
        className="relative px-6 py-4 text-sm text-gray-900"
        // Hover lives on the cell itself now that the control is anchored to
        // the cell's edge rather than the text — so it also reveals if the
        // pointer is over the reserved space to the right of a short
        // description, not just the text itself.
        onMouseEnter={() => setIsDescriptionHovered(true)}
        onMouseLeave={() => setIsDescriptionHovered(false)}
      >
        <div className="max-w-full pr-6">
          <div className="font-medium">{transaction.description_1}</div>
          {transaction.description_2 && (
            <div className="text-gray-500 text-xs">{transaction.description_2}</div>
          )}
        </div>
        {/* TransactionComment marks its anchor at this cell's right edge
            (via its own absolutely-positioned, zero-size marker) but
            portals the actual visible control to document.body — so
            nothing it renders lives inside this table's overflow-x-auto
            wrapper, and it can't affect that wrapper's scrollable width
            no matter how it's positioned. */}
        <TransactionComment
          transactionId={transaction.id}
          description={transaction.description_1}
          comment={transaction.comment ?? null}
          isHovered={isDescriptionHovered}
          onCommentChange={onCommentChange}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {transaction.account_type}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {isEditMode ? (
          <div className="relative">
            <select
              value={selectedCategory.value}
              onChange={handleSelectChange}
              disabled={isUpdating}
              className="block w-full rounded border-gray-300 text-sm text-gray-500 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {categories
                .filter((cat) => cat.value.toLowerCase() !== 'all')
                .map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.description}
                  </option>
                ))}
            </select>
            {error && (
              <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap bg-red-50 px-2 py-1 rounded shadow-sm z-10">
                {error}
              </div>
            )}
          </div>
        ) : (
          selectedCategory.description
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={isReimbursed}
            onChange={(e) => handleReimbursedToggle(e.target.checked)}
            disabled={isTogglingReimbursed}
            aria-label={`Mark ${transaction.description_1} as reimbursed`}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          />
          {reimbursedError && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs text-red-600 whitespace-nowrap bg-red-50 px-2 py-1 rounded shadow-sm z-10">
              {reimbursedError}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
        <span className={transaction.cad_amount < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {formatCurrency(transaction.cad_amount)}
        </span>
      </td>
    </tr>
  );
};