import math
import sqlite3
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from db.filters import TransactionFilters, TransactionSort
from models.enums import Category, TransactionType, SortBy, SortOrder, CategoryOut
from schemas.transaction import Transaction, PaginatedResponse
from db.database import connect

router = APIRouter()

# Every column the Transaction schema expects. Kept in one place so the list
# query and the single-row lookups below can't drift apart.
TRANSACTION_COLUMNS = """
    id, account_type, account_number, transaction_date,
    cheque_number, description_1, description_2,
    cad_amount, usd_amount, category, is_reimbursed, profile_id
"""


def to_transaction(row) -> Transaction:
    row_dict = dict(row)
    row_dict["category"] = CategoryOut.from_category(Category(row_dict["category"]))
    return Transaction(**row_dict)


@router.get("/transactions", response_model=PaginatedResponse)
async def get_transactions(
        category: Optional[str] = Query(None, description="Category to filter by"),
        profile_id: Optional[int] = Query(
            None,
            description="Only return transactions in this profile. Omit for every profile.",
        ),
        page: int = Query(1, ge=1),
        page_size: int = Query(10, ge=1, le=10000000),
        start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
        transaction_type: TransactionType = Query(TransactionType.DEBIT, description="Filter by transaction type"),
        sort_by: SortBy = Query(SortBy.DATE, description="Sort by date or amount"),
        sort_order: SortOrder = Query(SortOrder.DESCENDING, description="Sort order"),
):
    filters = TransactionFilters(
        profile_id=profile_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type,
    )
    where_clause, params = filters.where()

    conn = connect()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get count and total with filters
    cursor.execute(
        f"SELECT COUNT(*) AS count, SUM(cad_amount) AS total FROM transactions WHERE {where_clause}",
        params,
    )
    result = cursor.fetchone()
    total_items = result["count"]
    category_total = result["total"] or 0.0

    if total_items == 0:
        conn.close()

        applied = filters.describe()
        detail = "No transactions found"
        if applied:
            detail += f" for {applied}"

        raise HTTPException(status_code=404, detail=detail)

    total_pages = math.ceil(total_items / page_size)
    offset = (page - 1) * page_size

    # Build ORDER BY clause
    order_clause = TransactionSort(sort_by, sort_order).order_by()

    # Get paginated transactions with filters and sorting
    cursor.execute(
        f"""
        SELECT {TRANSACTION_COLUMNS}
        FROM transactions
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ? OFFSET ?
        """,
        params + [page_size, offset],
    )

    rows = cursor.fetchall()
    conn.close()

    transactions = [to_transaction(row) for row in rows]

    return PaginatedResponse(
        data=transactions,
        metadata={
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_items": total_items,
            "category_total": round(category_total, 2),
            "category": category,
            "profile_id": profile_id,
            "start_date": start_date,
            "end_date": end_date,
            "transaction_type": transaction_type,
            "sort_by": sort_by,
            "sort_order": sort_order,
        },
    )


@router.patch("/transactions/{transaction_id}/category", response_model=Transaction)
async def update_transaction_category(
        transaction_id: int,
        category: Category = Query(..., description="New category for the transaction"),
):
    if category == Category.ALL:
        raise HTTPException(status_code=400, detail="Cannot set a transaction to this category")

    conn = connect()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE transactions SET category = ? WHERE id = ?",
        (category.value, transaction_id),
    )

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")

    conn.commit()

    cursor.execute(
        f"""
        SELECT {TRANSACTION_COLUMNS}
        FROM transactions
        WHERE id = ?
        """,
        (transaction_id,),
    )

    row = cursor.fetchone()
    conn.close()

    return to_transaction(row)


@router.patch("/transactions/{transaction_id}/reimbursed", response_model=Transaction)
async def update_transaction_reimbursed(
        transaction_id: int,
        is_reimbursed: bool = Query(..., description="Whether this transaction has been reimbursed"),
):
    conn = connect()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE transactions SET is_reimbursed = ? WHERE id = ?",
        (int(is_reimbursed), transaction_id),
    )

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")

    conn.commit()

    cursor.execute(
        f"""
        SELECT {TRANSACTION_COLUMNS}
        FROM transactions
        WHERE id = ?
        """,
        (transaction_id,),
    )

    row = cursor.fetchone()
    conn.close()

    return to_transaction(row)
