import React from 'react';
import { UploadCsv } from '../UploadCsv/UploadCsv';
import { ExportCsv, ExportFilters } from '../ExportCsv/ExportCsv';
import { ProfileSwitcher } from '../ProfileSwitcher/ProfileSwitcher';
import { useProfileContext } from '../../contexts/ProfileContext';

interface HeaderProps {
  onUploaded?: () => void;
  exportFilters: ExportFilters;
  totalItems?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onUploaded,
  exportFilters,
  totalItems,
}) => {
  const { activeProfile } = useProfileContext();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transaction Viewer
          </h1>
          {/* Naming the profile here keeps it obvious whose numbers are on screen */}
          <p className="text-gray-600">
            {activeProfile
              ? `Viewing ${activeProfile.name}'s categorized transactions`
              : 'View and filter your categorized transactions'}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <ProfileSwitcher />
          <UploadCsv onUploaded={onUploaded} />
          <ExportCsv filters={exportFilters} totalItems={totalItems} />
        </div>
      </div>
    </div>
  );
};
