import React from 'react';
import { LayoutDashboard, Calendar, Users, Package } from 'lucide-react';

export type RouteType = 
  | 'dashboard' 
  | 'gig-list' 
  | 'create-gig' 
  | 'edit-gig'
  | 'gig-detail' 
  | 'team'
  | 'asset-list' 
  | 'create-asset' 
  | 'edit-asset'
  | 'kit-list' 
  | 'create-kit' 
  | 'edit-kit'
  | 'kit-detail'
  | 'import';

interface NavigationMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isActive: (route: RouteType) => boolean;
}

interface NavigationMenuProps {
  currentRoute: RouteType;
  onNavigateToDashboard?: () => void;
  onNavigateToGigs?: () => void;
  onNavigateToTeam?: () => void;
  onNavigateToAssets?: () => void;
}

const NavigationMenu = React.memo(function NavigationMenu({
  currentRoute,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToTeam,
  onNavigateToAssets,
}: NavigationMenuProps) {
  const menuItems: NavigationMenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      onClick: onNavigateToDashboard,
      isActive: (route) => route === 'dashboard',
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      onClick: onNavigateToGigs,
      isActive: (route) => ['gig-list', 'create-gig', 'edit-gig', 'gig-detail'].includes(route),
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      onClick: onNavigateToTeam,
      isActive: (route) => route === 'team',
    },
    {
      id: 'equipment',
      label: 'Equipment',
      icon: Package,
      onClick: onNavigateToAssets,
      isActive: (route) => 
        ['asset-list', 'create-asset', 'edit-asset', 'kit-list', 'create-kit', 'edit-kit', 'kit-detail'].includes(route),
    },
  ];

  return (
    <nav className="flex items-center gap-1 h-12">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.isActive(currentRoute);
        
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            disabled={!item.onClick}
            className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
              isActive
                ? 'text-sky-600 bg-sky-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            } ${!item.onClick ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
});

export default NavigationMenu;