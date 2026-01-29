import { Calendar as CalendarIcon, Plus, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface GigListEmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onCreateGig: () => void;
  onNavigateToImport?: () => void;
}

export function GigListEmptyState({
  hasActiveFilters,
  onClearFilters,
  onCreateGig,
  onNavigateToImport,
}: GigListEmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-gray-900 mb-2">
          {hasActiveFilters ? 'No gigs found' : 'No gigs yet'}
        </h3>
        <p className="text-gray-600 mb-6">
          {hasActiveFilters
            ? 'Try adjusting your filters or search query'
            : 'Create your first gig to get started'}
        </p>
        {hasActiveFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        ) : (
          <div className="flex gap-2 justify-center">
            <Button onClick={onCreateGig} className="bg-sky-500 hover:bg-sky-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Gig
            </Button>
            {onNavigateToImport && (
              <Button
                onClick={onNavigateToImport}
                variant="outline"
                className="border-sky-500 text-sky-600 hover:bg-sky-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
