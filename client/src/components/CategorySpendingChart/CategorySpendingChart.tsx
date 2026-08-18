import React, { useState, useEffect, useMemo } from 'react';
import { Category } from '../TransactionViewer/types';
import { API_BASE_URL } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';

interface Transaction {
  id: string | number;
  category: Category;
  cad_amount: number;
  transaction_date: string;
  description_1: string;
  description_2?: string;
  account_type: string;
  is_reimbursed: boolean;
}

interface CategorySpendingChartProps {
  startDate?: string;
  endDate?: string;
  categories: Category[];
  onCategoryClick?: (category: string) => void;
}

interface CategoryTotal {
  category: Category;
  total: number;
  percentage: number;
  color: string;
}

const COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

export const CategorySpendingChart: React.FC<CategorySpendingChartProps> = ({
  startDate,
  endDate,
  categories,
  onCategoryClick,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [ignoreReimbursed, setIgnoreReimbursed] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `${API_BASE_URL}/transactions?category=All&transaction_type=debit&page=1&page_size=10000000`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      setTransactions((await response.json()).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived from the fetched rows rather than refetched, so toggling the
  // checkbox re-totals instantly without another round trip.
  const categoryTotals = useMemo<CategoryTotal[]>(() => {
    const expenses = transactions.filter(
      (t) => t.cad_amount < 0 && !(ignoreReimbursed && t.is_reimbursed)
    );

    // Group by category value, keeping the full Category object alongside the running total
    const categoryMap = new Map<string, { category: Category; total: number }>();
    expenses.forEach((transaction) => {
      const category = transaction.category;
      const existing = categoryMap.get(category.value);
      if (existing) {
        existing.total += Math.abs(transaction.cad_amount);
      } else {
        categoryMap.set(category.value, { category, total: Math.abs(transaction.cad_amount) });
      }
    });

    // Calculate totals and percentages
    const total = Array.from(categoryMap.values()).reduce((sum, entry) => sum + entry.total, 0);

    return Array.from(categoryMap.values())
      .map((entry) => ({
        category: entry.category,
        total: entry.total,
        percentage: total > 0 ? (entry.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      // Colour after sorting so the biggest slice is always blue, regardless
      // of which rows the filter removed
      .map((entry, index) => ({
        ...entry,
        color: COLORS[index % COLORS.length],
      }));
  }, [transactions, ignoreReimbursed]);

  const reimbursedCount = useMemo(
    () => transactions.filter((t) => t.cad_amount < 0 && t.is_reimbursed).length,
    [transactions]
  );

  const handleCategoryClick = (category: string) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
  };

  const createPieSlices = () => {
    let currentAngle = -90; // Start at top

    return categoryTotals.map((cat) => {
      const angle = (cat.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const path = describeDonutArc(100, 100, 50, 80, startAngle, endAngle);
      currentAngle = endAngle;

      return {
        ...cat,
        path,
        isHovered: hoveredCategory === cat.category.value,
      };
    });
  };

  // Helper function to create SVG donut arc path
  const describeDonutArc = (
    x: number, 
    y: number, 
    innerRadius: number, 
    outerRadius: number, 
    startAngle: number, 
    endAngle: number
  ) => {
    const outerStart = polarToCartesian(x, y, outerRadius, endAngle);
    const outerEnd = polarToCartesian(x, y, outerRadius, startAngle);
    const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', outerStart.x, outerStart.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
      'L', innerEnd.x, innerEnd.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const slices = createPieSlices();
  const totalSpending = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
  const isEmpty = categoryTotals.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold">Spending by Category</h2>

        <label
          className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none"
          title={
            reimbursedCount > 0
              ? `${reimbursedCount} reimbursed transaction${reimbursedCount === 1 ? '' : 's'} in this range`
              : 'No reimbursed transactions in this range'
          }
        >
          <input
            type="checkbox"
            checked={ignoreReimbursed}
            onChange={(e) => setIgnoreReimbursed(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          Ignore reimbursed
        </label>
      </div>

      {isEmpty ? (
        // Rendered inside the card, not as an early return, so the checkbox
        // above stays reachable when the filter hides everything
        <div className="flex items-center justify-center h-48 text-center text-gray-500">
          {ignoreReimbursed && reimbursedCount > 0
            ? 'Every transaction in this range is marked reimbursed.'
            : 'No transactions found'}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pie Chart */}
          <div className="flex justify-center">
            <div className="relative">
              <svg width="300" height="300" viewBox="0 0 200 200">
                {/* White background circle for center text */}
                <circle
                  cx="100"
                  cy="100"
                  r="48"
                  fill="white"
                  className="drop-shadow-sm"
                />
                {slices.map((slice) => (
                  <path
                    key={slice.category.value}
                    d={slice.path}
                    fill={slice.color}
                    opacity={hoveredCategory && !slice.isHovered ? 0.5 : 1}
                    className="transition-opacity cursor-pointer hover:opacity-80"
                    onMouseEnter={() => setHoveredCategory(slice.category.value)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => handleCategoryClick(slice.category.value)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-sm text-gray-600 font-medium">Total</div>
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(totalSpending)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full">
            <div className="space-y-1">
              {categoryTotals.map((cat) => (
                <div
                  key={cat.category.value}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                  onMouseEnter={() => setHoveredCategory(cat.category.value)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => handleCategoryClick(cat.category.value)}
                  style={{
                    backgroundColor: hoveredCategory === cat.category.value ? '#F3F4F6' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {cat.category.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                    <span className="text-sm text-gray-500">
                      {cat.percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm font-semibold text-gray-900 min-w-[90px] text-right">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
