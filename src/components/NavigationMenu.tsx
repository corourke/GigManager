import React from 'react';
import { LayoutDashboard, Calendar, Users, Package, Banknote } from 'lucide-react';
import type { UserRole } from '../utils/supabase/types';
import { canManage } from '../utils/permissions';

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
  | 'inventory'
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
  userRole?: UserRole;
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
  userRole,
  onNavigate,
}: NavigationMenuProps) {
  // Financials is Admin/Manager only; the dashboard endpoint excludes Viewers.
  const showFinancials = canManage(userRole);
  const showDashboard = userRole !== 'Viewer';

  const menuItems: NavigationMenuItem[] = [
    ...(showDashboard ? [{
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      onClick: onNavigate.dashboard,
      isActive: (route: RouteType) => route === 'dashboard',
    }] : []),
    {
      id: 'gigs',
      label: 'Gigs',
      icon: Calendar,
      onClick: onNavigate.gigs,
      isActive: (route) => ['gig-list', 'create-gig', 'edit-gig', 'gig-detail', 'calendar'].includes(route),
    },
    ...(showFinancials ? [{
      id: 'financials',
      label: 'Financials',
      icon: Banknote,
      onClick: onNavigate.financials,
      isActive: (route: RouteType) => route === 'financials',
    }] : []),
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
        ['asset-list', 'create-asset', 'edit-asset', 'kit-list', 'create-kit', 'edit-kit', 'kit-detail', 'inventory'].includes(route),
    },
  ];

  // A segmented control on the top bar's row (#39). Below lg the labels hide
  // and each button keeps its name through aria-label and a tooltip.
  return (
    <nav aria-label="Sections" className="flex items-center gap-0.5 rounded-[10px] border border-gray-200 bg-gray-100 p-[3px]">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.isActive(currentRoute);

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            title={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
              isActive
                ? 'bg-white font-semibold text-sky-700 shadow-sm ring-1 ring-black/5'
                : 'font-medium text-gray-700 hover:bg-white/60 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

export default NavigationMenu;