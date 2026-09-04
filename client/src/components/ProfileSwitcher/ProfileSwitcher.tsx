import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useProfileContext } from '../../contexts/ProfileContext';
import { ProfileNameDialog } from './ProfileNameDialog';
import { DeleteProfileDialog } from './DeleteProfileDialog';

/**
 * Switching profiles is one click: open the menu, pick a name.
 *
 * Renaming, adding and deleting sit at the bottom of the same menu so profile
 * management lives in one place instead of a settings screen.
 */
export const ProfileSwitcher: React.FC = () => {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    isLoading,
    error,
    selectProfile,
    createProfile,
    renameProfile,
    deleteProfile,
  } = useProfileContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // A menu that stays open after you click the page around it feels broken
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const openDialog = (open: () => void) => {
    setMenuOpen(false);
    setDialogError(null);
    open();
  };

  const closeDialogs = () => {
    setCreating(false);
    setRenaming(false);
    setDeleting(false);
    setDialogError(null);
  };

  /** Dialogs stay open on failure so the typed name isn't lost. */
  const runDialogAction = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setDialogError(null);

    try {
      await action();
      closeDialogs();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const buttonLabel = isLoading
    ? 'Loading profiles…'
    : activeProfile?.name ?? 'No profile';

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <Users size={16} aria-hidden="true" />
        <span className="max-w-[12rem] truncate">{buttonLabel}</span>
        <ChevronDown size={16} aria-hidden="true" className="text-gray-400" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Profiles
          </p>

          {profiles.length === 0 ? (
            <p className="px-4 pb-3 text-sm text-gray-600">
              No profiles yet. Create one, or upload a CSV to make your first.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => {
                        selectProfile(profile.id);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                        isActive ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <Check
                        size={16}
                        aria-hidden="true"
                        className={isActive ? 'opacity-100' : 'opacity-0'}
                      />
                      <span className="flex-1 truncate font-medium">
                        {profile.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {profile.transaction_count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-gray-200 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => openDialog(() => setCreating(true))}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Plus size={16} aria-hidden="true" />
              New profile
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={!activeProfile}
              onClick={() => openDialog(() => setRenaming(true))}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={16} aria-hidden="true" />
              Rename this profile
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={!activeProfile}
              onClick={() => openDialog(() => setDeleting(true))}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete this profile
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <ProfileNameDialog
        open={creating}
        title="New profile"
        description="Profiles keep separate sets of transactions in the same database. You can upload a CSV into this one straight after creating it."
        confirmLabel="Create profile"
        saving={saving}
        error={dialogError}
        onCancel={closeDialogs}
        onConfirm={(name) => runDialogAction(() => createProfile(name))}
      />

      <ProfileNameDialog
        open={renaming}
        title="Rename profile"
        description="Only the name changes. Transactions stay exactly where they are."
        confirmLabel="Save name"
        initialName={activeProfile?.name ?? ''}
        saving={saving}
        error={dialogError}
        onCancel={closeDialogs}
        onConfirm={(name) =>
          runDialogAction(() => renameProfile(activeProfile!.id, name))
        }
      />

      <DeleteProfileDialog
        profile={deleting ? activeProfile : null}
        deleting={saving}
        error={dialogError}
        onCancel={closeDialogs}
        onConfirm={() =>
          runDialogAction(() => deleteProfile(activeProfile!.id))
        }
      />
    </div>
  );
};
