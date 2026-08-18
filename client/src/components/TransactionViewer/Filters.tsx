import React from 'react';
import { FilterProps, TransactionType } from './types';
import { formatCurrency } from '../../utils/formatters';
import { CategorySummary } from './CategorySummary';
import { DateRangeFilter } from './DateRangeFilter';

export const Filters: React.FC<FilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  pageSize,
  onPageSizeChange,
  startDate,
  endDate,
  datePreset,
  onDatePresetChange,
  onStartDateChange,
  onEndDateChange,
  transactionType,
  onTransactionTypeChange,
  metadata
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <div className="flex flex-col gap-4">
      {/* Transaction Type Toggle */}
      <div>
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
          {Object.values(TransactionType).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onTransactionTypeChange(type)}
              className={`px-4 py-2 text-sm font-medium capitalize
              ${transactionType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
            `}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Row */}
      <DateRangeFilter
        preset={datePreset}
        startDate={startDate}
        endDate={endDate}
        onPresetChange={onDatePresetChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

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
              <option key={cat.value} value={cat.value}>
                {cat.description} ({cat.transaction_count} transactions - {formatCurrency(cat.total)})
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

    </div>

    <CategorySummary metadata={metadata} />
  </div>
);            