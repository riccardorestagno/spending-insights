import React, { useMemo, useRef, useState } from 'react';
import { Category } from '../TransactionViewer/types';
import { useTransactions } from '../../hooks/useTransactions';
import { INSIGHT_VIEWS, DEFAULT_VIEW_ID } from './views';

interface InsightsPanelProps {
  categories: Category[];
  startDate?: string;
  endDate?: string;
  onCategoryClick?: (category: string) => void;
  /** Incremented by the parent after a CSV upload to force a refetch. */
  reloadKey?: number;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  categories,
  startDate,
  endDate,
  onCategoryClick,
  reloadKey = 0,
}) => {
  const [activeViewId, setActiveViewId] = useState<string>(DEFAULT_VIEW_ID);
  // Shared across views so the filter doesn't reset when switching tabs
  const [ignoreReimbursed, setIgnoreReimbursed] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { transactions, isLoading, error } = useTransactions(
    startDate,
    endDate,
    reloadKey
  );

  // Falls back to the first view if a registered view is ever removed
  const activeView =
    INSIGHT_VIEWS.find((view: any) => view.id === activeViewId) ?? INSIGHT_VIEWS[0];

  const reimbursedCount = useMemo(
    () => transactions.filter((t) => t.cad_amount < 0 && t.is_reimbursed).length,
    [transactions]
  );

  // Arrow keys move between tabs, which is what a tablist is expected to do
  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = INSIGHT_VIEWS[(index + offset + INSIGHT_VIEWS.length) % INSIGHT_VIEWS.length];

    setActiveViewId(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const ActiveComponent = activeView.Component;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="border-b border-gray-200 px-6 pt-4">
        <div role="tablist" aria-label="Spending views" className="flex gap-1 -mb-px">
          {INSIGHT_VIEWS.map((view, index) => {
            const isActive = view.id === activeView.id;
            return (
              <button
                key={view.id}
                ref={(node) => {
                  tabRefs.current[view.id] = node;
                }}
                role="tab"
                type="button"
                id={`insight-tab-${view.id}`}
                aria-selected={isActive}
                aria-controls={`insight-panel-${view.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveViewId(view.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {activeView.usesReimbursedFilter && (
          <label
            className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none mb-4"
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
        )}

        <div
          role="tabpanel"
          id={`insight-panel-${activeView.id}`}
          aria-labelledby={`insight-tab-${activeView.id}`}
        >
          <ActiveComponent
            transactions={transactions}
            isLoading={isLoading}
            error={error}
            ignoreReimbursed={ignoreReimbursed}
            categories={categories}
            onCategoryClick={onCategoryClick}
          />
        </div>
      </div>
    </div>
  );
};
