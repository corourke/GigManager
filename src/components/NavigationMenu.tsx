import React from 'react';
import { LayoutDashboard, Calendar, Users, Package, Banknote } from 'lucide-react';

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
  | 'calendar'
  | 'import'
  | 'financials';

interface NavigationMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isActive: (route: RouteType) => boolean;
}

interface NavigationMenuProps {
  currentRoute: RouteType;
  onNavigate: {
    dashboard?: () => void;
    gigs?: () => void;
    team?: () => void;
    assets?: () => void;
    financials?: () => void;
  };
}

const NavigationMenu = React.memo(function NavigationMenu({
  currentRoute,
  onNavigate,
}: NavigationMenuProps) {
  const menuItems: NavigationMenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      onClick: onNavigate.dashboard,
      isActive: (route) => route === 'dashboard',
    },
    {
      id: 'gigs',
      label: 'Gigs',
      icon: Calendar,
      onClick: onNavigate.gigs,
      isActive: (route) => ['gig-list', 'create-gig', 'edit-gig', 'gig-detail', 'calendar'].includes(route),
    },
    {
      id: 'financials',
      label: 'Financials',
      icon: Banknote,
      onClick: onNavigate.financials,
      isActive: (route) => route === 'financials',
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      onClick: onNavigate.team,
      isActive: (route) => route === 'team',
    },
    {
      id: 'equipment',
      label: 'Equipment',
      icon: Package,
      onClick: onNavigate.assets,
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
            className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
              isActive
                ? 'text-sky-600 bg-sky-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
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