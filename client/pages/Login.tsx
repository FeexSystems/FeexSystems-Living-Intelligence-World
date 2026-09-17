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
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { AmbientLivingBackground } from '@/components/framer';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isLoading, error, clearError } = useAuth();
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

  const handleQuickFillAdmin = () => {
    setValue('email', 'admin@feexsystems.com', { shouldValidate: true });
    setValue('password', 'FeexAdmin2026!', { shouldValidate: true });
  };

  // Show loading skeleton while auth is initializing
  if (isLoading && !error) {
    return <AuthFormSkeleton />;
  }

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Focus on email field when component mounts
  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, from);
    } catch (error) {
      // Error is handled by the useAuth hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 relative overflow-hidden font-mono">
      <AmbientLivingBackground fixed={true} opacity={38} linesOpacity={18} />
      <Card className="w-full max-w-md relative z-10 border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle id="login-title">Welcome Back</CardTitle>
          <CardDescription id="login-description">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {import.meta.env.DEV && (
            <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-semibold tracking-wide uppercase text-[10px] text-amber-200">Dev Full Access</span>
                <span className="text-white/60">• admin@feexsystems.com</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillAdmin}
                className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                aria-label="Quick fill full access super admin test credentials"
              >
                ⚡ Quick Fill Super Admin
              </button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4" role="alert" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
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

            {error && (
              <div className="text-sm text-destructive" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
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

            <div className="text-center text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Create account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}