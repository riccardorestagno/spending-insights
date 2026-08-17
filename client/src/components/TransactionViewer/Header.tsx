import React from 'react';
import { UploadCsv } from '../UploadCsv/UploadCsv';

interface HeaderProps {
  onUploaded?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploaded }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Transaction Viewer
        </h1>
        <p className="text-gray-600">View and filter your categorized transactions</p>
      </div>

      <UploadCsv onUploaded={onUploaded} />
    </div>
  </div>
);
