import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '../utils/supabase/client';
import { 
  User, 
  Organization, 
  OrganizationMembership, 
  UserRole 
} from '../utils/supabase/types';
import { getCompleteUserData, createUserProfile } from '../services/user.service';
import { convertPendingToActive } from '../services/organization.service';

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
      console.log('[TRACE] AuthContext: refreshProfile already in progress, skipping');
      return;
    }
    
    console.log('[TRACE] AuthContext: refreshProfile starting');
    isRefreshing.current = true;
    
    const supabase = createClient();
    
    try {
      const session = providedSession || (await supabase.auth.getSession()).data.session;
      
      if (session?.user) {
        console.log('[TRACE] AuthContext: Session found for user', session.user.id);
        
        // Ensure pending user is converted to active (e.g. after accepting invitation)
        if (session.user.email) {
          try {
            await convertPendingToActive(session.user.email, session.user.id);
          } catch (e) {
            console.warn('[TRACE] AuthContext: Error converting pending user:', e);
          }
        }

        // Fetch complete user data in one single secure RPC call
        console.log('[TRACE] AuthContext: Fetching complete user data...');
        const { profile, organizations: orgs } = await getCompleteUserData(session.user.id);
        
        console.log('[TRACE] AuthContext: Complete user data fetch finished', { 
          hasProfile: !!profile, 
          orgCount: orgs?.length 
        });

        if (profile) {
          setUser(profile);
          setOrganizations(orgs);
          
          // Auto-select organization if appropriate
          if (!selectedOrganization && orgs.length === 1) {
            selectOrganization(orgs[0].organization);
          } else if (selectedOrganization) {
            const stillMember = orgs.find(m => m.organization.id === selectedOrganization.id);
            if (!stillMember) {
              selectOrganization(orgs.length === 1 ? orgs[0].organization : null);
            }
          }
        } else {
          console.warn('[TRACE] AuthContext: No profile found for authenticated user, creating one...');
          // Create a new profile using Auth data if possible
          const newProfile = await createUserProfile({
            id: session.user.id,
            email: session.user.email || '',
            first_name: session.user.user_metadata?.first_name || '',
            last_name: session.user.user_metadata?.last_name || '',
          });
          setUser(newProfile);
          setOrganizations([]);
        }
      } else {
        console.log('[TRACE] AuthContext: No session found in refreshProfile');
        setUser(null);
        setOrganizations([]);
        selectOrganization(null);
      }
    } catch (error) {
      console.error('[TRACE] AuthContext: Error refreshing profile:', error);
    } finally {
      console.log('[TRACE] AuthContext: refreshProfile complete, setting isLoading=false');
      setIsLoading(false);
      isRefreshing.current = false;
    }
  }, [selectedOrganization]); // Removed organizations from deps to reduce re-creation

  const refreshProfileRef = React.useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    
    console.log('[TRACE] AuthContext: Initializing onAuthStateChange listener');
    
    // Listen for auth changes - this also handles the initial session check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          console.log(`[TRACE] AuthContext: onAuthStateChange event ${event} ignored - unmounted`);
          return;
        }
        
        console.log(`[TRACE] AuthContext: onAuthStateChange event: ${event} for user: ${session?.user?.id}`);
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
          console.log(`[TRACE] AuthContext: Scheduling refreshProfile for ${event}`);
          // Use setTimeout to break the call stack and avoid deadlocking the Supabase client initialization
          setTimeout(() => {
            if (mounted) {
              refreshProfileRef.current(session).catch(err => {
                console.error(`[TRACE] AuthContext: Error in scheduled refreshProfile for ${event}:`, err);
              });
            }
          }, 0);
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          console.log(`[TRACE] AuthContext: Handling ${event} (no session)`);
          setUser(null);
          setOrganizations([]);
          selectOrganization(null);
          setIsLoading(false);
          isRefreshing.current = false;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove refreshProfile from dependencies to avoid infinite loop

  // Real-time listener for profile and membership changes
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const supabase = createClient();
    
    console.log(`[TRACE] AuthContext: Setting up real-time subscriptions for user ${userId}`);

    const channel = supabase
      .channel(`user-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[TRACE] AuthContext: Real-time user profile update detected', payload);
          refreshProfileRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[TRACE] AuthContext: Real-time organization membership update detected', payload);
          refreshProfileRef.current();
        }
      )
      .subscribe((status) => {
        console.log(`[TRACE] AuthContext: Real-time subscription status for user ${userId}: ${status}`);
      });

    return () => {
      console.log(`[TRACE] AuthContext: Cleaning up real-time subscriptions for user ${userId}`);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
    // Clear persisted navigation state
    localStorage.removeItem('currentRoute');
    localStorage.removeItem('selectedGigId');
    localStorage.removeItem('selectedAssetId');
    localStorage.removeItem('selectedKitId');
    localStorage.removeItem('selectedMemberId');
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
