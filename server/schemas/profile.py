from typing import List, Optional

from pydantic import BaseModel, Field

from db.profiles import MAX_NAME_LENGTH


class Profile(BaseModel):
    id: int
    name: str
    created_at: Optional[str] = None
    transaction_count: int = 0


class ProfileList(BaseModel):
    profiles: List[Profile]


class ProfileNameIn(BaseModel):
    """Body for creating and renaming — both only ever take a name."""

    name: str = Field(..., min_length=1, max_length=MAX_NAME_LENGTH)


class DeletedProfile(BaseModel):
    message: str
    profile: Profile
