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
        
        console.log('[TRACE] AuthContext: Fetching profile...');
        const profile = await getUserProfile(session.user.id);
        console.log('[TRACE] AuthContext: Profile fetch complete');
        
        console.log('[TRACE] AuthContext: Fetching organizations...');
        const orgs = await getUserOrganizations(session.user.id);
        console.log('[TRACE] AuthContext: Organizations fetch complete');
        
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
  }, [selectedOrganization, organizations]);

  const refreshProfileRef = React.useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    
    // Listen for auth changes - this also handles the initial session check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const startTime = Date.now();
        console.log(`[TRACE] AuthContext: onAuthStateChange event: ${event} for user: ${session?.user?.id} at ${new Date(startTime).toISOString()}`);
        
        try {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
            console.log(`[TRACE] AuthContext: Triggering refreshProfile for ${event}`);
            await refreshProfileRef.current(session);
            console.log(`[TRACE] AuthContext: refreshProfile completed for ${event} in ${Date.now() - startTime}ms`);
          } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            console.log(`[TRACE] AuthContext: Handling ${event} (no session)`);
            setUser(null);
            setOrganizations([]);
            selectOrganization(null);
            setIsLoading(false);
            isRefreshing.current = false;
            console.log(`[TRACE] AuthContext: ${event} handling completed in ${Date.now() - startTime}ms`);
          }
        } catch (error) {
          console.error(`[TRACE] AuthContext: Error in onAuthStateChange handler for ${event} after ${Date.now() - startTime}ms:`, error);
          setIsLoading(false); // Ensure we don't stay loading on error
        }
      }
    );

    return () => {
      mounted = false;
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
