import sqlite3
from typing import Literal

from fastapi import APIRouter, Query

from core.config import DB_PATH

router = APIRouter()


@router.get("/categories")
async def get_categories(
        transaction_type: Literal["all", "debit", "credit"] = Query("debit", description="Filter by transaction type"),
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    where_conditions = []

    if transaction_type == "debit":
        where_conditions.append("cad_amount < 0")
    elif transaction_type == "credit":
        where_conditions.append("cad_amount > 0")

    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

    cursor.execute(f"""
        SELECT category, COUNT(*) AS count, SUM(cad_amount) AS total
        FROM transactions
        WHERE {where_clause}
        GROUP BY category
        ORDER BY category
    """)

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
