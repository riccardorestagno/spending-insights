import { useEffect, useState } from 'react';
import { Transaction } from '../components/TransactionViewer/types';
import { API_BASE_URL } from '../utils/constants';

interface UseTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches the transactions backing the insight panel.
 *
 * Lives above the individual views so switching tabs re-renders from data
 * already in memory instead of firing another request per view.
 *
 * Scoped to one profile: passing null (no profile selected yet) skips the
 * request entirely rather than charting everyone's spending at once.
 */
export const useTransactions = (
  startDate?: string,
  endDate?: string,
  reloadKey = 0,
  profileId: number | null = null
): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileId === null) {
      setTransactions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let url = `${API_BASE_URL}/transactions?profile_id=${profileId}&category=All&transaction_type=debit&page=1&page_size=10000000`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;

        const response = await fetch(url, { signal: controller.signal });

        // An empty profile comes back as a 404; the charts should render
        // their own empty state rather than an error.
        if (response.status === 404) {
          setTransactions([]);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        setTransactions((await response.json()).data);
      } catch (err) {
        // A superseded request isn't a failure; leave state for the newer one
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setTransactions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchTransactions();

    // Cancels the previous request when the range changes, so a slow reply
    // can't land after a newer one and overwrite it
    return () => controller.abort();
  }, [startDate, endDate, reloadKey, profileId]);

  return { transactions, isLoading, error };
};
