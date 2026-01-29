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
  setSelectedOrganization: (org: Organization | null) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userRole = React.useMemo(() => {
    if (!selectedOrganization) return undefined;
    const membership = organizations.find(
      (m) => m.organization.id === selectedOrganization.id
    );
    return membership?.role;
  }, [selectedOrganization, organizations]);

  const refreshProfile = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      try {
        const [profile, orgs] = await Promise.all([
          getUserProfile(session.user.id),
          getUserOrganizations(session.user.id)
        ]);
        
        if (profile) {
          setUser(profile);
          setOrganizations(orgs);
          
          // If we had a selected org before, try to keep it
          if (selectedOrganization) {
            const stillMember = orgs.find(m => m.organization.id === selectedOrganization.id);
            if (stillMember) {
              setSelectedOrganization(stillMember.organization);
            } else if (orgs.length === 1) {
              setSelectedOrganization(orgs[0].organization);
            } else {
              setSelectedOrganization(null);
            }
          } else if (orgs.length === 1) {
            setSelectedOrganization(orgs[0].organization);
          }
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
    setIsLoading(false);
  }, [selectedOrganization]);

  useEffect(() => {
    const supabase = createClient();
    
    // Initial session check
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await refreshProfile();
      } else {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await refreshProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrganizations([]);
          setSelectedOrganization(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const login = (userData: User, userOrgs: OrganizationMembership[]) => {
    setUser(userData);
    setOrganizations(userOrgs);
    if (userOrgs.length === 1) {
      setSelectedOrganization(userOrgs[0].organization);
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setOrganizations([]);
    setSelectedOrganization(null);
  };

  const selectOrganization = (org: Organization) => {
    setSelectedOrganization(org);
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
    setSelectedOrganization,
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
