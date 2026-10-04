import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, CheckCircle, AlertTriangle } from "lucide-react";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { PasswordResetRequestForm } from "./password-reset-request-form";
import { PasswordResetForm } from "./password-reset-form";
import { EmailVerificationForm } from "./email-verification-form";
import { useAuthStore } from "@/store/auth";
import { FeexHorizontalLockup } from "@/components/FeexLogo";

export default function AuthenticationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error, clearError } = useAuthStore();
  
  // Determine the active tab based on URL parameters
  const mode = searchParams.get('mode') || 'login';
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const message = searchParams.get('message');
  const [activeTab, setActiveTab] = useState(mode);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  // Handle different authentication modes
  const renderContent = () => {
    switch (mode) {
      case 'reset-password':
        if (token) {
          return (
            <Card className="w-[400px]">
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your new password below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordResetForm token={token} />
              </CardContent>
            </Card>
          );
        } else {
          return (
            <Card className="w-[400px]">
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordResetRequestForm />
              </CardContent>
            </Card>
          );
        }

      case 'verify-email':
        if (token) {
          return (
            <Card className="w-[400px]">
              <CardHeader>
                <CardTitle>Verify Email</CardTitle>
                <CardDescription>
                  Verifying your email address...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailVerificationForm token={token} />
              </CardContent>
            </Card>
          );
        } else {
          return (
            <Card className="w-[400px]">
              <CardHeader>
                <CardTitle>Email Verification Required</CardTitle>
                <CardDescription>
                  Please check your email and click the verification link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailVerificationForm />
              </CardContent>
            </Card>
          );
        }

      case 'success':
        return (
          <Card className="w-[400px]">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Success!</CardTitle>
              <CardDescription>
                {message || "Operation completed successfully."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to your FeexSystems account to continue.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LoginForm />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join FeexSystems and start building amazing projects.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RegisterForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo/Brand */}
        <div className="flex justify-center mb-8">
          <FeexHorizontalLockup markSize={48} showSubtitle={false} />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearError}
                className="h-auto p-1 text-destructive hover:text-destructive"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {message && mode !== 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {renderContent()}

        {/* Footer Links */}
        {mode === 'login' || mode === 'register' ? (
          <div className="text-center text-sm text-muted-foreground">
            <p>
              By continuing, you agree to our{" "}
              <a href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
