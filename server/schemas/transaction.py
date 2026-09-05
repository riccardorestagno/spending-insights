from pydantic import BaseModel, Field
from typing import List, Optional

from models.enums import CategoryOut

# Long enough for a real explanation of a charge, short enough that the column
# stays a note rather than a document. Mirrored in the client's textarea.
MAX_COMMENT_LENGTH = 1000


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
    category: CategoryOut
    is_reimbursed: bool = False
    # None means "no note". Never an empty string — the API normalizes blank
    # input to NULL so the client only has one empty case to handle.
    comment: Optional[str] = None
    # Nullable only for rows that predate profiles and haven't been adopted yet
    profile_id: Optional[int] = None


class TransactionCommentUpdate(BaseModel):
    """Body for setting a transaction's note.

    Sent as a body rather than a query parameter because the text is free-form:
    it can run to a paragraph and contain newlines, both of which make for a
    poor URL.
    """

    comment: Optional[str] = Field(None, max_length=MAX_COMMENT_LENGTH)


class PaginatedResponse(BaseModel):
    data: List[Transaction]
    metadata: dict
