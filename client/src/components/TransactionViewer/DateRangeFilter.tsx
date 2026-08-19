import React from 'react';
import { DateRangeFilterProps } from './types';
import {
  DATE_RANGE_PRESETS,
  DateRangePresetId,
  describeRange,
  isInvalidRange,
} from '../../utils/dateRanges';

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}) => {
  const isCustom = preset === 'custom';
  const invalid = isInvalidRange(startDate, endDate);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Date Range
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range presets">
        {DATE_RANGE_PRESETS.map(({ id, label }) => {
          const isActive = preset === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onPresetChange(id as DateRangePresetId)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors
                ${isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isCustom ? (
        <div className="mt-3 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label
              htmlFor="custom-start-date"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              From
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={onStartDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex-1 w-full">
            <label
              htmlFor="custom-end-date"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              To
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={onEndDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      ) : (
        // Presets resolve to concrete dates, so show what's actually applied
        // rather than making the user infer what "Last 3 Months" means
        <p className="mt-2 text-sm text-gray-500">
          {describeRange(startDate, endDate)}
        </p>
      )}

      {invalid && (
        <p className="mt-2 text-sm text-red-600">
          The start date is after the end date, so no transactions will match.
        </p>
      )}
    </div>
  );
};
