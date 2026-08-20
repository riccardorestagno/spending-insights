import TransactionViewer from './components/TransactionViewer/TransactionViewer';
import { InsightsPanel } from './components/InsightsPanel/InsightsPanel';
import { useState, useEffect } from 'react';
import { Category } from './components/TransactionViewer/types';
import { API_BASE_URL } from './utils/constants';
import { DEFAULT_PRESET, resolvePreset } from './utils/dateRanges';

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  // Seeded from the same preset the viewer defaults to. Starting empty meant
  // the chart fired an unfiltered request on mount, which could resolve after
  // the filtered one and overwrite it.
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>(
    () => {
      const { startDate, endDate } = resolvePreset(DEFAULT_PRESET);
      return { startDate: startDate || undefined, endDate: endDate || undefined };
    }
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    fetchCategories();
  }, [reloadKey]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const handleDataReloaded = () => {
    // The new CSV may not contain the previously selected category
    setSelectedCategory('All');
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="App min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Transaction Viewer - Left side */}
          <div className="flex-1">
            <TransactionViewer
              onDateRangeChange={setDateRange}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              reloadKey={reloadKey}
              onDataReloaded={handleDataReloaded}
            />
          </div>

          {/* Category Chart - Right side */}
          <div className="xl:w-[450px] flex-shrink-0">
            <div className="sticky top-8">
              <InsightsPanel
                categories={categories}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onCategoryClick={handleCategoryClick}
                reloadKey={reloadKey}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;