import { Transaction } from '../components/TransactionViewer/types';

export interface MonthlyBucket {
  /** YYYY-MM */
  key: string;
  /** Short month name, e.g. 'Jan' */
  label: string;
  year: number;
  /** 1-12 */
  month: number;
  total: number;
  count: number;
}

export interface MonthlySummary {
  total: number;
  average: number;
  highest: MonthlyBucket | null;
  lowest: MonthlyBucket | null;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Read the YYYY-MM prefix directly — parsing to a Date would risk a timezone shift. */
const monthKey = (transactionDate: string): string | null => {
  const match = /^(\d{4})-(\d{2})/.exec(transactionDate);
  if (!match) return null;

  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return `${match[1]}-${match[2]}`;
};

const makeBucket = (key: string): MonthlyBucket => {
  const [year, month] = key.split('-').map(Number);
  return {
    key,
    label: MONTH_LABELS[month - 1],
    year,
    month,
    total: 0,
    count: 0,
  };
};

/** Every month from first to last, so gaps show as zero instead of collapsing. */
const monthsBetween = (firstKey: string, lastKey: string): string[] => {
  const [startYear, startMonth] = firstKey.split('-').map(Number);
  const [endYear, endMonth] = lastKey.split('-').map(Number);

  const keys: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return keys;
};

/**
 * Total spending per calendar month, oldest first.
 *
 * Only debits count — credits would otherwise cancel out spending and make a
 * month with a large refund look artificially cheap.
 */
export const buildMonthlySeries = (
  transactions: Transaction[],
  ignoreReimbursed = false
): MonthlyBucket[] => {
  const buckets = new Map<string, MonthlyBucket>();
  // Spanned months come from the unfiltered debits so that hiding reimbursed
  // rows zeroes a bar rather than shortening the axis and shifting every
  // other bar sideways
  const spannedKeys: string[] = [];

  transactions.forEach((transaction) => {
    if (transaction.cad_amount >= 0) return;

    const key = monthKey(transaction.transaction_date);
    if (!key) return;

    spannedKeys.push(key);

    if (ignoreReimbursed && transaction.is_reimbursed) return;

    const bucket = buckets.get(key) ?? makeBucket(key);
    bucket.total += Math.abs(transaction.cad_amount);
    bucket.count += 1;
    buckets.set(key, bucket);
  });

  if (spannedKeys.length === 0) return [];

  spannedKeys.sort();
  const firstKey = spannedKeys[0];
  const lastKey = spannedKeys[spannedKeys.length - 1];

  return monthsBetween(firstKey, lastKey).map(
    (key) => buckets.get(key) ?? makeBucket(key)
  );
};

export const summarizeMonthly = (buckets: MonthlyBucket[]): MonthlySummary => {
  if (buckets.length === 0) {
    return { total: 0, average: 0, highest: null, lowest: null };
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);

  // Empty months are real information about a range, so they stay in the
  // average rather than being filtered out
  const highest = buckets.reduce((a, b) => (b.total > a.total ? b : a));
  const lowest = buckets.reduce((a, b) => (b.total < a.total ? b : a));

  return {
    total,
    average: total / buckets.length,
    highest,
    lowest,
  };
};

/** Month-over-month change as a percentage, or null when there's no basis. */
export const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
};
