import anthropic
import pandas as pd
import json
from pathlib import Path

# Standard spending categories
CATEGORIES = [
    "Groceries",
    "Restaurants & Dining",
    "Transportation",
    "Shopping & Retail",
    "Entertainment",
    "Healthcare",
    "Bills & Utilities",
    "Insurance",
    "Housing",
    "Travel",
    "Education",
    "Personal Care",
    "Subscriptions",
    "Income",
    "Transfers",
    "Other"
]

BATCH_SIZE = 50  # Process 50 descriptions at a time


def categorize_batch(descriptions, client):
    """Categorize a batch of descriptions using AI."""
    prompt = f"""You are categorizing bank transactions. For each transaction description below, assign it to ONE of these categories:

{', '.join(CATEGORIES)}

Here are the transaction descriptions to categorize:
{json.dumps(descriptions, indent=2)}

Return ONLY a valid JSON object mapping each description to its category. No markdown, no code blocks, just the JSON object. Format:
{{
    "description text": "Category Name",
    ...
}}

Be consistent - similar merchants should get the same category."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    response_text = message.content[0].text.strip()

    # Remove markdown code blocks if present
    if '```json' in response_text:
        response_text = response_text.split('```json')[1].split('```')[0].strip()
    elif '```' in response_text:
        response_text = response_text.split('```')[1].split('```')[0].strip()

    # Parse JSON
    try:
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        print(f"Response: {response_text[:500]}")
        # Return empty dict on error
        return {}


def categorize_transactions(csv_path, api_key, output_path=None):
    """
    Categorize RBC transactions using AI.

    Args:
        csv_path: Path to RBC CSV export
        api_key: Anthropic API key
        output_path: Optional path for output CSV (defaults to input_categorized.csv)
    """
    # Read the CSV
    df = pd.read_csv(csv_path)

    # Validate required columns
    if 'Description 1' not in df.columns:
        raise ValueError("CSV must contain 'Description 1' column")

    # Initialize Anthropic client
    client = anthropic.Anthropic(api_key=api_key)

    # Get unique descriptions
    unique_descriptions = df['Description 1'].dropna().unique().tolist()
    total_descriptions = len(unique_descriptions)

    print(f"Found {total_descriptions} unique transaction descriptions to categorize...")

    # Process in batches
    categorization_map = {}

    for i in range(0, total_descriptions, BATCH_SIZE):
        batch = unique_descriptions[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total_descriptions + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} descriptions)...")

        batch_results = categorize_batch(batch, client)
        categorization_map.update(batch_results)

    print(f"\nSuccessfully categorized {len(categorization_map)} descriptions")

    # Apply categories to dataframe
    df['Category'] = df['Description 1'].map(categorization_map)

    # Handle any unmapped descriptions
    unmapped = df[df['Category'].isna()]['Description 1'].unique()
    if len(unmapped) > 0:
        print(f"Warning: {len(unmapped)} descriptions couldn't be categorized, marking as 'Other'")
        df['Category'] = df['Category'].fillna('Other')

    # Save output
    if output_path is None:
        output_path = Path(csv_path).stem + '_categorized.csv'

    df.to_csv(output_path, index=False)
    print(f"\nCategorization complete! Saved to: {output_path}")

    # Print summary
    print("\nCategory Summary:")
    summary = df.groupby('Category')['CAD$'].sum().sort_values(ascending=False)
    for category, amount in summary.items():
        print(f"  {category}: ${amount:,.2f}")

    return df


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python rbc_categorizer.py <csv_path> <anthropic_api_key> [output_path]")
        sys.exit(1)

    csv_path = sys.argv[1]
    api_key = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else None

    categorize_transactions(csv_path, api_key, output_path)