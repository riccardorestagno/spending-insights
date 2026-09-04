"""Reading and writing the profiles table.

A profile is just a named bucket of transactions, so that several people can
share one database without seeing each other's spending. Transactions store a
profile_id, never a profile name — renaming is therefore a one-row update that
leaves every transaction untouched.
"""

import sqlite3
from typing import Any, Dict, List, Optional

from db.database import DEFAULT_PROFILE_NAME, get_or_create_profile_id

MAX_NAME_LENGTH = 60


class ProfileError(Exception):
    """Base for problems worth reporting back to the caller."""


class ProfileNotFound(ProfileError):
    pass


class DuplicateProfileName(ProfileError):
    pass


class InvalidProfileName(ProfileError):
    pass


def normalize_name(name: Optional[str]) -> str:
    """Trim and collapse whitespace, rejecting names that can't be displayed."""
    cleaned = " ".join((name or "").split())

    if not cleaned:
        raise InvalidProfileName("Profile name cannot be empty")

    if len(cleaned) > MAX_NAME_LENGTH:
        raise InvalidProfileName(
            f"Profile name cannot be longer than {MAX_NAME_LENGTH} characters"
        )

    return cleaned


def row_to_profile(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"],
        "transaction_count": row["transaction_count"],
    }


def list_profiles(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Every profile, oldest first, with how many transactions it holds.

    LEFT JOIN so a profile created for an upload that hasn't happened yet still
    shows up, with a count of zero.
    """
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        """
        SELECT p.id, p.name, p.created_at, COUNT(t.id) AS transaction_count
        FROM profiles p
        LEFT JOIN transactions t ON t.profile_id = p.id
        GROUP BY p.id, p.name, p.created_at
        ORDER BY p.id
        """
    )
    return [row_to_profile(row) for row in cursor.fetchall()]


def get_profile(conn: sqlite3.Connection, profile_id: int) -> Dict[str, Any]:
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        """
        SELECT p.id, p.name, p.created_at, COUNT(t.id) AS transaction_count
        FROM profiles p
        LEFT JOIN transactions t ON t.profile_id = p.id
        WHERE p.id = ?
        GROUP BY p.id, p.name, p.created_at
        """,
        (profile_id,),
    )
    row = cursor.fetchone()

    if row is None:
        raise ProfileNotFound(f"No profile with id {profile_id}")

    return row_to_profile(row)


def profile_exists(conn: sqlite3.Connection, profile_id: int) -> bool:
    cursor = conn.execute("SELECT 1 FROM profiles WHERE id = ?", (profile_id,))
    return cursor.fetchone() is not None


def find_by_name(conn: sqlite3.Connection, name: str) -> Optional[int]:
    cursor = conn.execute(
        "SELECT id FROM profiles WHERE name = ? COLLATE NOCASE", (name,)
    )
    row = cursor.fetchone()
    return row[0] if row else None


def create_profile(conn: sqlite3.Connection, name: str) -> Dict[str, Any]:
    cleaned = normalize_name(name)

    if find_by_name(conn, cleaned) is not None:
        raise DuplicateProfileName(f'A profile named "{cleaned}" already exists')

    cursor = conn.execute("INSERT INTO profiles (name) VALUES (?)", (cleaned,))
    conn.commit()

    return get_profile(conn, cursor.lastrowid)


def rename_profile(
    conn: sqlite3.Connection, profile_id: int, name: str
) -> Dict[str, Any]:
    """Rename in place. Transactions reference the id, so none of them change."""
    cleaned = normalize_name(name)

    if not profile_exists(conn, profile_id):
        raise ProfileNotFound(f"No profile with id {profile_id}")

    existing_id = find_by_name(conn, cleaned)
    # Re-saving the same name (or only changing its casing) is a no-op, not a clash
    if existing_id is not None and existing_id != profile_id:
        raise DuplicateProfileName(f'A profile named "{cleaned}" already exists')

    conn.execute("UPDATE profiles SET name = ? WHERE id = ?", (cleaned, profile_id))
    conn.commit()

    return get_profile(conn, profile_id)


def delete_profile(conn: sqlite3.Connection, profile_id: int) -> Dict[str, Any]:
    """Delete a profile along with the transactions belonging to it.

    Transactions are removed explicitly rather than left orphaned, since a row
    with no profile would be invisible everywhere in the app.
    """
    profile = get_profile(conn, profile_id)

    conn.execute("DELETE FROM transactions WHERE profile_id = ?", (profile_id,))
    conn.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
    conn.commit()

    return profile


def get_or_create(conn: sqlite3.Connection, name: str) -> int:
    cleaned = normalize_name(name)
    profile_id = get_or_create_profile_id(conn.cursor(), cleaned)
    conn.commit()
    return profile_id


def resolve_target_profile_id(
    conn: sqlite3.Connection,
    profile_id: Optional[int] = None,
    profile_name: Optional[str] = None,
) -> int:
    """Work out which profile a load should write into.

    Priority: an explicit id, then a name to create (or reuse), then the
    default profile — so `curl /load-csv?csv_path=...` still works with no
    profile arguments at all.
    """
    if profile_id is not None:
        if not profile_exists(conn, profile_id):
            raise ProfileNotFound(f"No profile with id {profile_id}")
        return profile_id

    if profile_name and profile_name.strip():
        return get_or_create(conn, profile_name)

    return get_or_create(conn, DEFAULT_PROFILE_NAME)
