import React from 'react';
import { UploadCsv } from '../UploadCsv/UploadCsv';
import { ExportCsv, ExportFilters } from '../ExportCsv/ExportCsv';

interface HeaderProps {
  onUploaded?: () => void;
  exportFilters: ExportFilters;
  totalItems?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onUploaded,
  exportFilters,
  totalItems,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Transaction Viewer
        </h1>
        <p className="text-gray-600">View and filter your categorized transactions</p>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <UploadCsv onUploaded={onUploaded} />
        <ExportCsv filters={exportFilters} totalItems={totalItems} />
      </div>
    </div>
  </div>
);
