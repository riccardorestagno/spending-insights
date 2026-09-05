import sqlite3
import pandas as pd
from collections import defaultdict, deque
from datetime import datetime
from typing import Any, Dict, List, NamedTuple, Optional, Tuple

from db.database import connect
from db.profiles import resolve_target_profile_id


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


# A transaction is considered "already in the database" when its date and
# description match an existing row. Kept as a constant so the notion of
# identity lives in one place.
DUPLICATE_KEY_COLUMNS = ("transaction_date", "description_1")

ALL_COLUMNS = (
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
    "comment",
)

COLUMN_RENAMES = {
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
    "Comment": "comment",
}

REQUIRED_CSV_COLUMNS = (
    "Account Type",
    "Account Number",
    "Transaction Date",
    "Description 1",
    "CAD$",
    "Category",
)


class LoadResult(NamedTuple):
    """Outcome of a load, broken down so callers can report it precisely."""

    inserted: int
    updated: int
    skipped: int

    @property
    def total_rows(self) -> int:
        return self.inserted + self.updated + self.skipped

    @property
    def changed_rows(self) -> int:
        """Rows the load actually wrote to the database."""
        return self.inserted + self.updated


def to_sql_value(value: Any) -> Any:
    """Convert a pandas cell into something sqlite3 will accept.

    Empty cells arrive as NaN/NaT, which sqlite3 would happily store as the
    float 'nan'; they should become NULL instead.
    """
    if value is None or pd.isna(value):
        return None
    # numpy scalars (int64, float64, bool_) aren't natively adaptable
    if hasattr(value, "item"):
        return value.item()
    return value


def normalize_key_part(value: Any) -> str:
    """Normalize one component of the duplicate-detection key.

    Collapses whitespace and ignores case so that cosmetic differences between
    two exports of the same transaction don't read as two distinct rows.
    """
    if value is None or pd.isna(value):
        return ""
    return " ".join(str(value).split()).casefold()


def build_key(values: Dict[str, Any]) -> Tuple[str, ...]:
    return tuple(normalize_key_part(values.get(col)) for col in DUPLICATE_KEY_COLUMNS)


def read_transactions_csv(csv_path: str) -> pd.DataFrame:
    """Read a CSV into a frame whose columns match the transactions table."""
    df = pd.read_csv(csv_path)

    missing = [col for col in REQUIRED_CSV_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Normalize transaction dates to YYYY-MM-DD format
    df["Transaction Date"] = df["Transaction Date"].apply(normalize_date)

    # Optional column: plain RBC exports predate it. When it's absent the
    # column is left out of the frame entirely rather than filled with zeros,
    # so inserts fall back to the table's DEFAULT 0 and overrides leave a
    # transaction's existing reimbursed flag alone.
    if "Is Reimbursed" in df.columns:
        df["Is Reimbursed"] = df["Is Reimbursed"].apply(parse_reimbursed)

    df = df.rename(columns=COLUMN_RENAMES)

    return df[[col for col in ALL_COLUMNS if col in df.columns]]


def existing_ids_by_key(
    conn: sqlite3.Connection, profile_id: int
) -> Dict[Tuple[str, ...], deque]:
    """Map each duplicate key to the ids of the rows already stored under it.

    Scoped to one profile: two people sharing the database will legitimately
    have their own copy of the same rent payment, and neither should suppress
    the other's.

    Ids are queued in insertion order so that repeated occurrences of the same
    key are matched one-for-one: a file containing two identical same-day
    transactions still lines up with two stored rows rather than collapsing
    into one.
    """
    columns = ", ".join(DUPLICATE_KEY_COLUMNS)
    cursor = conn.execute(
        f"SELECT id, {columns} FROM transactions WHERE profile_id = ? ORDER BY id",
        (profile_id,),
    )

    ids: Dict[Tuple[str, ...], deque] = defaultdict(deque)
    for row in cursor.fetchall():
        key = tuple(normalize_key_part(value) for value in row[1:])
        ids[key].append(row[0])

    return ids


def load_csv_to_db(
    csv_path: str,
    override_existing: bool = False,
    profile_id: Optional[int] = None,
) -> LoadResult:
    """Load a CSV into one profile's transactions without discarding what's there.

    Every row is written with the given profile_id, and duplicate detection
    only looks at that profile — uploading the same statement under two
    profiles keeps two independent copies.

    A row whose date and description already exist in the profile is left
    alone, so only genuinely new transactions are added. Existing rows are
    never deleted; edits made in the app (category, reimbursed flag) therefore
    survive re-uploading an overlapping statement.

    When override_existing is true, matching rows are updated in place from the
    CSV instead of being skipped. Only the columns the CSV actually provides
    are written, so an export missing an optional column won't blank it out.
    A row never changes profile this way: profile_id is left out of the update.
    """
    df = read_transactions_csv(csv_path)
    columns: List[str] = list(df.columns)

    insert_columns = columns + ["profile_id"]
    insert_sql = (
        f"INSERT INTO transactions ({', '.join(insert_columns)}) "
        f"VALUES ({', '.join('?' for _ in insert_columns)})"
    )
    update_sql = (
        f"UPDATE transactions SET {', '.join(f'{col} = ?' for col in columns)} "
        "WHERE id = ?"
    )

    inserted = updated = skipped = 0

    conn = connect()
    try:
        # Falls back to the default profile so a bare /load-csv still works
        target_profile_id = resolve_target_profile_id(conn, profile_id)
        pending_ids = existing_ids_by_key(conn, target_profile_id)

        for record in df.to_dict(orient="records"):
            values = [to_sql_value(record.get(col)) for col in columns]
            queued = pending_ids.get(build_key(record))

            if queued:
                # Claim the id so a second copy in this file doesn't match it
                existing_id = queued.popleft()
                if override_existing:
                    conn.execute(update_sql, values + [existing_id])
                    updated += 1
                else:
                    skipped += 1
                continue

            conn.execute(insert_sql, values + [target_profile_id])
            inserted += 1

        conn.commit()
    finally:
        conn.close()

    return LoadResult(inserted=inserted, updated=updated, skipped=skipped)


def describe_load_result(result: LoadResult, override_existing: bool) -> str:
    """Human-readable summary of a load, for API responses."""
    parts = [f"added {result.inserted} new transactions"]

    if override_existing:
        parts.append(f"overwrote {result.updated} existing")
    else:
        parts.append(f"skipped {result.skipped} already in the database")

    return f"Processed {result.total_rows} rows: {', '.join(parts)}"
