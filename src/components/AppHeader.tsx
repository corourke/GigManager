import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Building2,
  Settings,
  LogOut,
  SwitchCamera,
  UserCircle,
} from 'lucide-react';
import React from 'react';
import type { Organization, User, UserRole } from '../App';
import NavigationMenu, { type RouteType } from './NavigationMenu';

interface AppHeaderProps {
  organization?: Organization;
  user: User;
  userRole?: UserRole;
  currentRoute: RouteType;
  onNavigateToDashboard?: () => void;
  onNavigateToGigs?: () => void;
  onNavigateToTeam?: () => void;
  onNavigateToAssets?: () => void;
  onSwitchOrganization?: () => void;
  onEditProfile?: () => void;
  onLogout: () => void;
}

const ROLE_CONFIG: Record<UserRole, { color: string }> = {
  Admin: { color: 'bg-red-100 text-red-700 border-red-200' },
  Manager: { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  Staff: { color: 'bg-gray-100 text-gray-700 border-gray-200' },
  Viewer: { color: 'bg-slate-100 text-slate-700 border-slate-200' }
};

const AppHeader = React.memo(function AppHeader({
  organization,
  user,
  userRole,
  currentRoute,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToTeam,
  onNavigateToAssets,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: AppHeaderProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Organization Info or App Title */}
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-sky-500 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-gray-900">{organization?.name || 'Gig Manager'}</h2>
              {userRole && organization && (
                <Badge className={`text-xs ${ROLE_CONFIG[userRole].color}`} variant="outline">
                  {userRole}
                </Badge>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                    <AvatarFallback className="bg-sky-100 text-sky-700">
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onSwitchOrganization && organization && (
                  <>
                    <DropdownMenuItem onClick={onSwitchOrganization}>
                      <SwitchCamera className="w-4 h-4 mr-2" />
                      Switch Organization
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onEditProfile && (
                  <>
                    <DropdownMenuItem onClick={onEditProfile}>
                      <UserCircle className="w-4 h-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation Bar - Only show if organization exists */}
        {organization && (
          <NavigationMenu
            currentRoute={currentRoute}
            onNavigateToDashboard={onNavigateToDashboard}
            onNavigateToGigs={onNavigateToGigs}
            onNavigateToTeam={onNavigateToTeam}
            onNavigateToAssets={onNavigateToAssets}
          />
        )}
      </div>
    </div>
  );
});

export default AppHeader;