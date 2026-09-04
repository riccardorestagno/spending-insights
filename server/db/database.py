import sqlite3
from core.config import DB_PATH

# Profile used when transactions arrive without an explicit profile: the
# pre-profiles rows found during migration, and loads that don't name one.
DEFAULT_PROFILE_NAME = "Default"


def connect() -> sqlite3.Connection:
    """Open a connection with the settings every caller expects."""
    conn = sqlite3.connect(DB_PATH)
    # Off by default in SQLite, so deleting a profile wouldn't otherwise be
    # checked against the transactions pointing at it.
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = connect()
    cursor = conn.cursor()

    # Profile names live here rather than on each transaction, so renaming a
    # profile touches exactly one row and every transaction keeps pointing at
    # the same immutable id.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # NOCASE so "Alex" and "alex" can't both exist and confuse the switcher
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_name
        ON profiles (name COLLATE NOCASE)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_type TEXT,
            account_number TEXT,
            transaction_date TEXT,
            cheque_number TEXT,
            description_1 TEXT,
            description_2 TEXT,
            cad_amount REAL,
            usd_amount REAL,
            category TEXT,
            is_reimbursed INTEGER NOT NULL DEFAULT 0,
            profile_id INTEGER REFERENCES profiles(id)
        )
    """)

    run_migrations(cursor)

    # Every read filters by profile, so this is the index that matters
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_transactions_profile
        ON transactions (profile_id)
    """)

    conn.commit()
    conn.close()


def run_migrations(cursor: sqlite3.Cursor) -> None:
    """Bring an already-existing table up to the current schema.

    CREATE TABLE IF NOT EXISTS is a no-op once the table exists, so databases
    created before a column was introduced need an explicit ALTER.
    """
    cursor.execute("PRAGMA table_info(transactions)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    if "is_reimbursed" not in existing_columns:
        # SQLite backfills every existing row with the default, so all
        # previously loaded transactions come out as not reimbursed.
        cursor.execute(
            "ALTER TABLE transactions ADD COLUMN is_reimbursed INTEGER NOT NULL DEFAULT 0"
        )

    if "profile_id" not in existing_columns:
        # No DEFAULT, so existing rows come out NULL and are adopted below
        cursor.execute(
            "ALTER TABLE transactions ADD COLUMN profile_id INTEGER REFERENCES profiles(id)"
        )

    adopt_orphan_transactions(cursor)


def adopt_orphan_transactions(cursor: sqlite3.Cursor) -> None:
    """Give any profile-less transactions a home.

    Only relevant for databases loaded before profiles existed. A brand new
    database has nothing to adopt, so no profile is created and the app can
    prompt for one on the first upload.
    """
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE profile_id IS NULL")
    if cursor.fetchone()[0] == 0:
        return

    profile_id = get_or_create_profile_id(cursor, DEFAULT_PROFILE_NAME)
    cursor.execute(
        "UPDATE transactions SET profile_id = ? WHERE profile_id IS NULL",
        (profile_id,),
    )


def get_or_create_profile_id(cursor: sqlite3.Cursor, name: str) -> int:
    """Look a profile up by name, creating it if it isn't there yet.

    Kept here (rather than in db/profiles.py) so the migration path doesn't
    have to import a module that imports this one.
    """
    cursor.execute(
        "SELECT id FROM profiles WHERE name = ? COLLATE NOCASE", (name,)
    )
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("INSERT INTO profiles (name) VALUES (?)", (name,))
    return cursor.lastrowid
