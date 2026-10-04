import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AmbientLivingBackground } from '@/landing/cinematic';
import { AuthNav } from '@/components/navigation';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const { verifyEmail, resendVerificationEmail, isLoading, clearError } = useAuth();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (token) {
      handleVerifyEmail(token);
    } else {
      setStatus('error');
    }
  }, [token]);

  const handleVerifyEmail = async (verificationToken: string) => {
    try {
      await verifyEmail(verificationToken);
      setStatus('success');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      // Check if it's an expired token error
      if (error instanceof Error && error.message.includes('expired')) {
        setStatus('expired');
      } else {
        setStatus('error');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Unable to resend verification email.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await resendVerificationEmail(email);
    } catch (error) {
      // Error is handled by the useAuth hook
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying Your Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You'll be redirected to login shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link to="/login">Continue to Login</Link>
              </Button>
            </CardContent>
          </>
        );

      case 'expired':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-orange-500" />
              </div>
              <CardTitle>Verification Link Expired</CardTitle>
              <CardDescription>
                This verification link has expired or is invalid. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleResendVerification} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>
                We couldn't verify your email address. The link may be invalid or expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleResendVerification} 
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              <div className="text-center text-sm">
                <Link to="/register" className="text-primary hover:underline">
                  Create New Account
                </Link>
                {' • '}
                <Link to="/login" className="text-primary hover:underline">
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
      <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
      <AuthNav />
      <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
        {renderContent()}
      </Card>
    </div>
  );
}
