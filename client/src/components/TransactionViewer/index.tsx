import React, { useState, useEffect } from 'react';
import { Transaction, Category, Metadata, TransactionType, SortOrder } from './types';
import { API_BASE_URL } from '../../utils/constants';
import { Header } from './Header';
import { Filters } from './Filters';
import { TransactionsTable } from './TransactionsTable';

export default function TransactionViewer() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.Debit);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.Descending);

  useEffect(() => {
    fetchCategories();
  }, [transactionType, startDate, endDate]);

  useEffect(() => {
    if (selectedCategory) {
      fetchTransactions();
    }
  }, [transactionType, selectedCategory, currentPage, pageSize, startDate, endDate, sortBy, sortOrder]);

  const fetchCategories = async () => {
    try {
      let url = `${API_BASE_URL}/categories?transaction_type=${encodeURIComponent(transactionType)}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories);
      if (data.categories.length > 0) {
        setSelectedCategory(data.categories[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/transactions?transaction_type=${encodeURIComponent(transactionType)}&category=${encodeURIComponent(selectedCategory)}&page=${currentPage}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const response = await fetch(url);
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
    setCurrentPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleDateChange = () => {
    setCurrentPage(1);
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header />

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
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          metadata={metadata}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}