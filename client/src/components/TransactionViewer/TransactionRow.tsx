import React, { useState } from 'react';
import { TransactionRowProps, Category } from './types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { API_BASE_URL } from '../../utils/constants';

interface EditableTransactionRowProps extends TransactionRowProps {
  categories: Category[];
  onCategoryUpdate?: (transactionId: string | number, newCategory: string) => void;
}

export const TransactionRow: React.FC<EditableTransactionRowProps> = ({ 
  transaction, 
  categories,
  onCategoryUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(transaction.category);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryClick = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (newCategory === transaction.category) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/${transaction.id}/category?category=${encodeURIComponent(newCategory)}`,
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
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      setSelectedCategory(transaction.category);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBlur = () => {
    if (!isUpdating) {
      setIsEditing(false);
      setSelectedCategory(transaction.category);
      setError(null);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(transaction.transaction_date)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="font-medium">{transaction.description_1}</div>
        {transaction.description_2 && (
          <div className="text-gray-500 text-xs">{transaction.description_2}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {transaction.account_type}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {isEditing ? (
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              onBlur={handleBlur}
              disabled={isUpdating}
              autoFocus
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {error && (
              <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap">
                {error}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleCategoryClick}
            className="text-left hover:text-blue-600 hover:underline focus:outline-none focus:text-blue-600"
          >
            {selectedCategory}
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
        <span className={transaction.cad_amount < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {formatCurrency(transaction.cad_amount)}
        </span>
      </td>
    </tr>
  );
};