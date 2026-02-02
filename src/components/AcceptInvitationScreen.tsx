import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Building2, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { User, OrganizationMembership } from '../utils/supabase/types';

interface AcceptInvitationScreenProps {
  user: User;
  organizations: OrganizationMembership[];
  onContinue: () => void;
}

export default function AcceptInvitationScreen({
  user,
  organizations,
  onContinue,
}: AcceptInvitationScreenProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Artificial delay to feel like it's processing
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const latestOrg = organizations.length > 0 
    ? organizations[organizations.length - 1].organization 
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-sky-900 mb-2">Invitation Accepted!</h1>
          <p className="text-gray-600">Welcome to the team</p>
        </div>

        <Card className="p-8 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
              <p className="text-gray-600">Setting up your access...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  You're all set, {user.first_name || 'there'}!
                </h2>
                <p className="text-gray-600">
                  You've successfully joined {latestOrg?.name || 'the organization'}.
                </p>
              </div>

              <Button
                onClick={onContinue}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white h-12 text-lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
