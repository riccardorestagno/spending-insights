from enum import Enum

from pydantic import BaseModel


class SortBy(str, Enum):
    DATE = "date"
    AMOUNT = "amount"


class SortOrder(str, Enum):
    ASCENDING = "asc"
    DESCENDING = "desc"


class TransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"
    ALL = "all"


class Category(str, Enum):
    ALL = "All"
    ENTERTAINMENT = "Entertainment"
    GROCERIES = "Groceries"
    HEALTHCARE = "Healthcare"
    HOUSING = "Housing"
    INSURANCE = "Insurance"
    OTHER = "Other"
    RESTAURANTS = "Restaurants"
    SHOPPING = "Shopping"
    SUBSCRIPTIONS = "Subscriptions"
    TRANSFERS = "Transfers"
    TRANSPORTATION = "Transportation"
    TRAVEL = "Travel"
    UTILITIES = "Utilities"

    @property
    def description(self) -> str:
        return _CATEGORY_DESCRIPTIONS[self]

class CategoryOut(BaseModel):
    value: str
    description: str

    @classmethod
    def from_category(cls, category: Category) -> "CategoryOut":
        return cls(value=category.value, description=category.description)

_CATEGORY_DESCRIPTIONS: dict[Category, str] = {
    Category.ALL: "All Categories",
    Category.GROCERIES: "Groceries",
    Category.RESTAURANTS: "Restaurants & Dining",
    Category.TRANSPORTATION: "Transportation",
    Category.SHOPPING: "Shopping & Retail",
    Category.ENTERTAINMENT: "Entertainment",
    Category.HEALTHCARE: "Healthcare",
    Category.UTILITIES: "Bills & Utilities",
    Category.INSURANCE: "Insurance",
    Category.HOUSING: "Housing",
    Category.TRAVEL: "Travel",
    Category.SUBSCRIPTIONS: "Subscriptions",
    Category.TRANSFERS: "Transfers",
    Category.OTHER: "Other",
}
