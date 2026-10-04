import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Mail } from 'lucide-react';
import { AmbientLivingBackground } from '@/landing/cinematic';
import { AuthNav } from '@/components/navigation';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Focus on email field when component mounts
  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch (error) {
      // Error is handled by the useAuth hook with toast
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setSubmittedEmail('');
    reset();
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
        <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
        <AuthNav />
        <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Mail className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to {submittedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or try again.
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleTryAgain}
            >
              Try Different Email
            </Button>
            
            <div className="text-center text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
      <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
      <AuthNav />
      <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register('email')}
                data-testid="email-input"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <div id="email-error" className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-destructive" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="send-reset-button"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
