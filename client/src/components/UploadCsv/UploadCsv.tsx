import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import { readDetail } from '../../utils/api';
import { useProfileContext } from '../../contexts/ProfileContext';
import { UploadCsvDialog, UploadTarget } from './UploadCsvDialog';

interface UploadCsvProps {
  /** Called after a successful upload so the caller can refetch data. */
  onUploaded?: () => void;
}

interface Status {
  type: 'success' | 'error';
  message: string;
}

interface UploadResponse {
  filename?: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  profile?: { id: number; name: string };
}

/** Turn the server's per-row counts into one line for the button's status. */
const summarize = (payload: UploadResponse): string => {
  const parts = [`${payload.inserted ?? 0} added`];

  if (payload.updated) parts.push(`${payload.updated} overridden`);
  if (payload.skipped) parts.push(`${payload.skipped} skipped as duplicates`);

  const target = payload.profile ? ` to ${payload.profile.name}` : '';

  return `Uploaded ${payload.filename ?? 'file'}${target} — ${parts.join(', ')}`;
};

export const UploadCsv: React.FC<UploadCsvProps> = ({ onUploaded }) => {
  const { profiles, activeProfileId, refresh } = useProfileContext();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const handleUpload = async (
    file: File,
    overrideExisting: boolean,
    target: UploadTarget
  ) => {
    setUploading(true);
    setDialogError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // FormData has no booleans; FastAPI parses these strings into bool
      formData.append('override_existing', overrideExisting ? 'true' : 'false');

      // Exactly one of these is sent: an id loads into an existing profile, a
      // name creates one (or reuses a profile already called that).
      if (target.profileId !== undefined) {
        formData.append('profile_id', String(target.profileId));
      } else {
        formData.append('profile_name', target.profileName);
      }

      const response = await fetch(`${API_BASE_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const payload: UploadResponse | null = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(readDetail(payload, `Upload failed (${response.status})`));
      }

      setStatus({ type: 'success', message: summarize(payload ?? {}) });
      setDialogOpen(false);

      // Pull in the new counts and switch to whichever profile received the
      // file, so the upload is immediately visible.
      await refresh(payload?.profile?.id);
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
        profiles={profiles}
        activeProfileId={activeProfileId}
        onCancel={() => setDialogOpen(false)}
        onConfirm={handleUpload}
      />
    </div>
  );
};
