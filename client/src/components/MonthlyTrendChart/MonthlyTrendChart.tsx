import React, { useMemo, useState } from 'react';
import { InsightViewProps } from '../InsightsPanel/types';
import { formatCurrency } from '../../utils/formatters';
import {
  buildMonthlySeries,
  percentChange,
  summarizeMonthly,
} from '../../utils/monthlyTrend';

const CHART_HEIGHT = 180;
const BAR_GAP = 6;
const MIN_BAR_WIDTH = 14;
const COMPACT_THRESHOLD = 6;
const COMPACT_ROW_HEIGHT = 24;

export const MonthlyTrendChart: React.FC<InsightViewProps> = ({
  transactions,
  isLoading,
  error,
  ignoreReimbursed,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const buckets = useMemo(
    () => buildMonthlySeries(transactions, ignoreReimbursed),
    [transactions, ignoreReimbursed]
  );

  const summary = useMemo(() => summarizeMonthly(buckets), [buckets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Loading trend...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-600">
        Error: {error}
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-center text-gray-500">
        {ignoreReimbursed
          ? 'No unreimbursed spending in this range.'
          : 'No spending in this range.'}
      </div>
    );
  }

  const isCompact = buckets.length < COMPACT_THRESHOLD;

  const maxTotal = Math.max(...buckets.map((bucket) => bucket.total));
  const barWidth = Math.max(MIN_BAR_WIDTH, 40 - buckets.length);
  const chartWidth = buckets.length * (barWidth + BAR_GAP);
  const averageY =
    maxTotal > 0 ? CHART_HEIGHT - (summary.average / maxTotal) * CHART_HEIGHT : CHART_HEIGHT;

  // With many months, printing every label turns the axis into mush
  const labelInterval = buckets.length > 12 ? Math.ceil(buckets.length / 12) : 1;

  const hovered = buckets.find((bucket) => bucket.key === hoveredKey) ?? null;
  const hoveredIndex = hovered ? buckets.indexOf(hovered) : -1;
  const previous = hoveredIndex > 0 ? buckets[hoveredIndex - 1] : null;
  const change = hovered && previous ? percentChange(hovered.total, previous.total) : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Monthly average</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(summary.average)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Highest month</p>
          <p className="text-lg font-semibold text-gray-900">
            {summary.highest ? formatCurrency(summary.highest.total) : '—'}
          </p>
          {summary.highest && (
            <p className="text-xs text-gray-500">
              {summary.highest.label} {summary.highest.year}
            </p>
          )}
        </div>
      </div>

      {isCompact ? (
        // Few months: horizontal bars read easier than a squat vertical chart
        // and let every label show in full without interval-skipping.
        <div className="space-y-2">
          {buckets.map((bucket) => {
            const widthPct = maxTotal > 0 ? (bucket.total / maxTotal) * 100 : 0;
            const isHovered = hoveredKey === bucket.key;
            const isEmpty = bucket.total === 0;

            return (
              <div
                key={bucket.key}
                className="flex items-center gap-3"
                onMouseEnter={() => setHoveredKey(bucket.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <span className="w-16 shrink-0 text-xs text-gray-600 text-right">
                  {bucket.label} {bucket.year}
                </span>
                <div
                  className="flex-1 bg-gray-100 rounded overflow-hidden"
                  style={{ height: COMPACT_ROW_HEIGHT }}
                >
                  <div
                    className="h-full rounded transition-colors"
                    style={{
                      width: isEmpty ? '2px' : `${widthPct}%`,
                      backgroundColor: isEmpty
                        ? '#E5E7EB'
                        : isHovered
                          ? '#1D4ED8'
                          : '#3B82F6',
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 text-xs font-medium text-gray-900 text-right">
                  {formatCurrency(bucket.total)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            width="100%"
            viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 28}`}
            preserveAspectRatio="xMidYMax meet"
            role="img"
            aria-label={`Monthly spending from ${buckets[0].label} ${buckets[0].year} to ${buckets[buckets.length - 1].label} ${buckets[buckets.length - 1].year}`}
            style={{ minWidth: chartWidth > 380 ? chartWidth : undefined }}
          >
            {summary.average > 0 && (
              <line
                x1="0"
                y1={averageY}
                x2={chartWidth}
                y2={averageY}
                stroke="#9CA3AF"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {buckets.map((bucket, index) => {
              const height = maxTotal > 0 ? (bucket.total / maxTotal) * CHART_HEIGHT : 0;
              const x = index * (barWidth + BAR_GAP);
              const isHovered = hoveredKey === bucket.key;
              const isEmpty = bucket.total === 0;

              return (
                <g key={bucket.key}>
                  {/* Full-height hit area so thin or empty bars stay hoverable */}
                  <rect
                    x={x}
                    y={0}
                    width={barWidth + BAR_GAP}
                    height={CHART_HEIGHT + 28}
                    fill="transparent"
                    onMouseEnter={() => setHoveredKey(bucket.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                  <rect
                    x={x}
                    y={CHART_HEIGHT - height}
                    width={barWidth}
                    height={isEmpty ? 1 : height}
                    rx="2"
                    fill={isEmpty ? '#E5E7EB' : isHovered ? '#1D4ED8' : '#3B82F6'}
                    className="transition-colors pointer-events-none"
                  />
                  {index % labelInterval === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={CHART_HEIGHT + 14}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6B7280"
                      className="pointer-events-none"
                    >
                      {bucket.label}
                    </text>
                  )}
                  {/* Year marker only when it changes, to avoid repeating it */}
                  {(index === 0 || bucket.month === 1) && (
                    <text
                      x={x + barWidth / 2}
                      y={CHART_HEIGHT + 25}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#9CA3AF"
                      className="pointer-events-none"
                    >
                      {bucket.year}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="mt-3 min-h-[52px]">
        {hovered ? (
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-900">
                {hovered.label} {hovered.year}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(hovered.total)}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs text-gray-500">
                {hovered.count} transaction{hovered.count === 1 ? '' : 's'}
              </span>
              {change !== null && (
                <span
                  className={`text-xs font-medium ${change > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                >
                  {change > 0 ? '+' : ''}
                  {change.toFixed(1)}% vs {previous?.label}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center pt-3">
            {isCompact
              ? `Average is ${formatCurrency(summary.average)}/month. Hover a bar for detail.`
              : `Dashed line marks the ${formatCurrency(
                summary.average
              )} monthly average. Hover a bar for detail.`}
          </p>
        )}
      </div>
    </div>
  );
};