import { useState, useEffect } from 'react';
import { Building2, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { getUserProfile, createUserProfile, getUserOrganizations } from '../services/user.service';
import { convertPendingToActive } from '../services/organization.service';
import { User, OrganizationMembership } from '../utils/supabase/types';
import { MOCK_USER, MOCK_ORGANIZATIONS } from '../utils/mock-data';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';

interface LoginScreenProps {
  onLogin: (user: User, organizations: OrganizationMembership[]) => void;
  useMockData?: boolean;
}

export default function LoginScreen({ onLogin, useMockData = false }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    if (useMockData) return;

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session check error:', sessionError);
        return;
      }

      if (session?.user) {
        // User has active session, fetch their data
        await handleAuthenticatedUser(session.access_token, session.user.id);
      }
    } catch (err: any) {
      // Handle network errors gracefully - don't show error if it's a network issue
      const isNetworkError = err?.message?.includes('Failed to fetch') || 
                            err?.message?.includes('ERR_INTERNET_DISCONNECTED') ||
                            err?.code === 'ERR_NETWORK' ||
                            err?.name === 'TypeError';
      
      if (isNetworkError) {
        console.warn('Network error checking session - user may be offline:', err);
        // Silently fail - user can still log in manually
        return;
      }
      
      console.error('Error checking session:', err);
    }
  };

  const handleAuthenticatedUser = async (accessToken: string, userId: string) => {
    try {
      setIsLoading(true);
      console.log('=== AUTHENTICATING USER ===');
      console.log('User ID:', userId);

      // Get user metadata from Supabase auth
      const supabase = createClient();
      let authUser;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user;
      } catch (authErr: any) {
        const isNetworkError = authErr?.message?.includes('Failed to fetch') || 
                              authErr?.code === 'ERR_NETWORK' ||
                              authErr?.name === 'TypeError';
        if (isNetworkError) {
          throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
        }
        throw authErr;
      }

      const userEmail = authUser?.email || email;

      // Check if there's a pending user with this email and convert to active
      if (userEmail) {
        try {
          const convertedUser = await convertPendingToActive(userEmail, userId);
          if (convertedUser) {
            console.log('Converted pending user to active:', convertedUser);
          }
        } catch (convertErr: any) {
          // Non-critical error, continue
          console.warn('Error converting pending user:', convertErr);
        }
      }

      // Fetch or create user profile using direct Supabase client
      let userProfile;
      try {
        userProfile = await getUserProfile(userId);
      } catch (profileErr: any) {
        const isNetworkError = profileErr?.message?.includes('Failed to fetch') || 
                              profileErr?.code === 'ERR_NETWORK' ||
                              profileErr?.name === 'TypeError';
        if (isNetworkError) {
          throw new Error('Network error: Unable to fetch user profile. Please check your internet connection.');
        }
        throw profileErr;
      }

      if (!userProfile) {
        // User doesn't exist, create profile
        console.log('User profile not found, creating new profile...');
        
        try {
          userProfile = await createUserProfile({
            id: userId,
            email: userEmail,
            first_name: firstName || authUser?.user_metadata?.first_name || 'User',
            last_name: lastName || authUser?.user_metadata?.last_name || '',
            avatar_url: authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture,
          });
          
          console.log('User profile created successfully');
        } catch (createErr: any) {
          const isNetworkError = createErr?.message?.includes('Failed to fetch') || 
                                createErr?.code === 'ERR_NETWORK' ||
                                createErr?.name === 'TypeError';
          if (isNetworkError) {
            throw new Error('Network error: Unable to create user profile. Please check your internet connection.');
          }
          throw createErr;
        }
      }

      // Fetch user's organizations
      let orgsData;
      try {
        orgsData = await getUserOrganizations(userId);
      } catch (orgErr: any) {
        const isNetworkError = orgErr?.message?.includes('Failed to fetch') || 
                              orgErr?.code === 'ERR_NETWORK' ||
                              orgErr?.name === 'TypeError';
        if (isNetworkError) {
          throw new Error('Network error: Unable to fetch organizations. Please check your internet connection.');
        }
        throw orgErr;
      }

      // Transform to app format
      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        avatar_url: userProfile.avatar_url,
      };

      const organizations: OrganizationMembership[] = orgsData.map((membership: any) => ({
        organization: membership.organization,
        role: membership.role,
      }));

      console.log('Authentication successful:', { user, organizations: organizations.length });

      // Call onLogin callback
      onLogin(user, organizations);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error handling authenticated user:', err);
      const errorMessage = err?.message || 'Failed to load user data';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Use mock data if requested
    if (useMockData) {
      setTimeout(() => {
        onLogin(MOCK_USER, MOCK_ORGANIZATIONS);
        setIsLoading(false);
      }, 1500);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Sign in error:', authError.message);
        // Provide more user-friendly error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.session) {
        await handleAuthenticatedUser(data.session.access_token, data.session.user.id);
      }
    } catch (err: any) {
      console.error('Error during email sign in:', err);
      setError(err.message || 'Sign in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!firstName || !lastName) {
      setError('Please provide your first and last name');
      setIsLoading(false);
      return;
    }

    try {
      // Sign up the user
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (authError) {
        console.error('Sign up error:', authError);
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // User is automatically signed in
        await handleAuthenticatedUser(data.session.access_token, data.session.user.id);
      } else if (data.user && !data.session) {
        // Email confirmation required
        setError('Please check your email to confirm your account before signing in.');
        setIsLoading(false);
        setIsSignUp(false);
      }
    } catch (err: any) {
      console.error('Error during email sign up:', err);
      setError(err.message || 'Sign up failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    // Use mock data if requested
    if (useMockData) {
      setTimeout(() => {
        onLogin(MOCK_USER, MOCK_ORGANIZATIONS);
        setIsLoading(false);
      }, 1500);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (authError) {
        console.error('OAuth error:', authError);
        setError('Google authentication failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // The redirect will happen automatically
    } catch (err: any) {
      console.error('Error during Google login:', err);
      setError(err.message || 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-sky-900 mb-2">Gig Manager</h1>
          <p className="text-gray-600">Production and event management platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <Tabs value={isSignUp ? 'signup' : 'signin'} onValueChange={(v) => setIsSignUp(v === 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-sky-500 hover:bg-sky-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in with Email'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Minimum 6 characters</p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-sky-500 hover:bg-sky-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500">
              OR
            </span>
          </div>

          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-11 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400"
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {useMockData ? 'Using mock data for demonstration' : 'Secure authentication powered by Supabase'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>© 2025 Gig Manager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}