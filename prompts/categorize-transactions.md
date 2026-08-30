I have two CSV files with credit card transactions, same column structure except one has a Category column and one doesn't:

1. A categorized file — historical transactions, each tagged with a Category column (e.g. Restaurants & Dining, Groceries, Transportation, Shopping & Retail, etc.)
2. An uncategorized file — a newer export with the same columns but no Category column.

Please categorize the uncategorized file using the categorized file as a reference, following these rules:

- Reuse existing categories: For any row in the uncategorized file whose description exactly matches a description in the categorized file, apply that same category.
- Categorize the rest by merchant: For descriptions with no exact match, infer the category from the merchant name, using the categorization patterns already established in the categorized file as your guide (e.g. if all past "Petro-Canada" entries are "Transportation," apply that consistently).
- Flag uncertain ones: If any merchant name is ambiguous or unfamiliar (not clearly indicating a category), make a best guess but call it out explicitly at the end so I can review it.
- Output: Return the uncategorized file back out with a Category column added — same number of rows as the original uncategorized file, no rows merged in from the categorized file, no rows dropped, no blanks in the Category column.