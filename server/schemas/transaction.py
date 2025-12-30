from pydantic import BaseModel
from typing import List, Optional


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
