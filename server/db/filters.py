"""SQL fragments shared by every read of the transactions table.

/transactions, /categories and /export-csv answer the same question in three
shapes, so they have to filter identically — the moment they drift, an export
stops matching what's on screen.

Column names and sort directions are interpolated into the SQL rather than
bound, which is only safe because they come from the enums in models.enums.
Everything a caller supplies stays parameterized.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple

from models.enums import Category, SortBy, SortOrder, TransactionType


@dataclass(frozen=True)
class TransactionFilters:
    """The filters every transactions query understands.

    Each field is optional, so a caller only sets what it exposes: /categories
    has no category parameter and simply leaves it None, which drops that one
    condition and keeps the rest identical to the other endpoints.
    """

    profile_id: Optional[int] = None
    category: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    transaction_type: TransactionType = TransactionType.DEBIT

    def where(self) -> Tuple[str, list]:
        """Build the body of a WHERE clause and the params to go with it.

        Returns "1=1" when nothing is filtered, so callers can always
        interpolate it without special-casing an empty clause.
        """
        conditions: List[str] = []
        params: list = []

        if self.profile_id is not None:
            conditions.append("profile_id = ?")
            params.append(self.profile_id)

        # Category.ALL is a UI convenience, not a stored value
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
        # If "all", no condition is added

        return (" AND ".join(conditions) if conditions else "1=1"), params

    def describe(self) -> str:
        """Plain-language summary of what was filtered, for 404 messages."""
        parts: List[str] = []

        if self.profile_id is not None:
            parts.append(f"profile: {self.profile_id}")
        if self.category:
            parts.append(f"category: {self.category}")
        if self.transaction_type != TransactionType.ALL:
            parts.append(f"transaction type: {self.transaction_type}")
        if self.start_date or self.end_date:
            parts.append("the given date range")

        return " with ".join(parts)


@dataclass(frozen=True)
class TransactionSort:
    """The two sortable columns, mapped to SQL."""

    sort_by: SortBy = SortBy.DATE
    sort_order: SortOrder = SortOrder.DESCENDING

    def order_by(self) -> str:
        column = "transaction_date" if self.sort_by == SortBy.DATE else "cad_amount"
        direction = "ASC" if self.sort_order == SortOrder.ASCENDING else "DESC"
        return f"{column} {direction}"
        
