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
            category TEXT
        )
    """)

    conn.commit()
    conn.close()
