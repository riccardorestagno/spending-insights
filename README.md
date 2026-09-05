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

Upload the CSV from the app with the **Upload CSV** button, choosing which
profile it belongs to (see [Profiles](#profiles)), or load one from a
server-side path:

```bash
# Into an existing profile
curl -X POST "http://localhost:8000/load-csv?csv_path=your_export_categorized.csv&profile_id=1"

# Into a new profile, created on the spot
curl -X POST "http://localhost:8000/load-csv?csv_path=your_export_categorized.csv&profile_name=Alex"
```

With neither argument the file goes into a profile called `Default`.

You can also use the `/load-csv` and `/upload-csv` endpoints from
`http://localhost:8000/docs`.

#### Duplicate handling

Loads are additive: existing rows are never deleted, so you can upload
overlapping statements without wiping your data.

  - A transaction is considered "already loaded" when its **transaction date and
    Description 1** match a row already in the same profile (compared ignoring
    case and extra whitespace). Profiles are checked independently, so two
    people can each hold their own copy of an identical transaction.
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

## Profiles

Several people can share one database. Every transaction belongs to exactly one
**profile**, and the app shows one profile at a time.

  - **Switch profiles** from the dropdown in the header. Filters, charts and
    category totals all follow the selection, and the choice is remembered
    between visits.
  - **Create a profile** from that dropdown, or straight from the upload dialog
    — pick *Create a new profile…* and name it. On a fresh database, the first
    upload creates the first profile.
  - **Rename a profile** from the same dropdown. Names live in their own
    `profiles` table and transactions only store a profile id, so renaming
    updates a single row and leaves every transaction untouched.
  - **Delete a profile** to remove it along with its transactions. Other
    profiles are unaffected.
  - **Uploads and exports are scoped to one profile.** A CSV is loaded into the
    profile chosen in the dialog, and **Export CSV** writes only the profile
    currently on screen (its name is included in the downloaded filename).

Existing databases are migrated automatically on startup: transactions loaded
before profiles existed are moved into a profile called `Default`.

## Transaction notes

Any transaction can carry a free-text note — what a vague merchant name
actually was, who owes you for it, which trip it belonged to.

  - **Read**: hover anywhere on a row and its note appears beside it.
  - **Write**: click the note icon in the **Note** column. Rows without a note
    show the icon on hover, so the table stays uncluttered.
  - **Edit**: click the icon again. `Ctrl`/`⌘` + `Enter` saves, `Esc` cancels,
    and clicking away saves rather than discarding what you typed.
  - **Delete**: use **Delete** in the note editor, or clear the text and save.

Notes are capped at 1000 characters and stored per transaction, so they follow
the transaction between filters, sorts and pages.

Notes survive re-uploads the same way category and reimbursement edits do: a
skipped duplicate keeps its note, and an override only replaces the note when
the CSV actually has a `Comment` column. **Export CSV** includes that column,
so exporting and re-uploading round-trips notes intact.

### Note endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| PATCH | `/transactions/{id}/comment` | Set a note — `{"comment": "Split with Sam"}` |
| DELETE | `/transactions/{id}/comment` | Remove a note |

Sending blank or whitespace-only text to the PATCH endpoint clears the note, so
it's stored as `NULL` rather than an empty string.

### Profile endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/profiles` | List profiles with transaction counts |
| POST | `/profiles` | Create a profile — `{"name": "Alex"}` |
| PATCH | `/profiles/{id}` | Rename a profile — `{"name": "Alexandra"}` |
| DELETE | `/profiles/{id}` | Delete a profile and its transactions |

`/transactions`, `/categories` and `/export-csv` all take an optional
`profile_id` query parameter; the app always sends it. Omitting it queries
across every profile, which is handy from `/docs` but is never what the UI
does.

## Features

  - **Profiles**: Keep separate sets of transactions in one database and switch
    between them from the header
  - **AI Categorization**: Automatically categorizes transactions into 16 categories (Groceries, Restaurants, Transportation, etc.)
  - **Filter by Category**: Select from dropdown to view specific spending categories
  - **Date Range Filter**: Filter transactions by start and end dates
  - **Sortable Columns**: Click "Date" or "Amount" headers to sort (ascending/descending)
  - **Pagination**: Browse large datasets with adjustable page sizes (10-100 items)
  - **Category Totals**: See total spending per category
  - **Transaction Notes**: Attach a free-text note to any transaction. Hover a
    row to read it, click the note icon to write, edit or delete it
  - **Non-destructive Uploads**: Re-upload overlapping statements without
    duplicating transactions or losing your edits
  - **Per-profile Export**: Download exactly the profile you're viewing

## API Key

Get your Anthropic API key at https://console.anthropic.com/

## Tech Stack

  - **Backend**: FastAPI + SQLite
  - **Frontend**: React + Vite + Tailwind CSS
  - **AI**: Claude (Anthropic)
