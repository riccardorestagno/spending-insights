# Spending Insights

AI-powered transaction categorization and analysis for RBC bank exports.

## Quick Start


### Backend Setup


```bash
cd server

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

Visit `http://localhost:8000/docs` and use the `/load-csv` endpoint, or:

```bash
curl -X POST "http://localhost:8000/load-csv?csv  _path=your  _export  _categorized.csv"
```

### 3. View   & Analyze


Open `http://localhost:5173` to browse your transactions.

## Features

  - **AI Categorization**: Automatically categorizes transactions into 16 categories (Groceries, Restaurants, Transportation, etc.)
  - **Filter by Category**: Select from dropdown to view specific spending categories
  - **Date Range Filter**: Filter transactions by start and end dates
  - **Sortable Columns**: Click "Date" or "Amount" headers to sort (ascending/descending)
  - **Pagination**: Browse large datasets with adjustable page sizes (10-100 items)
  - **Category Totals**: See total spending per category

## API Key

Get your Anthropic API key at https://console.anthropic.com/


## Tech Stack

  - **Backend**: FastAPI + SQLite

  - **Frontend**: React + Vite + Tailwind CSS

  - **AI**: Claude (Anthropic)

