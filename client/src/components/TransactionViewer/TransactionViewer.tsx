import React, { useState, useEffect } from 'react';
import { Transaction, Category, Metadata, TransactionType, SortOrder } from './types';
import { API_BASE_URL } from '../../utils/constants';
import { useProfileContext } from '../../contexts/ProfileContext';
import { Header } from './Header';
import { Filters } from './Filters';
import { TransactionsTable } from './TransactionsTable';
import {
  DEFAULT_PRESET,
  DateRangePresetId,
  resolvePreset,
} from '../../utils/dateRanges';

interface TransactionViewerProps {
  onDateRangeChange?: (range: { startDate?: string; endDate?: string }) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  /** Incremented by the parent to force a refetch (e.g. after a CSV upload). */
  reloadKey?: number;
  /** Called after a CSV upload so the parent can refresh its own state. */
  onDataReloaded?: () => void;
}

export default function TransactionViewer({ 
  onDateRangeChange,
  selectedCategory: externalSelectedCategory,
  onCategoryChange,
  reloadKey = 0,
  onDataReloaded
}: TransactionViewerProps) {
  // Every request below is scoped to this profile, so the viewer only ever
  // shows one person's transactions at a time.
  const {
    activeProfileId,
    isLoading: profilesLoading,
    isEmpty: noProfiles,
  } = useProfileContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.Debit);
  const [datePreset, setDatePreset] = useState<DateRangePresetId>(DEFAULT_PRESET);
  // Seeded from the default preset so the app opens on a sensible range
  const [startDate, setStartDate] = useState<string>(
    () => resolvePreset(DEFAULT_PRESET).startDate
  );
  const [endDate, setEndDate] = useState<string>(
    () => resolvePreset(DEFAULT_PRESET).endDate
  );
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.Descending);

  useEffect(() => {
    if (externalSelectedCategory && externalSelectedCategory !== selectedCategory) {
      setSelectedCategory(externalSelectedCategory);
      setCurrentPage(1);
    }
  }, [externalSelectedCategory]);

  // A different profile has a different set of categories and a different
  // number of pages, so neither selection survives the switch.
  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategory('');
    setError(null);
  }, [activeProfileId]);

  useEffect(() => {
    if (activeProfileId === null) {
      setCategories([]);
      return;
    }
    fetchCategories();
  }, [transactionType, startDate, endDate, reloadKey, activeProfileId]);

  useEffect(() => {
    if (activeProfileId === null) {
      setTransactions([]);
      setMetadata(null);
      setLoading(false);
      return;
    }
    fetchTransactions();
  }, [transactionType, selectedCategory, currentPage, pageSize, startDate, endDate, sortBy, sortOrder, reloadKey, activeProfileId]);

  useEffect(() => {
    if (onDateRangeChange) {
      onDateRangeChange({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    }
  }, [startDate, endDate, onDateRangeChange]);

  const fetchCategories = async () => {
    try {
      let url = `${API_BASE_URL}/categories?transaction_type=${encodeURIComponent(transactionType)}&profile_id=${activeProfileId}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories);
      
      // Only set default category if there's no external selection
      if (data.categories.length > 0 && !selectedCategory && !externalSelectedCategory) {
        const defaultCategory = data.categories[0].value;
        setSelectedCategory(defaultCategory);
        if (onCategoryChange) {
          onCategoryChange(defaultCategory);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/transactions?profile_id=${activeProfileId}&transaction_type=${encodeURIComponent(transactionType)}&category=${encodeURIComponent(selectedCategory)}&page=${currentPage}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const response = await fetch(url);

      // A profile with nothing in it yet is an empty table, not a failure —
      // the API reports "no matches" as a 404.
      if (response.status === 404) {
        setTransactions([]);
        setMetadata(null);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data.data);
      setMetadata(data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTransactions([]);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    setSelectedCategory('');
    setCurrentPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    setCurrentPage(1);
    
    if (onCategoryChange) {
      onCategoryChange(newCategory);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleDatePresetChange = (preset: DateRangePresetId) => {
    setDatePreset(preset);
    setCurrentPage(1);

    // Custom keeps whichever dates are already showing, so switching to it
    // starts from the range the user was just looking at instead of blank
    if (preset === 'custom') return;

    const { startDate: start, endDate: end } = resolvePreset(preset);
    setStartDate(start);
    setEndDate(end);
  };

  const handleDateChange = () => {
    // Editing a date by hand only happens in custom mode, but keep the preset
    // honest in case that ever changes
    setDatePreset('custom');
    setCurrentPage(1);
  };

    const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleUploaded = () => {
    // A load replaces the whole table, so start from a clean view
    setCurrentPage(1);
    setError(null);
    onDataReloaded?.();
  };

  // Keep the loaded page in step with an edited note, so re-sorting or
  // paging back doesn't briefly show the pre-edit text from stale state.
  const handleCommentChange = (
    transactionId: string | number,
    comment: string | null
  ) => {
    setTransactions((previous) =>
      previous.map((transaction) =>
        transaction.id === transactionId ? { ...transaction, comment } : transaction
      )
    );
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === SortOrder.Descending ? SortOrder.Ascending : SortOrder.Descending);
    } else {
      setSortBy(column);
      setSortOrder(SortOrder.Descending);
    }
    setCurrentPage(1);
  };

  return (
    <div className="w-full">
      <div className="max-w-full">
        <Header
          onUploaded={handleUploaded}
          exportFilters={{
            profileId: activeProfileId,
            transactionType,
            category: selectedCategory,
            startDate,
            endDate,
            sortBy,
            sortOrder,
          }}
          totalItems={metadata?.total_items}
        />

        {noProfiles ? (
          // First run: there's nothing to filter or sort yet, so the only
          // thing on screen is what to do next.
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No profiles yet
            </h2>
            <p className="mt-2 text-gray-600">
              Upload a CSV to create your first profile. Each profile keeps its
              own transactions, so several people can share this database and
              switch between them here.
            </p>
          </div>
        ) : (
          <>
            <Filters
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(e) => {
                setStartDate(e.target.value);
                handleDateChange();
              }}
              onEndDateChange={(e) => {
                setEndDate(e.target.value);
                handleDateChange();
              }}
              onClearDates={clearDateFilters}
              onDatePresetChange={handleDatePresetChange}
              datePreset={datePreset}
              transactionType={transactionType}
              onTransactionTypeChange={handleTransactionTypeChange}
              metadata={metadata}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <TransactionsTable
              transactions={transactions}
              loading={loading || profilesLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              metadata={metadata}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              categories={categories}
              onCommentChange={handleCommentChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
