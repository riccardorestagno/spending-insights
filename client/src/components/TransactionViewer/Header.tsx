import React from 'react';

export const Header: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">
      Transaction Viewer
    </h1>
    <p className="text-gray-600">View and filter your categorized transactions</p>
  </div>
);