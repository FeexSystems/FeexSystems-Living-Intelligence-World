import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { AmbientLivingBackground } from '@/landing/cinematic';
import { AuthNav } from '@/components/navigation';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const { resetPassword, validateResetToken, isLoading, error, clearError } = useAuth();
  
  const token = searchParams.get('token');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      return;
    }

    // Validate token on component mount
    const validateToken = async () => {
      try {
        const isValid = await validateResetToken(token);
        setIsTokenValid(isValid);
        
        if (isValid) {
          // Focus on password field when token is valid
          setTimeout(() => setFocus('password'), 100);
        }
      } catch (error) {
        setIsTokenValid(false);
      }
    };

    validateToken();
  }, [token, validateResetToken, setFocus]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    try {
      await resetPassword(token, data.password);
      setIsResetComplete(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      // Error is handled by the useAuth hook with toast
    }
  };

  // Show loading state while validating token
  if (isTokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
        <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
        <AuthNav />
        <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <div className="text-center mt-4 text-muted-foreground">
              Validating reset link...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state for invalid token
  if (isTokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
        <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
        <AuthNav />
        <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Password reset links expire after 24 hours for security reasons.
            </div>
            
            <Button 
              asChild
              className="w-full"
            >
              <Link to="/forgot-password">
                Request New Reset Link
              </Link>
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

  // Show success state after password reset
  if (isResetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
        <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
        <AuthNav />
        <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              You will be redirected to the login page in a few seconds.
            </div>
            
            <Button 
              asChild
              className="w-full"
            >
              <Link to="/login">
                Continue to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
      <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
      <AuthNav />
      <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your new password"
                {...register('password')}
                data-testid="password-input"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby="password-requirements password-error"
              />
              {errors.password && (
                <div id="password-error" className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </div>
              )}
              <div id="password-requirements" className="text-xs text-muted-foreground">
                Must contain at least 8 characters with uppercase, lowercase, and number
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                {...register('confirmPassword')}
                data-testid="confirm-password-input"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {errors.confirmPassword && (
                <div id="confirmPassword-error" className="text-sm text-destructive" role="alert">
                  {errors.confirmPassword.message}
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
              data-testid="reset-password-button"
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
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
