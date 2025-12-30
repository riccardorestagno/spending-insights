import math
import sqlite3
from typing import Optional, Literal
from fastapi import APIRouter, Query, HTTPException

from schemas.transaction import Transaction, PaginatedResponse
from core.config import DB_PATH

router = APIRouter()


@router.get("/transactions", response_model=PaginatedResponse)
async def get_transactions(
    category: str = Query(..., description="Category to filter by"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    sort_by: Literal["date", "amount"] = Query("date", description="Sort by date or amount"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Build WHERE clause with date filters
    where_conditions = ["category = ?"]
    params = [category]

    if start_date:
        where_conditions.append("transaction_date >= ?")
        params.append(start_date)

    if end_date:
        where_conditions.append("transaction_date <= ?")
        params.append(end_date)

    where_clause = " AND ".join(where_conditions)

    # Get count and total with date filters
    cursor.execute(
        f"SELECT COUNT(*) AS count, SUM(cad_amount) AS total FROM transactions WHERE {where_clause}",
        params,
    )
    result = cursor.fetchone()
    total_items = result["count"]
    category_total = result["total"] or 0.0

    if total_items == 0:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail=f"No transactions found for category: {category} with the given date range",
        )

    total_pages = math.ceil(total_items / page_size)
    offset = (page - 1) * page_size

    # Build ORDER BY clause
    sort_column = "transaction_date" if sort_by == "date" else "cad_amount"
    order_direction = "ASC" if sort_order == "asc" else "DESC"
    order_clause = f"{sort_column} {order_direction}"

    # Get paginated transactions with date filters and sorting
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
            "start_date": start_date,
            "end_date": end_date,
            "sort_by": sort_by,
            "sort_order": sort_order,
        },
    )
