import sqlite3
from fastapi import APIRouter, Query
from typing import Literal, Optional

from core.config import DB_PATH

router = APIRouter()


@router.get("/categories")
async def get_categories(
        start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
        transaction_type: Literal["all", "debit", "credit"] = Query("debit", description="Filter by transaction type"),
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    where_conditions = []
    params = []

    if start_date:
        where_conditions.append("transaction_date >= ?")
        params.append(start_date)

    if end_date:
        where_conditions.append("transaction_date <= ?")
        params.append(end_date)

    if transaction_type == "debit":
        where_conditions.append("cad_amount < 0")
    elif transaction_type == "credit":
        where_conditions.append("cad_amount > 0")

    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

    cursor.execute(
        f"""
            SELECT category, COUNT(*) AS count, SUM(cad_amount) AS total
            FROM transactions
            WHERE {where_clause}
            GROUP BY category
            ORDER BY category
        """,
        params,
    )

    results = cursor.fetchall()
    conn.close()

    return {
        "categories": [
            {
                "name": row[0],
                "transaction_count": row[1],
                "total": round(row[2], 2),
            }
            for row in results
        ]
    }
