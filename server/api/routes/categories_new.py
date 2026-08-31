import sqlite3
from fastapi import APIRouter, Query
from typing import Optional

from db.database import connect
from db.filters import TransactionFilters
from models.enums import Category, TransactionType

router = APIRouter()


@router.get("/categories")
async def get_categories(
        profile_id: Optional[int] = Query(
            None,
            description="Only count transactions in this profile. Omit for every profile.",
        ),
        start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
        transaction_type: TransactionType = Query(TransactionType.DEBIT, description="Filter by transaction type"),
):
    # No category filter here — the whole point is to group by it — so that
    # field is left unset and its condition drops out
    where_clause, params = TransactionFilters(
        profile_id=profile_id,
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type,
    ).where()

    conn = connect()
    cursor = conn.cursor()

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

    categories = [
        {
            "value": row[0],
            "description": Category(row[0]).description,
            "transaction_count": row[1],
            "total": round(row[2], 2),
        }
        for row in results
    ]

    all_transactions = {
        "value": Category.ALL,
        "description": Category.ALL.description,
        "transaction_count": sum(category["transaction_count"] for category in categories),
        "total": sum(category["total"] for category in categories),
    }

    categories.insert(0, all_transactions)

    return {
        "categories": categories
    }
