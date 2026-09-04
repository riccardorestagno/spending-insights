from fastapi import APIRouter, HTTPException

from db.database import connect, init_db
from db.profiles import (
    DuplicateProfileName,
    InvalidProfileName,
    ProfileNotFound,
    create_profile,
    delete_profile,
    get_profile,
    list_profiles,
    rename_profile,
)
from schemas.profile import DeletedProfile, Profile, ProfileList, ProfileNameIn

router = APIRouter(prefix="/profiles", tags=["profiles"])


def to_http_error(error: Exception) -> HTTPException:
    """Map the storage layer's errors onto status codes the client can act on."""
    if isinstance(error, ProfileNotFound):
        return HTTPException(status_code=404, detail=str(error))
    if isinstance(error, DuplicateProfileName):
        return HTTPException(status_code=409, detail=str(error))
    if isinstance(error, InvalidProfileName):
        return HTTPException(status_code=400, detail=str(error))
    return HTTPException(status_code=500, detail=str(error))


@router.get("", response_model=ProfileList)
async def get_profiles():
    """List every profile with its transaction count.

    An empty list is a normal state, not an error: a fresh database has no
    profiles until the first upload creates one.
    """
    # A GET may well be the first request after startup on a fresh database
    init_db()

    conn = connect()
    try:
        return ProfileList(profiles=list_profiles(conn))
    finally:
        conn.close()


@router.post("", response_model=Profile, status_code=201)
async def add_profile(payload: ProfileNameIn):
    init_db()

    conn = connect()
    try:
        return Profile(**create_profile(conn, payload.name))
    except (DuplicateProfileName, InvalidProfileName) as e:
        raise to_http_error(e)
    finally:
        conn.close()


@router.patch("/{profile_id}", response_model=Profile)
async def update_profile_name(profile_id: int, payload: ProfileNameIn):
    """Rename a profile.

    Only the profiles table is written: transactions store the profile's id,
    so none of their rows are touched by a rename.
    """
    conn = connect()
    try:
        return Profile(**rename_profile(conn, profile_id, payload.name))
    except (ProfileNotFound, DuplicateProfileName, InvalidProfileName) as e:
        raise to_http_error(e)
    finally:
        conn.close()


@router.delete("/{profile_id}", response_model=DeletedProfile)
async def remove_profile(profile_id: int):
    """Delete a profile and every transaction inside it. Not reversible."""
    conn = connect()
    try:
        profile = delete_profile(conn, profile_id)
    except ProfileNotFound as e:
        raise to_http_error(e)
    finally:
        conn.close()

    return DeletedProfile(
        message=(
            f'Deleted profile "{profile["name"]}" and its '
            f'{profile["transaction_count"]} transactions'
        ),
        profile=Profile(**profile),
    )


@router.get("/{profile_id}", response_model=Profile)
async def get_single_profile(profile_id: int):
    conn = connect()
    try:
        return Profile(**get_profile(conn, profile_id))
    except ProfileNotFound as e:
        raise to_http_error(e)
    finally:
        conn.close()
