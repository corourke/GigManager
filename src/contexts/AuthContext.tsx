import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '../utils/supabase/client';
import { 
  User, 
  Organization, 
  OrganizationMembership, 
  UserRole 
} from '../utils/supabase/types';
import { getUserProfile, getUserOrganizations } from '../services/user.service';

interface AuthContextType {
  user: User | null;
  organizations: OrganizationMembership[];
  selectedOrganization: Organization | null;
  isLoading: boolean;
  userRole: UserRole | undefined;
  login: (user: User, organizations: OrganizationMembership[]) => void;
  logout: () => Promise<void>;
  selectOrganization: (org: Organization) => void;
  refreshProfile: () => Promise<void>;
  setOrganizations: (organizations: OrganizationMembership[]) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [selectedOrganization, selectOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userRole = React.useMemo(() => {
    if (!selectedOrganization) return undefined;
    const membership = organizations.find(
      (m) => m.organization.id === selectedOrganization.id
    );
    return membership?.role;
  }, [selectedOrganization, organizations]);

  const isRefreshing = React.useRef(false);

  const refreshProfile = useCallback(async (providedSession?: any) => {
    if (isRefreshing.current) {
      console.log('AuthContext: refreshProfile already in progress, skipping');
      return;
    }
    
    console.log('AuthContext: refreshProfile starting');
    isRefreshing.current = true;
    const supabase = createClient();
    
    try {
      const session = providedSession || (await supabase.auth.getSession()).data.session;
      
      if (session?.user) {
        console.log('AuthContext: Session found for user', session.user.id);
        const [profile, orgs] = await Promise.all([
          getUserProfile(session.user.id),
          getUserOrganizations(session.user.id)
        ]);
        
        console.log('AuthContext: Fetched profile and orgs', { 
          hasProfile: !!profile, 
          orgCount: orgs?.length 
        });

        if (profile) {
          setUser(profile);
          setOrganizations(orgs);
          
          // If we had a selected org before, try to keep it
          if (selectedOrganization) {
            const stillMember = orgs.find(m => m.organization.id === selectedOrganization.id);
            if (stillMember) {
              selectOrganization(stillMember.organization);
            } else if (orgs.length === 1) {
              selectOrganization(orgs[0].organization);
            } else {
              selectOrganization(null);
            }
          } else if (orgs.length === 1) {
            selectOrganization(orgs[0].organization);
          }
        } else {
          console.warn('AuthContext: No profile found for authenticated user');
        }
      } else {
        console.log('AuthContext: No session found in refreshProfile');
      }
    } catch (error) {
      console.error('AuthContext: Error refreshing profile:', error);
    } finally {
      console.log('AuthContext: Setting isLoading to false');
      setIsLoading(false);
      isRefreshing.current = false;
    }
  }, [selectedOrganization]);

  const refreshProfileRef = React.useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  useEffect(() => {
    const supabase = createClient();
    
    // Initial session check
    const initAuth = async () => {
      console.log('AuthContext: initAuth starting');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('AuthContext: initAuth session found, calling refreshProfile');
          await refreshProfileRef.current(session);
        } else {
          console.log('AuthContext: initAuth no session found');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('AuthContext: Error in initAuth:', err);
        setIsLoading(false);
      }
    };

    initAuth();

    // Safety timeout to prevent perpetual loading spinner
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('AuthContext: Initial auth check timed out, forcing isLoading to false');
        setIsLoading(false);
      }
    }, 5000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: onAuthStateChange event:', event);
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
          await refreshProfileRef.current(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrganizations([]);
          selectOrganization(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // Remove refreshProfile from dependencies to avoid infinite loop

  const login = (userData: User, userOrgs: OrganizationMembership[]) => {
    setUser(userData);
    setOrganizations(userOrgs);
    if (userOrgs.length === 1) {
      selectOrganization(userOrgs[0].organization);
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setOrganizations([]);
    selectOrganization(null);
  };

  const value = {
    user,
    organizations,
    selectedOrganization,
    isLoading,
    userRole,
    login,
    logout,
    selectOrganization,
    refreshProfile,
    setOrganizations,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
