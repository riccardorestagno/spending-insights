import math
import sqlite3
from fastapi import APIRouter, Query, HTTPException

from schemas.transaction import Transaction, PaginatedResponse
from core.config import DB_PATH

router = APIRouter()


@router.get("/transactions", response_model=PaginatedResponse)
async def get_transactions(
    category: str = Query(..., description="Category to filter by"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) AS count, SUM(cad_amount) AS total FROM transactions WHERE category = ?",
        (category,),
    )
    result = cursor.fetchone()
    total_items = result["count"]
    category_total = result["total"] or 0.0

    if total_items == 0:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail=f"No transactions found for category: {category}",
        )

    total_pages = math.ceil(total_items / page_size)
    offset = (page - 1) * page_size

    cursor.execute(
        """
        SELECT id, account_type, account_number, transaction_date,
               cheque_number, description_1, description_2,
               cad_amount, usd_amount, category
        FROM transactions
        WHERE category = ?
        ORDER BY transaction_date DESC
        LIMIT ? OFFSET ?
        """,
        (category, page_size, offset),
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
        },
    )
