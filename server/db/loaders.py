import sqlite3
import pandas as pd
from datetime import datetime

from core.config import DB_PATH


def normalize_date(date_str):
    """Normalize date to YYYY-MM-DD format"""
    if pd.isna(date_str):
        return None
    try:
        # Try parsing M/D/YYYY format (RBC format)
        dt = datetime.strptime(str(date_str), "%m/%d/%Y")
        return dt.strftime("%Y-%m-%d")
    except:
        try:
            # Already in YYYY-MM-DD format
            dt = datetime.strptime(str(date_str), "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
        except:
            return str(date_str)  # Keep as-is if it can't parse


TRUTHY_VALUES = {"true", "t", "yes", "y", "1"}
FALSY_VALUES = {"false", "f", "no", "n", "0", ""}


def parse_reimbursed(value) -> int:
    """Parse the 'Is Reimbursed' cell into 0/1, defaulting to 0.

    Deliberately lenient: the column may arrive as a real bool, as 1/0, or as
    text depending on whether the file came from our own export or was edited
    by hand in Excel. Anything unrecognized is treated as not reimbursed.
    """
    if pd.isna(value):
        return 0

    if isinstance(value, bool):
        return int(value)

    text = str(value).strip().lower()

    if text in TRUTHY_VALUES:
        return 1
    if text in FALSY_VALUES:
        return 0

    try:
        # Covers floats like "1.0" that appear when the column has blanks
        return 1 if float(text) != 0 else 0
    except ValueError:
        return 0


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

    # Normalize transaction dates to YYYY-MM-DD format
    df['Transaction Date'] = df['Transaction Date'].apply(normalize_date)

    # Optional column: plain RBC exports predate it, so default those to false
    if "Is Reimbursed" in df.columns:
        df["Is Reimbursed"] = df["Is Reimbursed"].apply(parse_reimbursed)
    else:
        df["Is Reimbursed"] = 0

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
        "Is Reimbursed": "is_reimbursed",
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
        "is_reimbursed",
    ]

    df = df[[col for col in columns_to_keep if col in df.columns]]

    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM transactions")
    df.to_sql("transactions", conn, if_exists="append", index=False)

    row_count = len(df)
    conn.close()

    return row_count
