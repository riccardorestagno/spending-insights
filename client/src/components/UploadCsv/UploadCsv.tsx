import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

interface UploadCsvProps {
  /** Called after a successful upload so the caller can refetch data. */
  onUploaded?: () => void;
}

interface Status {
  type: 'success' | 'error';
  message: string;
}

/** FastAPI returns `detail` as a string for HTTPException, but as an array of
 *  error objects for request-validation failures. Normalize both. */
const readDetail = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item)
        )
        .join('; ');
    }
  }
  return fallback;
};

export const UploadCsv: React.FC<UploadCsvProps> = ({ onUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Clear the input so picking the same file twice still fires onChange
    event.target.value = '';

    if (!file) return;

    // `accept` only filters the dialog; the user can still switch to "All Files"
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatus({ type: 'error', message: 'That file is not a .csv. Pick a CSV export.' });
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readDetail(payload, `Upload failed (${response.status})`));
      }

      setStatus({
        type: 'success',
        message: `Uploaded ${payload.filename} — ${payload.rows} transactions loaded`,
      });

      onUploaded?.();
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Upload failed. Check that the server is running on port 8000.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
      >
        <Upload size={16} aria-hidden="true" />
        {uploading ? 'Uploading…' : 'Upload CSV'}
      </button>

      {status && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
};
