import shutil
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from core.config import DB_PATH
from db.database import connect, init_db
from db.loaders import describe_load_result, load_csv_to_db
from db.profiles import (
    DuplicateProfileName,
    InvalidProfileName,
    ProfileNotFound,
    get_profile,
    resolve_target_profile_id,
)

router = APIRouter()

# Uploads land next to the SQLite file (i.e. server/data/)
UPLOAD_DIR = Path(DB_PATH).parent


def resolve_profile(
    profile_id: Optional[int], profile_name: Optional[str]
) -> Dict[str, Any]:
    """Decide which profile a load writes into, creating it when asked to.

    An id selects an existing profile; a name creates one (or reuses the
    profile already using that name); neither falls back to the default
    profile, so a plain `curl /load-csv?csv_path=...` still works.
    """
    init_db()

    conn = connect()
    try:
        target_id = resolve_target_profile_id(conn, profile_id, profile_name)
        return get_profile(conn, target_id)
    except ProfileNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except DuplicateProfileName as e:
        raise HTTPException(status_code=409, detail=str(e))
    except InvalidProfileName as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


def load_response(
    result, override_existing: bool, profile: Dict[str, Any], **extra
) -> Dict[str, Any]:
    return {
        "message": (
            f"{describe_load_result(result, override_existing)} "
            f'in profile "{profile["name"]}"'
        ),
        "profile": {"id": profile["id"], "name": profile["name"]},
        "rows": result.changed_rows,
        "inserted": result.inserted,
        "updated": result.updated,
        "skipped": result.skipped,
        "total_rows": result.total_rows,
        "override_existing": override_existing,
        **extra,
    }


@router.post("/load-csv")
async def load_csv(
    csv_path: str,
    override_existing: bool = False,
    profile_id: Optional[int] = Query(
        None, description="Load into this existing profile"
    ),
    profile_name: Optional[str] = Query(
        None,
        description="Load into a profile with this name, creating it if needed. "
        "Ignored when profile_id is given.",
    ),
):
    """Load a CSV from a server-side path into one profile.

    By default, only transactions that aren't already in that profile are
    added; pass override_existing=true to overwrite matching rows with the
    CSV's values.
    """
    profile = resolve_profile(profile_id, profile_name)

    try:
        result = load_csv_to_db(
            csv_path,
            override_existing=override_existing,
            profile_id=profile["id"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return load_response(result, override_existing, profile)


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    override_existing: bool = Form(False),
    profile_id: Optional[int] = Form(
        None, description="Load into this existing profile"
    ),
    profile_name: Optional[str] = Form(
        None,
        description="Load into a profile with this name, creating it if needed. "
        "Ignored when profile_id is given.",
    ),
):
    """Accept a CSV uploaded from the browser, save it, then load it into the DB.

    Unlike /load-csv, this does not need a server-side path: the browser sends
    the file itself as multipart/form-data. Duplicate handling matches
    /load-csv, and both take the same profile arguments: an existing
    profile_id, a profile_name to create, or neither for the default profile.
    """
    # Path(...).name strips any directory components in the client-supplied name
    filename = Path(file.filename or "").name

    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    # Resolved before the file is written so a bad profile fails cleanly
    profile = resolve_profile(profile_id, profile_name)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # Namespaced per profile so two people uploading "export.csv" don't
    # overwrite each other's saved copy
    destination = UPLOAD_DIR / f"profile-{profile['id']}-{filename}"

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not save upload: {e}")
    finally:
        await file.close()

    try:
        result = load_csv_to_db(
            str(destination),
            override_existing=override_existing,
            profile_id=profile["id"],
        )
    except Exception as e:
        # Don't leave a rejected file sitting in data/
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))

    return load_response(result, override_existing, profile, filename=filename)
