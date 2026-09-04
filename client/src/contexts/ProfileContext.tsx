import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Profile } from '../components/TransactionViewer/types';
import { API_BASE_URL } from '../utils/constants';
import { jsonBody, requestJson } from '../utils/api';

/**
 * Holds the list of profiles and which one the app is currently showing.
 *
 * Everything that reads transactions needs the active profile, so it lives in
 * context rather than being threaded through the viewer, the insight panel and
 * both CSV buttons as props.
 */

const PROFILES_URL = `${API_BASE_URL}/profiles`;

// Remembering the choice means a reload doesn't drop you into someone else's
// spending — the far more surprising outcome of the two.
const STORAGE_KEY = 'spending-insights:active-profile-id';

const readStoredId = (): number | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored === null ? NaN : Number(stored);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies)
    return null;
  }
};

const writeStoredId = (id: number | null): void => {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // Not being able to remember the choice is not worth failing over
  }
};

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  activeProfileId: number | null;
  /** True while the first (or a subsequent) profile fetch is in flight. */
  isLoading: boolean;
  /** Set when the profile list itself couldn't be loaded. */
  error: string | null;
  /** No profiles exist yet — the app should invite an upload. */
  isEmpty: boolean;
  selectProfile: (id: number) => void;
  refresh: (preferredId?: number) => Promise<Profile[]>;
  createProfile: (name: string) => Promise<Profile>;
  renameProfile: (id: number, name: string) => Promise<Profile>;
  deleteProfile: (id: number) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(
    readStoredId
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (preferredId?: number): Promise<Profile[]> => {
      setIsLoading(true);

      try {
        const data = await requestJson<{ profiles: Profile[] }>(PROFILES_URL);
        setProfiles(data.profiles);
        setError(null);

        // Keep the current selection when it still exists, otherwise fall back
        // to the first profile — a deleted profile shouldn't leave a blank app.
        setActiveProfileId((current) => {
          const wanted = preferredId ?? current;
          const stillExists =
            wanted !== null &&
            wanted !== undefined &&
            data.profiles.some((profile) => profile.id === wanted);

          return stillExists ? wanted : data.profiles[0]?.id ?? null;
        });

        return data.profiles;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load profiles. Check that the server is running on port 8000.'
        );
        setProfiles([]);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    writeStoredId(activeProfileId);
  }, [activeProfileId]);

  const selectProfile = useCallback((id: number) => {
    setActiveProfileId(id);
  }, []);

  const createProfile = useCallback(
    async (name: string): Promise<Profile> => {
      const created = await requestJson<Profile>(PROFILES_URL, {
        method: 'POST',
        ...jsonBody({ name }),
      });

      // Switch to it straight away: creating a profile is always a prelude to
      // putting something in it.
      await refresh(created.id);
      return created;
    },
    [refresh]
  );

  const renameProfile = useCallback(
    async (id: number, name: string): Promise<Profile> => {
      const updated = await requestJson<Profile>(`${PROFILES_URL}/${id}`, {
        method: 'PATCH',
        ...jsonBody({ name }),
      });

      // Only the name changed, so the transactions on screen stay as they are
      await refresh(id);
      return updated;
    },
    [refresh]
  );

  const deleteProfile = useCallback(
    async (id: number): Promise<void> => {
      await requestJson(`${PROFILES_URL}/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<ProfileContextValue>(() => {
    const activeProfile =
      profiles.find((profile) => profile.id === activeProfileId) ?? null;

    return {
      profiles,
      activeProfile,
      // Guard against a stored id that no longer exists on the server
      activeProfileId: activeProfile?.id ?? null,
      isLoading,
      error,
      isEmpty: !isLoading && profiles.length === 0,
      selectProfile,
      refresh,
      createProfile,
      renameProfile,
      deleteProfile,
    };
  }, [
    profiles,
    activeProfileId,
    isLoading,
    error,
    selectProfile,
    refresh,
    createProfile,
    renameProfile,
    deleteProfile,
  ]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfileContext = (): ProfileContextValue => {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfileContext must be used inside a ProfileProvider');
  }

  return context;
};
