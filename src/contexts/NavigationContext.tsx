import React, { createContext, useContext } from 'react';

interface NavigationContextValue {
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToTeam: () => void;
  onNavigateToAssets: () => void;
  onEditProfile?: () => void;
  onNavigateToSettings?: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  // Return null if context is not available (for screens outside NavigationProvider)
  return context;
}

interface NavigationProviderProps {
  children: React.ReactNode;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToTeam: () => void;
  onNavigateToAssets: () => void;
  onEditProfile?: () => void;
  onNavigateToSettings?: () => void;
}

export function NavigationProvider({
  children,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToTeam,
  onNavigateToAssets,
  onEditProfile,
  onNavigateToSettings,
}: NavigationProviderProps) {
  return (
    <NavigationContext.Provider
      value={{
        onNavigateToDashboard,
        onNavigateToGigs,
        onNavigateToTeam,
        onNavigateToAssets,
        onEditProfile,
        onNavigateToSettings,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

