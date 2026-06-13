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
import { Organization, User, UserRole } from '../utils/supabase/types';
import { USER_ROLE_CONFIG } from '../utils/supabase/constants';
import NavigationMenu, { type RouteType } from './NavigationMenu';
import { useNavigation } from '../contexts/NavigationContext';

interface AppHeaderProps {
  organization?: Organization;
  user: User;
  userRole?: UserRole;
  currentRoute: RouteType;
  onSwitchOrganization?: () => void;
  onEditProfile?: () => void;
  onLogout: () => void | Promise<void>;
}

const AppHeader = React.memo(function AppHeader({
  organization,
  user,
  userRole,
  currentRoute,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const effectiveEditProfile = onEditProfile || navigation?.onEditProfile;
  const effectiveNavigateToSettings = navigation?.onNavigateToSettings;

  const getInitials = (firstName: string = '', lastName: string = '') => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return `${f}${l}`.toUpperCase() || '?';
  };

  return (
    <div className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Organization Info or App Title */}
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-foreground">{organization?.name || 'GigWrangler'}</h2>
              {userRole && organization && (
                <Badge className={`text-xs ${USER_ROLE_CONFIG[userRole].color}`} variant="outline">
                  {USER_ROLE_CONFIG[userRole].label}
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
                    <AvatarImage src={user.avatar_url ?? undefined} alt={`${user.first_name} ${user.last_name}`} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
                <DropdownMenuItem onClick={effectiveNavigateToSettings} disabled={!effectiveNavigateToSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={effectiveEditProfile} disabled={!effectiveEditProfile}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await Promise.resolve(onLogout());
                    } catch (error) {
                      console.error('Logout error:', error);
                    }
                  }} 
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation Bar - Only show if organization exists and navigation context is available */}
        {organization && navigation && (
          <NavigationMenu
            currentRoute={currentRoute}
            onNavigate={{
              dashboard: navigation.onNavigateToDashboard,
              gigs: navigation.onNavigateToGigs,
              team: navigation.onNavigateToTeam,
              assets: navigation.onNavigateToAssets,
              financials: navigation.onNavigateToFinancials,
            }}
          />
        )}
      </div>
    </div>
  );
});

export default AppHeader;