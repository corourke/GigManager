import { createContext, useContext } from 'react';
import type { MutableRefObject } from 'react';

/**
 * Cross-cutting app-shell concerns that route wrappers need but that aren't
 * URL state: the viewport mode, the global "edit profile" dialog opener, the
 * mobile lock action, and the mobile gig-list scroll position (preserved
 * across navigation). Selected organization, user, and role come from
 * AuthContext directly.
 */
export interface AppShellValue {
  isMobile: boolean;
  openEditProfile: () => void;
  lockMobile: () => void;
  mobileGigListScrollTop: MutableRefObject<number>;
}

const AppShellContext = createContext<AppShellValue | null>(null);

export const AppShellProvider = AppShellContext.Provider;

export function useAppShell(): AppShellValue {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error('useAppShell must be used within an AppShellProvider');
  }
  return value;
}
