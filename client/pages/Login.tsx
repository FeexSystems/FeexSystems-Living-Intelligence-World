import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthFormSkeleton } from '@/components/LoadingSkeletons';
import { Loader2, Chrome } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AmbientLivingBackground } from '@/landing/cinematic';
import { AuthNav } from '@/components/navigation';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const location = useLocation();

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Focus on email field when component mounts
  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Show loading skeleton while auth is initializing.
  //
  // Only on the FIRST load. `useAuth` exposes a single `isLoading` that covers
  // both "restoring the session" and "submitting the form"; if we swapped in the
  // skeleton on every isLoading tick the form would vanish mid-submit and the
  // disabled "Signing in..." button below would be dead code. So once the user
  // submits we keep the form mounted and let it show its own busy state.
  //
  // This early return MUST stay after every hook above — returning before a
  // hook changes the hook count between renders, which makes React throw
  // "Rendered fewer hooks than expected" whenever `isLoading` flips.
  if (isLoading && !error && !hasSubmitted) {
    return <AuthFormSkeleton />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setHasSubmitted(true);
    try {
      await login(data.email, data.password, from);
    } catch (error) {
      // Error is handled by the useAuth hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 pt-20 relative overflow-hidden font-mono">
      <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
      <AuthNav />
      <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle id="login-title">Welcome Back</CardTitle>
          <CardDescription id="login-description">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4" role="alert" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
            aria-labelledby="login-title"
            aria-describedby="login-description"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                data-testid="email-input"
                {...register('email')}
                disabled={isLoading}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                  aria-label="Reset your password"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                data-testid="password-input"
                {...register('password')}
                disabled={isLoading}
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              data-testid="login-button"
              disabled={isLoading}
              aria-busy={isLoading}
              aria-label={isLoading ? 'Signing in, please wait' : 'Sign in to your account'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/85 px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-xl mb-4 text-white hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:border-white/40 active:scale-[0.98] font-mono tracking-wide"
            onClick={async () => {
              try {
                await loginWithGoogle(from);
              } catch (err) {
                // Handled in useAuth toast
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>

          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
