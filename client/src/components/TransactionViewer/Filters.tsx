import React from 'react';
import { FilterProps } from './types';
import { formatCurrency } from '../../utils/formatters';
import { CategorySummary } from './CategorySummary';

export const Filters: React.FC<FilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  pageSize,
  onPageSizeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDates,
  metadata
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <div className="flex flex-col gap-4">
      {/* Category and Page Size Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Category
          </label>
          <select
            value={selectedCategory}
            onChange={onCategoryChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name} ({cat.transaction_count} transactions - {formatCurrency(cat.total)})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-32">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Per Page
          </label>
          <select
            value={pageSize}
            onChange={onPageSizeChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Date Range Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={onStartDateChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={onEndDateChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {(startDate || endDate) && (
          <button
            onClick={onClearDates}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
          >
            Clear Dates
          </button>
        )}
      </div>
    </div>

    <CategorySummary metadata={metadata} />
  </div>
);