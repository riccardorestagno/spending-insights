import csv
import io
import re
import sqlite3
from typing import List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from core.config import DB_PATH
from models.enums import Category, SortBy, SortOrder, TransactionType

router = APIRouter()

# (db column, CSV header). The headers deliberately match the RBC export format
# that db/loaders.py expects, so a file exported here can be re-uploaded as-is.
CSV_COLUMNS: List[Tuple[str, str]] = [
    ("account_type", "Account Type"),
    ("account_number", "Account Number"),
    ("transaction_date", "Transaction Date"),
    ("cheque_number", "Cheque Number"),
    ("description_1", "Description 1"),
    ("description_2", "Description 2"),
    ("cad_amount", "CAD$"),
    ("usd_amount", "USD$"),
    ("category", "Category"),
    ("is_reimbursed", "Is Reimbursed"),
]

# Columns stored as 0/1 in SQLite but written as true/false so the file stays
# readable. db/loaders.py accepts either form on the way back in.
BOOLEAN_COLUMNS = {"is_reimbursed"}


def format_value(column: str, value) -> str:
    if column in BOOLEAN_COLUMNS:
        return "true" if value else "false"
    return "" if value is None else value


def build_filters(
    category: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    transaction_type: TransactionType,
) -> Tuple[str, list]:
    """Mirrors the filtering in /transactions so an export matches what's on screen."""
    conditions: List[str] = []
    params: list = []

    if category and category != Category.ALL:
        conditions.append("category = ?")
        params.append(category)

    if start_date:
        conditions.append("transaction_date >= ?")
        params.append(start_date)

    if end_date:
        conditions.append("transaction_date <= ?")
        params.append(end_date)

    if transaction_type == TransactionType.DEBIT:
        conditions.append("cad_amount < 0")
    elif transaction_type == TransactionType.CREDIT:
        conditions.append("cad_amount > 0")

    return (" AND ".join(conditions) if conditions else "1=1"), params


def build_filename(
    category: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    transaction_type: TransactionType,
) -> str:
    parts = ["transactions", transaction_type.value]

    if category and category != Category.ALL:
        parts.append(category)

    if start_date and end_date:
        parts.append(f"{start_date}_to_{end_date}")
    elif start_date:
        parts.append(f"from_{start_date}")
    elif end_date:
        parts.append(f"until_{end_date}")

    stem = "_".join(parts)
    # Keep the header value safe to quote and safe as a filename on any OS
    stem = re.sub(r"[^A-Za-z0-9_.-]", "_", stem)
    return f"{stem}.csv"


@router.get("/export-csv")
async def export_csv(
    category: Optional[str] = Query(None, description="Category to filter by"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    transaction_type: TransactionType = Query(
        TransactionType.DEBIT, description="Filter by transaction type"
    ),
    sort_by: SortBy = Query(SortBy.DATE, description="Sort by date or amount"),
    sort_order: SortOrder = Query(SortOrder.DESCENDING, description="Sort order"),
):
    """Export every transaction matching the filters — no pagination applied."""
    where_clause, params = build_filters(category, start_date, end_date, transaction_type)

    sort_column = "transaction_date" if sort_by == SortBy.DATE else "cad_amount"
    direction = "ASC" if sort_order == SortOrder.ASCENDING else "DESC"

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT {", ".join(column for column, _ in CSV_COLUMNS)}
            FROM transactions
            WHERE {where_clause}
            ORDER BY {sort_column} {direction}
            """,
            params,
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    if not rows:
        raise HTTPException(
            status_code=404, detail="No transactions match the current filters"
        )

    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow([header for _, header in CSV_COLUMNS])
    for row in rows:
        writer.writerow(
            [format_value(column, row[column]) for column, _ in CSV_COLUMNS]
        )

    filename = build_filename(category, start_date, end_date, transaction_type)

    return StreamingResponse(
        # Leading BOM so Excel reads accented merchant names correctly
        iter(["\ufeff" + buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            # Without this, CORS hides the header and the browser can't read the name
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
