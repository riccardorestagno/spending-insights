import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.config import DB_PATH
from db.database import init_db
from db.loaders import describe_load_result, load_csv_to_db

router = APIRouter()

# Uploads land next to the SQLite file (i.e. server/data/)
UPLOAD_DIR = Path(DB_PATH).parent


@router.post("/load-csv")
async def load_csv(csv_path: str, override_existing: bool = False):
    """Load a CSV from a server-side path.

    By default, only transactions that aren't already stored are added; pass
    override_existing=true to overwrite matching rows with the CSV's values.
    """
    try:
        init_db()
        result = load_csv_to_db(csv_path, override_existing=override_existing)
        return {
            "message": describe_load_result(result, override_existing),
            "rows": result.changed_rows,
            "inserted": result.inserted,
            "updated": result.updated,
            "skipped": result.skipped,
            "total_rows": result.total_rows,
            "override_existing": override_existing,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    override_existing: bool = Form(False),
):
    """Accept a CSV uploaded from the browser, save it, then load it into the DB.

    Unlike /load-csv, this does not need a server-side path: the browser sends
    the file itself as multipart/form-data. Duplicate handling matches
    /load-csv: existing transactions are kept unless override_existing is set.
    """
    # Path(...).name strips any directory components in the client-supplied name
    filename = Path(file.filename or "").name

    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / filename

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not save upload: {e}")
    finally:
        await file.close()

    try:
        init_db()
        result = load_csv_to_db(str(destination), override_existing=override_existing)
    except Exception as e:
        # Don't leave a rejected file sitting in data/
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": describe_load_result(result, override_existing),
        "filename": filename,
        "rows": result.changed_rows,
        "inserted": result.inserted,
        "updated": result.updated,
        "skipped": result.skipped,
        "total_rows": result.total_rows,
        "override_existing": override_existing,
    }
