import { InsightView } from './types';
import { CategorySpendingChart } from '../CategorySpendingChart/CategorySpendingChart';
import { MonthlyTrendChart } from '../MonthlyTrendChart/MonthlyTrendChart';

/**
 * The panel's tabs are generated from this list, in order.
 *
 * To add a view: write a component taking InsightViewProps and add an entry.
 * Nothing else needs to change.
 */
export const INSIGHT_VIEWS: InsightView[] = [
  {
    id: 'categories',
    label: 'Categories',
    usesReimbursedFilter: true,
    Component: CategorySpendingChart,
  },
  {
    id: 'trend',
    label: 'Monthly Trend',
    usesReimbursedFilter: true,
    Component: MonthlyTrendChart,
  },
];

export const DEFAULT_VIEW_ID = INSIGHT_VIEWS[0].id;
