import TransactionViewer from './components/TransactionViewer/TransactionViewer';
import { CategorySpendingChart } from './components/CategorySpendingChart/CategorySpendingChart';
import { useState, useEffect } from 'react';
import { Category } from './components/TransactionViewer/types';
import { API_BASE_URL } from './utils/constants';

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    fetchCategories();
  }, []);

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

  return (
    <div className="App min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Transaction Viewer - Left side */}
          <div className="flex-1 lg:w-2/3">
            <TransactionViewer 
              onDateRangeChange={setDateRange}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
          
          {/* Category Chart - Right side */}
          <div className="lg:w-1/3">
            <div className="sticky top-8">
              <CategorySpendingChart 
                categories={categories}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onCategoryClick={handleCategoryClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;