import React, { useState, useEffect } from 'react';
import { Category } from '../TransactionViewer/types';
import { API_BASE_URL } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';

interface Transaction {
  id: string | number;
  category: string;
  cad_amount: number;
  transaction_date: string;
  description_1: string;
  description_2?: string;
  account_type: string;
}

interface CategorySpendingChartProps {
  startDate?: string;
  endDate?: string;
  categories: Category[];
  onCategoryClick?: (category: string) => void;
}

interface CategoryTotal {
  category: string;
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
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

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

      const transactions: Transaction[] = (await response.json()).data;
      
      const expenses = transactions.filter(t => t.cad_amount < 0);
      
      // Group by category and sum
      const categoryMap = new Map<string, number>();
      expenses.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + Math.abs(transaction.cad_amount));
      });

      // Calculate totals and percentages
      const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
      
      const totals: CategoryTotal[] = Array.from(categoryMap.entries())
        .map(([category, amount], index) => ({
          category,
          total: amount,
          percentage: (amount / total) * 100,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.total - a.total);

      setCategoryTotals(totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

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
      
      const path = describeArc(100, 100, 80, startAngle, endAngle);
      currentAngle = endAngle;
      
      return {
        ...cat,
        path,
        isHovered: hoveredCategory === cat.category,
      };
    });
  };

  // Helper function to create SVG arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', x, y,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
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

  if (categoryTotals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No transactions found</div>
      </div>
    );
  }

  const slices = createPieSlices();
  const totalSpending = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Spending by Category</h2>
      
      <div className="flex flex-col gap-6">
        {/* Pie Chart */}
        <div className="flex justify-center">
          <div className="relative">
            <svg width="300" height="300" viewBox="0 0 200 200">
              {slices.map((slice) => (
                <path
                  key={slice.category}
                  d={slice.path}
                  fill={slice.color}
                  opacity={hoveredCategory && !slice.isHovered ? 0.5 : 1}
                  className="transition-opacity cursor-pointer hover:opacity-80"
                  onMouseEnter={() => setHoveredCategory(slice.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => handleCategoryClick(slice.category)}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-sm text-gray-500">Total</div>
                <div className="text-xl font-semibold">{formatCurrency(totalSpending)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full">
          <div className="space-y-1">
            {categoryTotals.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                onMouseEnter={() => setHoveredCategory(cat.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => handleCategoryClick(cat.category)}
                style={{
                  backgroundColor: hoveredCategory === cat.category ? '#F3F4F6' : 'transparent',
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {cat.category}
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
    </div>
  );
};