import sqlite3
from core.config import DB_PATH


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

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
            is_reimbursed INTEGER NOT NULL DEFAULT 0
        )
    """)

    run_migrations(cursor)

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
