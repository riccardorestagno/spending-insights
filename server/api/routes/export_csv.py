import csv
import io
import re
import sqlite3
from typing import List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from db.database import connect
from db.filters import TransactionFilters, TransactionSort
from db.profiles import ProfileNotFound, get_profile
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
    ("comment", "Comment"),
]

# Columns stored as 0/1 in SQLite but written as true/false so the file stays
# readable. db/loaders.py accepts either form on the way back in.
BOOLEAN_COLUMNS = {"is_reimbursed"}


def format_value(column: str, value) -> str:
    if column in BOOLEAN_COLUMNS:
        return "true" if value else "false"
    return "" if value is None else value


def build_filename(
    category: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    transaction_type: TransactionType,
    profile_name: Optional[str] = None,
) -> str:
    parts = ["transactions"]

    # Leads the name so exports from different profiles sort together per person
    if profile_name:
        parts.append(profile_name)

    parts.append(transaction_type.value)

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
    profile_id: Optional[int] = Query(
        None,
        description="Only export transactions in this profile. Omit for every profile.",
    ),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    transaction_type: TransactionType = Query(
        TransactionType.DEBIT, description="Filter by transaction type"
    ),
    sort_by: SortBy = Query(SortBy.DATE, description="Sort by date or amount"),
    sort_order: SortOrder = Query(SortOrder.DESCENDING, description="Sort order"),
):
    """Export every transaction matching the filters — no pagination applied.
    The export is scoped to a single profile whenever the caller passes one,
    so what lands in the file is exactly what the app is showing.
    """
    where_clause, params = TransactionFilters(
        profile_id=profile_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type
    ).where()
    order_clause = TransactionSort(sort_by, sort_order).order_by()

    sort_column = "transaction_date" if sort_by == SortBy.DATE else "cad_amount"
    direction = "ASC" if sort_order == SortOrder.ASCENDING else "DESC"

    profile_name: Optional[str] = None

    conn = connect()
    conn.row_factory = sqlite3.Row
    try:
        if profile_id is not None:
            try:
                profile_name = get_profile(conn, profile_id)["name"]
            except ProfileNotFound as e:
                raise HTTPException(status_code=404, detail=str(e))

        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT {", ".join(column for column, _ in CSV_COLUMNS)}
            FROM transactions
            WHERE {where_clause}
            ORDER BY {order_clause}
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

    filename = build_filename(
        category, start_date, end_date, transaction_type, profile_name
    )

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
