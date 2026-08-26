import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';

interface UploadCsvDialogProps {
  open: boolean;
  uploading: boolean;
  /** Surfaced inside the dialog so a failed upload keeps the chosen options. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: (file: File, overrideExisting: boolean) => void;
}

export const UploadCsvDialog: React.FC<UploadCsvDialogProps> = ({
  open,
  uploading,
  error,
  onCancel,
  onConfirm,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Reset every time the dialog opens so the override checkbox always starts
  // off — it should never be inherited from a previous upload.
  useEffect(() => {
    if (open) {
      setFile(null);
      setOverrideExisting(false);
      setFileError(null);
      chooseButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploading) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, uploading, onCancel]);

  if (!open) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    // Clear the input so picking the same file twice still fires onChange
    event.target.value = '';

    if (!selected) return;

    // `accept` only filters the dialog; the user can still switch to "All Files"
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setFileError('That file is not a .csv. Pick a CSV export.');
      return;
    }

    setFile(selected);
    setFileError(null);
  };

  const handleConfirm = () => {
    if (!file) {
      setFileError('Choose a CSV file first.');
      return;
    }
    onConfirm(file, overrideExisting);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!uploading) onCancel();
      }}
    >
      {/* stopPropagation keeps clicks inside the panel from closing it */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-csv-title"
        aria-describedby="upload-csv-description"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl"
      >
        <h2 id="upload-csv-title" className="text-lg font-semibold text-gray-900">
          Upload CSV
        </h2>

        <p id="upload-csv-description" className="mt-2 text-sm text-gray-600">
          Only transactions that aren't already in your database will be added.
          Any transaction whose date and description match an existing one is
          left untouched.
        </p>

        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            ref={chooseButtonRef}
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText size={16} aria-hidden="true" />
            {file ? 'Choose a different file' : 'Choose CSV file'}
          </button>

          {file && (
            <p className="mt-2 truncate text-sm text-gray-700" title={file.name}>
              {file.name}
            </p>
          )}
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={overrideExisting}
            onChange={(event) => setOverrideExisting(event.target.checked)}
            disabled={uploading}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium">Override existing transactions</span>
        </label>

        {overrideExisting && (
          <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <strong className="font-semibold">Warning:</strong> matching
            transactions will be replaced with the values from this file,
            permanently discarding any category or reimbursement edits you've
            made to them.
          </p>
        )}

        {(fileError || error) && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {fileError ?? error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading || !file}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={16} aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};
