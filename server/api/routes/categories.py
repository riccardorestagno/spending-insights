import sqlite3
from fastapi import APIRouter

from core.config import DB_PATH

router = APIRouter()


@router.get("/categories")
async def get_categories():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT category, COUNT(*) AS count, SUM(cad_amount) AS total
        FROM transactions
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
