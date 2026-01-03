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
