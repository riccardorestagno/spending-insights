"""SQL fragments shared by every read of the transactions table.

/transactions, /categories and /export-csv answer the same question in three
shapes, so they have to filter identically — the moment they drift, an export
stops matching what's on screen.

Column names and directions are interpolated into the SQL rather than bound,
which is safe only because they come from enums here; the values a caller
supplies stay parameterized.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple

from models.enums import Category, SortBy, SortOrder, TransactionType


@dataclass(frozen=True)
class TransactionFilters:
    profile_id: Optional[int] = None
    category: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    transaction_type: TransactionType = TransactionType.DEBIT

    def where(self) -> Tuple[str, list]:
        """Returns a WHERE body and its params — '1=1' when nothing is filtered."""
        conditions: List[str] = []
        params: list = []

        if self.profile_id is not None:
            conditions.append("profile_id = ?")
            params.append(self.profile_id)

        if self.category and self.category != Category.ALL:
            conditions.append("category = ?")
            params.append(self.category)

        if self.start_date:
            conditions.append("transaction_date >= ?")
            params.append(self.start_date)

        if self.end_date:
            conditions.append("transaction_date <= ?")
            params.append(self.end_date)

        if self.transaction_type == TransactionType.DEBIT:
            conditions.append("cad_amount < 0")
        elif self.transaction_type == TransactionType.CREDIT:
            conditions.append("cad_amount > 0")
        # "all" adds nothing

        return (" AND ".join(conditions) if conditions else "1=1"), params


@dataclass(frozen=True)
class TransactionSort:
    sort_by: SortBy = SortBy.DATE
    sort_order: SortOrder = SortOrder.DESCENDING

    def order_by(self) -> str:
        column = "transaction_date" if self.sort_by == SortBy.DATE else "cad_amount"
        direction = "ASC" if self.sort_order == SortOrder.ASCENDING else "DESC"
        return f"{column} {direction}"
      
