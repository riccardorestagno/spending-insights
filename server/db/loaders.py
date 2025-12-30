import sqlite3
import pandas as pd

from core.config import DB_PATH


def load_csv_to_db(csv_path: str) -> int:
    df = pd.read_csv(csv_path)

    required_columns = [
        "Account Type",
        "Account Number",
        "Transaction Date",
        "Description 1",
        "CAD$",
        "Category"
    ]

    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.rename(columns={
        "Account Type": "account_type",
        "Account Number": "account_number",
        "Transaction Date": "transaction_date",
        "Cheque Number": "cheque_number",
        "Description 1": "description_1",
        "Description 2": "description_2",
        "CAD$": "cad_amount",
        "USD$": "usd_amount",
        "Category": "category",
    })

    columns_to_keep = [
        "account_type",
        "account_number",
        "transaction_date",
        "cheque_number",
        "description_1",
        "description_2",
        "cad_amount",
        "usd_amount",
        "category",
    ]

    df = df[[col for col in columns_to_keep if col in df.columns]]

    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM transactions")
    df.to_sql("transactions", conn, if_exists="append", index=False)

    row_count = len(df)
    conn.close()

    return row_count
