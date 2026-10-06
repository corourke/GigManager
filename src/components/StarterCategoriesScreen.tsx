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
      <div className="container mx-auto p-6 max-w-4xl">
        <PageHeader
          icon={ShieldCheck}
          title="Starter categories"
          description="What each organization starts with. Organizations that already have their own lists aren't changed."
          actions={<Button onClick={onBack} variant="outline">Back</Button>}
        />
        <CategoriesSettings organizationId={null} canEdit title="Starter sets" description="Copied into an organization the first time it needs a category list." />
      </div>
    </div>
  );
}
