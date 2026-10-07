import { ShieldCheck } from 'lucide-react';
import AppHeader from './AppHeader';
import { PageHeader } from './layout/PageHeader';
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

      {/* Opened from the header menu on any page, so Back is a plain "Back" (history). */}
      <PageHeader icon={ShieldCheck} back={{ label: 'Back', onClick: onBack }} title="Starter categories" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="mb-4 text-sm text-gray-600">What each organization starts with. Organizations that already have their own lists aren't changed.</p>
        <CategoriesSettings organizationId={null} canEdit title="Starter sets" description="Copied into an organization the first time it needs a category list." />
      </div>
    </div>
  );
}
