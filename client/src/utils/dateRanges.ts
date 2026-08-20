/**
 * Date range presets for filtering transactions.
 *
 * Everything here works in the user's local timezone. Using `toISOString()`
 * would shift the date by a day for anyone behind or ahead of UTC, which is
 * exactly the kind of off-by-one that makes "This Month" quietly include the
 * last day of the previous one.
 */

export type DateRangePresetId =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'ytd'
  | 'last_year'
  | 'all_time'
  | 'custom';

export const DEFAULT_PRESET: DateRangePresetId = 'ytd';

export interface ResolvedRange {
  /** YYYY-MM-DD, or '' for an open-ended range. */
  startDate: string;
  endDate: string;
}

/** Format a Date as YYYY-MM-DD using local calendar parts. */
export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Parse YYYY-MM-DD as a local date. `new Date(str)` would treat it as UTC. */
export const fromISODate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // Rejects things like 2026-02-31, which JS would silently roll to March
  if (date.getMonth() !== Number(month) - 1) return null;
  return date;
};

const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

/**
 * Subtract whole months, clamping the day to the target month's length so
 * "3 months before May 31" lands on Feb 28 rather than rolling into March.
 */
const subtractMonths = (date: Date, months: number): Date => {
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastDay = endOfMonth(target).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
};

export interface DateRangePreset {
  id: DateRangePresetId;
  label: string;
  /** Custom and All Time have nothing to compute. */
  resolve?: (today: Date) => ResolvedRange;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: 'this_month',
    label: 'This Month',
    resolve: (today) => ({
      startDate: toISODate(startOfMonth(today)),
      endDate: toISODate(today),
    }),
  },
  {
    id: 'last_month',
    label: 'Last Month',
    resolve: (today) => {
      const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        startDate: toISODate(startOfMonth(previous)),
        endDate: toISODate(endOfMonth(previous)),
      };
    },
  },
  {
    id: 'last_3_months',
    label: 'Last 3 Months',
    resolve: (today) => {
      const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        startDate: toISODate(startOfMonth(subtractMonths(previous, 2))),
        endDate: toISODate(endOfMonth(previous)),
      };
    },
  },
  {
    id: 'last_6_months',
    label: 'Last 6 Months',
    resolve: (today) => {
      const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        startDate: toISODate(startOfMonth(subtractMonths(previous, 5))),
        endDate: toISODate(endOfMonth(previous)),
      };
    },
  },
  {
    id: 'ytd',
    label: 'Year to Date',
    resolve: (today) => ({
      startDate: toISODate(new Date(today.getFullYear(), 0, 1)),
      endDate: toISODate(today),
    }),
  },
  {
    id: 'last_year',
    label: 'Last Year',
    resolve: (today) => ({
      startDate: toISODate(new Date(today.getFullYear() - 1, 0, 1)),
      endDate: toISODate(new Date(today.getFullYear() - 1, 11, 31)),
    }),
  },
  {
    id: 'all_time',
    label: 'All Time',
    resolve: () => ({ startDate: '', endDate: '' }),
  },
  {
    id: 'custom',
    label: 'Custom',
  },
];

export const resolvePreset = (
  id: DateRangePresetId,
  today: Date = new Date()
): ResolvedRange => {
  const preset = DATE_RANGE_PRESETS.find((p) => p.id === id);
  if (!preset?.resolve) return { startDate: '', endDate: '' };
  return preset.resolve(today);
};

/** Human-readable summary of what's currently applied. */
export const describeRange = (startDate: string, endDate: string): string => {
  const format = (value: string): string => {
    const date = fromISODate(value);
    if (!date) return value;
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!startDate && !endDate) return 'All transactions';
  if (startDate && !endDate) return `${format(startDate)} onward`;
  if (!startDate && endDate) return `Up to ${format(endDate)}`;
  return `${format(startDate)} – ${format(endDate)}`;
};

/** True when the range is backwards and would always return nothing. */
export const isInvalidRange = (startDate: string, endDate: string): boolean =>
  Boolean(startDate && endDate && startDate > endDate);
