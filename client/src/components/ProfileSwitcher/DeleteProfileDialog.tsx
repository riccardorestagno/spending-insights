import React, { useEffect } from 'react';
import { Profile } from '../TransactionViewer/types';

interface DeleteProfileDialogProps {
  profile: Profile | null;
  deleting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Deleting takes the profile's transactions with it, so it asks first. */
export const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({
  profile,
  deleting,
  error,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!profile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [profile, deleting, onCancel]);

  if (!profile) return null;

  const count = profile.transaction_count;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!deleting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-profile-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl"
      >
        <h2
          id="delete-profile-title"
          className="text-lg font-semibold text-gray-900"
        >
          Delete “{profile.name}”?
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          {count === 0
            ? 'This profile is empty. Deleting it removes it from the switcher.'
            : `This permanently deletes the profile and its ${count} transaction${
                count === 1 ? '' : 's'
              }, including any category and reimbursement edits. Export the profile first if you want a copy.`}
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete profile'}
          </button>
        </div>
      </div>
    </div>
  );
};
