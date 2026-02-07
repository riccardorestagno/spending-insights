import math
import sqlite3
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from models.enums import Category, TransactionType, SortBy, SortOrder
from schemas.transaction import Transaction, PaginatedResponse
from core.config import DB_PATH

router = APIRouter()


@router.get("/transactions", response_model=PaginatedResponse)
async def get_transactions(
        category: Optional[str] = Query(None, description="Category to filter by"),
        page: int = Query(1, ge=1),
        page_size: int = Query(10, ge=1, le=10000000),
        start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
        transaction_type: TransactionType = Query(TransactionType.DEBIT, description="Filter by transaction type"),
        sort_by: SortBy = Query(SortBy.DATE, description="Sort by date or amount"),
        sort_order: SortOrder = Query(SortOrder.DESCENDING, description="Sort order"),
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Build WHERE clause with optional category, date, and transaction type filters
    where_conditions = []
    params = []

    if category and category != Category.ALL:
        where_conditions.append("category = ?")
        params.append(category)

    if start_date:
        where_conditions.append("transaction_date >= ?")
        params.append(start_date)

    if end_date:
        where_conditions.append("transaction_date <= ?")
        params.append(end_date)

    if transaction_type == TransactionType.DEBIT:
        where_conditions.append("cad_amount < 0")
    elif transaction_type == TransactionType.CREDIT:
        where_conditions.append("cad_amount > 0")
    # If "all", no condition is added

    # Build WHERE clause or use "1=1" if no conditions
    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

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
        filter_desc = []
        if category:
            filter_desc.append(f"category: {category}")
        if transaction_type != TransactionType.ALL:
            filter_desc.append(f"transaction type: {transaction_type}")
        if start_date or end_date:
            filter_desc.append("the given date range")

        detail = "No transactions found"
        if filter_desc:
            detail += f" for {' with '.join(filter_desc)}"

        raise HTTPException(status_code=404, detail=detail)

    total_pages = math.ceil(total_items / page_size)
    offset = (page - 1) * page_size

    # Build ORDER BY clause
    sort_column = "transaction_date" if sort_by == SortBy.DATE else "cad_amount"
    order_direction = "ASC" if sort_order == SortOrder.ASCENDING else "DESC"
    order_clause = f"{sort_column} {order_direction}"

    # Get paginated transactions with filters and sorting
    cursor.execute(
        f"""
        SELECT id, account_type, account_number, transaction_date,
               cheque_number, description_1, description_2,
               cad_amount, usd_amount, category
        FROM transactions
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ? OFFSET ?
        """,
        params + [page_size, offset],
    )

    rows = cursor.fetchall()
    conn.close()

    transactions = [Transaction(**dict(row)) for row in rows]

    return PaginatedResponse(
        data=transactions,
        metadata={
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_items": total_items,
            "category_total": round(category_total, 2),
            "category": category,
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

    conn = sqlite3.connect(DB_PATH)
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
        """
        SELECT id, account_type, account_number, transaction_date,
               cheque_number, description_1, description_2,
               cad_amount, usd_amount, category
        FROM transactions
        WHERE id = ?
        """,
        (transaction_id,),
    )

    row = cursor.fetchone()
    conn.close()

    return Transaction(**dict(row))