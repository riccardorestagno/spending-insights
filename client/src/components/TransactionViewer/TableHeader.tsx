import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { TableHeaderProps } from './types';

interface ExtendedTableHeaderProps extends TableHeaderProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

export const TableHeader: React.FC<ExtendedTableHeaderProps> = ({ 
  sortBy, 
  sortOrder, 
  onSort,
  isEditMode,
  onToggleEditMode
}) => {
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
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            Category
            <button
              onClick={onToggleEditMode}
              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                isEditMode ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
              }`}
              title={isEditMode ? 'Exit edit mode' : 'Edit categories'}
            >
              <Pencil size={14} />
            </button>
          </div>
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