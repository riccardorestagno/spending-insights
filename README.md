# Spending Insights

AI-powered transaction categorization and analysis for RBC bank exports.

## Quick Start

### Backend Setup

```bash
cd server
mkdir data

python -m venv venv

source venv/bin/activate          # macOS/Linux
# or: venv\Scripts\activate       # Windows
pip install -r requirements.txt

# Start server
python main.py
```

Server runs at `http://localhost:8000`

### Frontend Setup

```bash
cd client
yarn install
yarn dev
```

App runs at `http://localhost:5173`

## Usage

### 1. Categorize Transactions (One-time)

Export your RBC transactions as CSV, then categorize using AI:

```bash
python scripts/rbc_categorizer.py data/your_export.csv YOUR_ANTHROPIC_API_KEY
```

This creates `your_export_categorized.csv` with an added "Category" column.

**Cost:** ~$0.10-0.15 per 600 transactions

### 2. Load Data

Upload the CSV from the app with the **Upload CSV** button, or load one from a
server-side path:

```bash
curl -X POST "http://localhost:8000/load-csv?csv_path=your_export_categorized.csv"
```

You can also use the `/load-csv` and `/upload-csv` endpoints from
`http://localhost:8000/docs`.

#### Duplicate handling

Loads are additive: existing rows are never deleted, so you can upload
overlapping statements without wiping your data.

  - A transaction is considered "already loaded" when its **transaction date and
    Description 1** match a row already in the database (compared ignoring case
    and extra whitespace).
  - Matching transactions are **skipped**, so edits you've made in the app
    (category, reimbursed flag) survive a re-upload. Only genuinely new
    transactions are added.
  - Duplicates are matched one-for-one, so a statement that legitimately
    contains two identical same-day transactions still loads both.

To overwrite instead of skip, tick **Override existing transactions** in the
upload dialog, or pass the flag directly:

```bash
curl -X POST "http://localhost:8000/load-csv?csv_path=your_export.csv&override_existing=true"
```

Overriding replaces the matching rows' values with the ones from the CSV,
discarding any category or reimbursement edits made to them. Only the columns
present in the CSV are written, so an export missing an optional column won't
blank it out.

### 3. View   & Analyze

Open `http://localhost:5173` to browse your transactions.

## Features

  - **AI Categorization**: Automatically categorizes transactions into 16 categories (Groceries, Restaurants, Transportation, etc.)
  - **Filter by Category**: Select from dropdown to view specific spending categories
  - **Date Range Filter**: Filter transactions by start and end dates
  - **Sortable Columns**: Click "Date" or "Amount" headers to sort (ascending/descending)
  - **Pagination**: Browse large datasets with adjustable page sizes (10-100 items)
  - **Category Totals**: See total spending per category
  - **Non-destructive Uploads**: Re-upload overlapping statements without
    duplicating transactions or losing your edits

## API Key

Get your Anthropic API key at https://console.anthropic.com/

## Tech Stack

  - **Backend**: FastAPI + SQLite
  - **Frontend**: React + Vite + Tailwind CSS
  - **AI**: Claude (Anthropic)
