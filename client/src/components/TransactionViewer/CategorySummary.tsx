import React from 'react';
import { CategorySummaryProps } from './types';
import { formatCurrency } from '../../utils/formatters';

export const CategorySummary: React.FC<CategorySummaryProps> = ({ metadata }) => {
  if (!metadata) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{metadata.total_items}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Category Total</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(metadata.category_total)}
          </p>
        </div>
      </div>
    </div>
  );
};