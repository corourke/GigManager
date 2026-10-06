import { ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import AppHeader from './AppHeader';
import { PageHeader } from './ui/PageHeader';
import CategoriesSettings from './settings/CategoriesSettings';
import type { User } from '../utils/supabase/types';

interface StarterCategoriesScreenProps {
  user: User;
  /** The app navigation is hidden on platform pages, so this is the way out. */
  onBack: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

/**
 * Platform moderators edit the starter category sets: what an organization
 * gets the first time it needs an expense or equipment list. Changes here
 * don't reach organizations that already have their own lists.
 */
export default function StarterCategoriesScreen({ user, onBack, onLogout, onEditProfile }: StarterCategoriesScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} currentRoute="dashboard" onLogout={onLogout} onEditProfile={onEditProfile} />

      {/* Same layout as the other platform pages (Access Requests, Admin: All Organizations). */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <PageHeader
            icon={ShieldCheck}
            title="Starter categories"
            description="What each organization starts with. Organizations that already have their own lists aren't changed."
            actions={<Button onClick={onBack} variant="outline">Back</Button>}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CategoriesSettings organizationId={null} canEdit title="Starter sets" description="Copied into an organization the first time it needs a category list." />
      </div>
    </div>
  );
}
