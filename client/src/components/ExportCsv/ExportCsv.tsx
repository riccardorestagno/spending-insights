import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import { SortOrder, TransactionType } from '../TransactionViewer/types';

/** The filters currently applied in the viewer, forwarded to the export. */
export interface ExportFilters {
  transactionType: TransactionType;
  category: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: SortOrder;
}

interface ExportCsvProps {
  filters: ExportFilters;
  /** Total rows in the current view — disables the button when there are none. */
  totalItems?: number;
}

const FILENAME_PATTERN = /filename="?([^"]+)"?/;

const readFilename = (header: string | null, fallback: string): string => {
  const match = header ? FILENAME_PATTERN.exec(header) : null;
  return match?.[1] ?? fallback;
};

export const ExportCsv: React.FC<ExportCsvProps> = ({ filters, totalItems }) => {
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = totalItems === 0;

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    let objectUrl: string | null = null;

    try {
      const params = new URLSearchParams({
        transaction_type: filters.transactionType,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
      });

      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('start_date', filters.startDate);
      if (filters.endDate) params.set('end_date', filters.endDate);

      const response = await fetch(
        `${API_BASE_URL}/export-csv?${params.toString()}`
      );

      if (!response.ok) {
        // Errors come back as JSON even though a success is text/csv
        const payload = await response.json().catch(() => null);
        const detail =
          payload && typeof payload.detail === 'string'
            ? payload.detail
            : `Export failed (${response.status})`;
        throw new Error(detail);
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = readFilename(
        response.headers.get('Content-Disposition'),
        'transactions.csv'
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Export failed. Check that the server is running on port 8000.'
      );
    } finally {
      // Safari needs the URL alive until the download actually starts
      if (objectUrl) {
        const url = objectUrl;
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting || isEmpty}
        title={isEmpty ? 'Nothing to export with the current filters' : undefined}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={16} aria-hidden="true" />
        {exporting ? 'Exporting…' : 'Export CSV'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
