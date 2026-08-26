import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import { UploadCsvDialog } from './UploadCsvDialog';

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

/** Turn the server's per-row counts into one line for the button's status. */
const summarize = (payload: {
  filename?: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
}): string => {
  const parts = [`${payload.inserted ?? 0} added`];

  if (payload.updated) parts.push(`${payload.updated} overridden`);
  if (payload.skipped) parts.push(`${payload.skipped} skipped as duplicates`);

  return `Uploaded ${payload.filename ?? 'file'} — ${parts.join(', ')}`;
};

export const UploadCsv: React.FC<UploadCsvProps> = ({ onUploaded }) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const handleUpload = async (file: File, overrideExisting: boolean) => {
    setUploading(true);
    setDialogError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // FormData has no booleans; FastAPI parses these strings into bool
      formData.append('override_existing', overrideExisting ? 'true' : 'false');

      const response = await fetch(`${API_BASE_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readDetail(payload, `Upload failed (${response.status})`));
      }

      setStatus({ type: 'success', message: summarize(payload) });
      setDialogOpen(false);

      onUploaded?.();
    } catch (err) {
      // Keep the dialog open so the file and checkbox survive a retry
      setDialogError(
        err instanceof Error
          ? err.message
          : 'Upload failed. Check that the server is running on port 8000.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        onClick={() => {
          setStatus(null);
          setDialogError(null);
          setDialogOpen(true);
        }}
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

      <UploadCsvDialog
        open={dialogOpen}
        uploading={uploading}
        error={dialogError}
        onCancel={() => setDialogOpen(false)}
        onConfirm={handleUpload}
      />
    </div>
  );
};
