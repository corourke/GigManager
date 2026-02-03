import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface InvitationErrorScreenProps {
  error: string;
  errorDescription?: string;
  onBackToLogin: () => void;
}

export default function InvitationErrorScreen({
  error,
  errorDescription,
  onBackToLogin,
}: InvitationErrorScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-2xl mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-red-900 mb-2">Invitation Error</h1>
          <p className="text-gray-600">Something went wrong with your invitation</p>
        </div>

        <Card className="p-8 text-center">
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-1">
                {error === 'access_denied' ? 'Link Expired or Invalid' : 'Error'}
              </p>
              <p className="text-sm text-red-600">
                {errorDescription || 'The invitation link you followed is no longer valid.'}
              </p>
            </div>
            
            <p className="text-sm text-gray-600">
              Invitations usually expire after 24 hours or after they have been accepted. 
              Please ask your administrator to send you a new invitation if you still need access.
            </p>

            <Button
              onClick={onBackToLogin}
              variant="outline"
              className="w-full h-12 text-lg"
            >
              <ArrowLeft className="mr-2 w-5 h-5" />
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
