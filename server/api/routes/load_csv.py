from fastapi import APIRouter, HTTPException

from db.database import init_db
from db.loaders import load_csv_to_db

router = APIRouter()


@router.post("/load-csv")
async def load_csv(csv_path: str):
    try:
        init_db()
        row_count = load_csv_to_db(csv_path)
        return {
            "message": f"Successfully loaded {row_count} transactions",
            "rows": row_count,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
