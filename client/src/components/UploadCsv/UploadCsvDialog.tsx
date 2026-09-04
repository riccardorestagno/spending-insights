import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Profile } from '../TransactionViewer/types';

/** Where an upload should land: an existing profile, or one to be created. */
export type UploadTarget =
  | { profileId: number; profileName?: undefined }
  | { profileId?: undefined; profileName: string };

interface UploadCsvDialogProps {
  open: boolean;
  uploading: boolean;
  /** Surfaced inside the dialog so a failed upload keeps the chosen options. */
  error?: string | null;
  profiles: Profile[];
  /** Pre-selected so the common case is upload-into-what-I'm-looking-at. */
  activeProfileId: number | null;
  onCancel: () => void;
  onConfirm: (
    file: File,
    overrideExisting: boolean,
    target: UploadTarget
  ) => void;
}

// Sentinel for the "create one" row in the profile dropdown
const NEW_PROFILE = 'new';

export const UploadCsvDialog: React.FC<UploadCsvDialogProps> = ({
  open,
  uploading,
  error,
  profiles,
  activeProfileId,
  onCancel,
  onConfirm,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>(NEW_PROFILE);
  const [newProfileName, setNewProfileName] = useState<string>('');

  // Reset every time the dialog opens so the override checkbox always starts
  // off — it should never be inherited from a previous upload.
  useEffect(() => {
    if (!open) return;

    setFile(null);
    setOverrideExisting(false);
    setFileError(null);
    setNewProfileName('');

    // With no profiles at all there's nothing to pick, so the dialog opens
    // straight into naming the first one.
    const hasProfiles = profiles.length > 0;
    const preselected =
      activeProfileId !== null &&
      profiles.some((profile) => profile.id === activeProfileId)
        ? activeProfileId
        : profiles[0]?.id;

    setSelection(hasProfiles ? String(preselected) : NEW_PROFILE);
    chooseButtonRef.current?.focus();
  }, [open, profiles, activeProfileId]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploading) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, uploading, onCancel]);

  if (!open) return null;

  const creatingProfile = selection === NEW_PROFILE;

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

    if (creatingProfile) {
      const name = newProfileName.trim();
      if (!name) {
        setFileError('Name the new profile before uploading.');
        return;
      }
      onConfirm(file, overrideExisting, { profileName: name });
      return;
    }

    onConfirm(file, overrideExisting, { profileId: Number(selection) });
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
          Transactions are added to the profile you pick below. Any transaction
          whose date and description match one already in that profile is left
          untouched.
        </p>

        <div className="mt-4">
          <label
            htmlFor="upload-profile"
            className="block text-sm font-medium text-gray-700"
          >
            Upload into
          </label>

          <select
            id="upload-profile"
            value={selection}
            onChange={(event) => {
              setSelection(event.target.value);
              setFileError(null);
            }}
            disabled={uploading}
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={String(profile.id)}>
                {profile.name} ({profile.transaction_count} transactions)
              </option>
            ))}
            <option value={NEW_PROFILE}>
              {profiles.length === 0
                ? 'Create your first profile…'
                : 'Create a new profile…'}
            </option>
          </select>

          {creatingProfile && (
            <input
              type="text"
              value={newProfileName}
              maxLength={60}
              onChange={(event) => setNewProfileName(event.target.value)}
              disabled={uploading}
              placeholder="Profile name, e.g. Alex"
              aria-label="New profile name"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          )}
        </div>

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
            transactions in this profile will be replaced with the values from
            this file, permanently discarding any category or reimbursement
            edits you've made to them. Other profiles are untouched.
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
