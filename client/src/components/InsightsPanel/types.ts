import React from 'react';
import { Category, Transaction } from '../TransactionViewer/types';

/**
 * Every view in the panel receives the same props, so adding a view means
 * writing a component against this interface and registering it — no changes
 * to the panel itself.
 */
export interface InsightViewProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  /** Whether reimbursed transactions should be excluded from totals. */
  ignoreReimbursed: boolean;
  categories: Category[];
  onCategoryClick?: (category: string) => void;
}

export interface InsightView {
  id: string;
  label: string;
  /**
   * Views that respect the reimbursed filter get the shared toggle rendered
   * above them. Views where it's meaningless can leave this off.
   */
  usesReimbursedFilter?: boolean;
  Component: React.FC<InsightViewProps>;
}
