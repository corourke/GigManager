import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useAppShell } from './appShell';
import LoginScreen from '../components/LoginScreen';
import UserProfileCompletionScreen from '../components/UserProfileCompletionScreen';
import AcceptInvitationScreen from '../components/AcceptInvitationScreen';
import ResetPasswordScreen from '../components/ResetPasswordScreen';
import InvitationErrorScreen from '../components/InvitationErrorScreen';
import CalendarAuthCallback from '../components/CalendarAuthCallback';
import type { User } from '../utils/supabase/types';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function profileIncomplete(user: User): boolean {
  return !user.first_name?.trim() || !user.last_name?.trim();
}

/**
 * Requires an authenticated user with a complete profile. Login and
 * profile-completion render in place (no dedicated URL) so deep links survive
 * an auth round-trip: after signing in, the originally requested route renders.
 */
export function RequireAuth() {
  const { isLoading, user, setUser } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <LoginScreen />;

  if (profileIncomplete(user)) {
    return (
      <UserProfileCompletionScreen
        user={user}
        onProfileCompleted={(updatedUser) => {
          setUser(updatedUser);
          navigate('/');
        }}
      />
    );
  }

  return <Outlet />;
}

/**
 * Requires a selected organization. Auto-selects when the user belongs to
 * exactly one org; otherwise sends them to the picker.
 */
export function RequireOrg() {
  const { organizations, selectedOrganization, selectOrganization } = useAuth();

  useEffect(() => {
    if (!selectedOrganization && organizations.length === 1) {
      selectOrganization(organizations[0].organization);
    }
  }, [selectedOrganization, organizations, selectOrganization]);

  if (selectedOrganization) return <Outlet />;
  if (organizations.length === 1) return <LoadingSpinner />; // auto-selecting
  return <Navigate to="/org-selection" replace />;
}

/** Root landing: role- and device-aware. */
export function LandingRedirect() {
  const { isMobile } = useAppShell();
  const { userRole } = useAuth();
  if (isMobile) return <Navigate to="/gigs" replace />;
  if (userRole === 'Viewer') return <Navigate to="/gigs" replace />;
  return <Navigate to="/dashboard" replace />;
}

export function ResetPasswordRoute() {
  const navigate = useNavigate();
  return (
    <ResetPasswordScreen
      onComplete={() => {
        window.history.replaceState({}, '', '/');
        navigate('/');
      }}
    />
  );
}

/**
 * Invitation acceptance. Mirrors the old App.tsx flow: wait briefly for the
 * implicit-flow session; force profile completion first if needed; otherwise
 * show the acceptance screen. Surface a clear error if no session establishes.
 */
export function AcceptInvitationRoute() {
  const { isLoading, user, organizations, setUser } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (user) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [user]);

  if (isLoading) return <LoadingSpinner />;

  if (user) {
    if (profileIncomplete(user)) {
      return (
        <UserProfileCompletionScreen
          user={user}
          onProfileCompleted={(updatedUser) => setUser(updatedUser)}
        />
      );
    }
    return (
      <AcceptInvitationScreen
        user={user}
        organizations={organizations}
        onContinue={() => navigate('/')}
      />
    );
  }

  if (timedOut) {
    return (
      <InvitationErrorScreen
        error="We couldn't verify your invitation"
        errorDescription="The invite link may have expired, or this app's URL isn't allow-listed in the authentication settings. Ask an admin to resend the invitation."
        onBackToLogin={() => {
          window.history.replaceState({}, '', '/');
          navigate('/');
        }}
      />
    );
  }

  return <LoadingSpinner />;
}

export function CalendarCallbackRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return <LoadingSpinner />;
  return (
    <CalendarAuthCallback
      userId={user.id}
      onAuthComplete={() => navigate('/settings')}
      onBack={() => navigate('/settings')}
    />
  );
}
