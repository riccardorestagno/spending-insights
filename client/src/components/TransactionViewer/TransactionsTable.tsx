import React from 'react';
import { TransactionsTableProps } from './types';
import { TableHeader } from './TableHeader';
import { TransactionRow } from './TransactionRow';
import { Pagination } from './Pagination';

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  loading,
  sortBy,
  sortOrder,
  onSort,
  metadata,
  currentPage,
  onPageChange
}) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
    {loading ? (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading transactions...</p>
      </div>
    ) : transactions.length > 0 ? (
      <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </tbody>
          </table>
        </div>
        {metadata && (
          <Pagination
            currentPage={currentPage}
            totalPages={metadata.total_pages}
            onPageChange={onPageChange}
          />
        )}
      </>
    ) : (
      <div className="p-12 text-center text-gray-500">
        No transactions found for this category
      </div>
    )}
  </div>
);