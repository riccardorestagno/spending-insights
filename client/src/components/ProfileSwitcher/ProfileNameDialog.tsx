import React, { useEffect, useRef, useState } from 'react';

interface ProfileNameDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Pre-filled when renaming; empty when creating. */
  initialName?: string;
  saving: boolean;
  /** Server-side failures, e.g. a name that's already taken. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

const MAX_NAME_LENGTH = 60;

/** One dialog for both naming jobs — creating and renaming only differ in copy. */
export const ProfileNameDialog: React.FC<ProfileNameDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  initialName = '',
  saving,
  error,
  onCancel,
  onConfirm,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>(initialName);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setName(initialName);
    setLocalError(null);
    // Select the existing name so renaming is one keystroke away
    const input = inputRef.current;
    input?.focus();
    input?.select();
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, onCancel]);

  if (!open) return null;

  const handleConfirm = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setLocalError('Enter a name for this profile.');
      return;
    }

    setLocalError(null);
    onConfirm(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!saving) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-name-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl"
      >
        <h2 id="profile-name-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>

        <p className="mt-2 text-sm text-gray-600">{description}</p>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Profile name
          <input
            ref={inputRef}
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              // Enter is the obvious way to submit a one-field form
              if (event.key === 'Enter' && !saving) handleConfirm();
            }}
            disabled={saving}
            placeholder="e.g. Alex"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-normal text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {(localError || error) && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {localError ?? error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
