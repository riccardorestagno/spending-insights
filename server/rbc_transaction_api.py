import sqlite3
import pandas as pd
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import math


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (if needed)

app = FastAPI(title="RBC Transaction API", lifespan=lifespan)

# Database configuration
DB_PATH = "data/transactions.db"


# Pydantic models
class Transaction(BaseModel):
    id: int
    account_type: str
    account_number: str
    transaction_date: str
    cheque_number: Optional[str]
    description_1: str
    description_2: Optional[str]
    cad_amount: float
    usd_amount: Optional[float]
    category: str


class PaginatedResponse(BaseModel):
    data: List[Transaction]
    metadata: dict


# Database functions
def init_db():
    """Initialize the database with transactions table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_type TEXT,
            account_number TEXT,
            transaction_date TEXT,
            cheque_number TEXT,
            description_1 TEXT,
            description_2 TEXT,
            cad_amount REAL,
            usd_amount REAL,
            category TEXT
        )
    """)

    conn.commit()
    conn.close()


def load_csv_to_db(csv_path: str):
    """Load categorized CSV into SQLite database."""
    df = pd.read_csv(csv_path)

    # Validate required columns
    required_columns = ['Account Type', 'Account Number', 'Transaction Date',
                        'Description 1', 'CAD$', 'Category']

    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Rename columns to match database schema
    df = df.rename(columns={
        'Account Type': 'account_type',
        'Account Number': 'account_number',
        'Transaction Date': 'transaction_date',
        'Cheque Number': 'cheque_number',
        'Description 1': 'description_1',
        'Description 2': 'description_2',
        'CAD$': 'cad_amount',
        'USD$': 'usd_amount',
        'Category': 'category'
    })

    # Select only the columns we need
    columns_to_keep = ['account_type', 'account_number', 'transaction_date',
                       'cheque_number', 'description_1', 'description_2',
                       'cad_amount', 'usd_amount', 'category']
    df = df[[col for col in columns_to_keep if col in df.columns]]

    # Connect and insert
    conn = sqlite3.connect(DB_PATH)

    # Clear existing data
    conn.execute("DELETE FROM transactions")

    # Insert new data
    df.to_sql('transactions', conn, if_exists='append', index=False)

    row_count = len(df)
    conn.close()

    return row_count


# API endpoints
@app.get("/transactions", response_model=PaginatedResponse)
async def get_transactions(
        category: str = Query(..., description="Category to filter by"),
        page: int = Query(1, ge=1, description="Page number (starts at 1)"),
        page_size: int = Query(10, ge=1, le=100, description="Number of items per page")
):
    """
    Get paginated transactions by category.

    Returns transactions with metadata including:
    - page: current page number
    - page_size: items per page
    - total_pages: total number of pages
    - total_items: total number of transactions in category
    - category_total: sum of all CAD amounts in the category
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get total count and sum for the category
    cursor.execute(
        "SELECT COUNT(*) as count, SUM(cad_amount) as total FROM transactions WHERE category = ?",
        (category,)
    )
    result = cursor.fetchone()
    total_items = result['count']
    category_total = result['total'] or 0.0

    if total_items == 0:
        conn.close()
        raise HTTPException(status_code=404, detail=f"No transactions found for category: {category}")

    # Calculate pagination
    total_pages = math.ceil(total_items / page_size)
    offset = (page - 1) * page_size

    # Get paginated data
    cursor.execute(
        """
        SELECT id, account_type, account_number, transaction_date, cheque_number,
               description_1, description_2, cad_amount, usd_amount, category
        FROM transactions
        WHERE category = ?
        ORDER BY transaction_date DESC
        LIMIT ? OFFSET ?
        """,
        (category, page_size, offset)
    )

    rows = cursor.fetchall()
    conn.close()

    # Convert to Transaction objects
    transactions = [
        Transaction(
            id=row['id'],
            account_type=row['account_type'],
            account_number=row['account_number'],
            transaction_date=row['transaction_date'],
            cheque_number=row['cheque_number'],
            description_1=row['description_1'],
            description_2=row['description_2'],
            cad_amount=row['cad_amount'],
            usd_amount=row['usd_amount'],
            category=row['category']
        )
        for row in rows
    ]

    return PaginatedResponse(
        data=transactions,
        metadata={
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_items": total_items,
            "category_total": round(category_total, 2)
        }
    )


@app.get("/categories")
async def get_categories():
    """Get all available categories with transaction counts and totals."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT category, COUNT(*) as count, SUM(cad_amount) as total
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
                "total": round(row[2], 2)
            }
            for row in results
        ]
    }


@app.post("/load-csv")
async def load_csv(csv_path: str):
    """Load a categorized CSV file into the database."""
    try:
        init_db()
        row_count = load_csv_to_db(csv_path)
        return {
            "message": f"Successfully loaded {row_count} transactions",
            "rows": row_count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
async def root():
    """API information."""
    return {
        "message": "RBC Transaction API",
        "endpoints": {
            "/transactions": "Get paginated transactions by category",
            "/categories": "List all categories with counts and totals",
            "/load-csv": "Load a CSV file into the database"
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
