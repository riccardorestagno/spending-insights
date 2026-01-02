import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHeaderProps } from './types';

export const TableHeader: React.FC<TableHeaderProps> = ({ sortBy, sortOrder, onSort }) => {
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'desc'
      ? <ArrowDown className="w-4 h-4 text-blue-600" />
      : <ArrowUp className="w-4 h-4 text-blue-600" />;
  };

  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th
          onClick={() => onSort('date')}
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
        >
          <div className="flex items-center gap-2">
            Date
            {getSortIcon('date')}
          </div>
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Description
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Account
        </th>
        <th
          onClick={() => onSort('amount')}
          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
        >
          <div className="flex items-center justify-end gap-2">
            Amount (CAD)
            {getSortIcon('amount')}
          </div>
        </th>
      </tr>
    </thead>
  );
};