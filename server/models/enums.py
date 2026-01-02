from enum import Enum


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
    GROCERIES = "Groceries"
    RESTAURANTS = "Restaurants"
    TRANSPORT = "Transport"
    RENT = "Rent"
    UTILITIES = "Utilities"
    ENTERTAINMENT = "Entertainment"
    SHOPPING = "Shopping"
    HEALTH = "Health"
    TRAVEL = "Travel"
    OTHER = "Other"
