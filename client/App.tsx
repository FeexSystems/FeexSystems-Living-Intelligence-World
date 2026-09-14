import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { ProtectedRoute, PublicRoute, GuestOnlyRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { globalErrorHandler } from "@/lib/error-handler";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import Navigator from "./pages/Navigator";
import SpatialWorld from "./pages/SpatialWorld";
import EvidenceExplorer from "./pages/EvidenceExplorer";
import OmniCommand from "./pages/OmniCommand";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EmailVerification from "./pages/EmailVerification";
import NotFound from "./pages/NotFound";
import UserProfile from "./pages/UserProfile";
import DashboardIndex from "./pages/dashboard/index";
import AIServicesPage from "./pages/dashboard/ai-services";
import AnalyticsPage from "./pages/dashboard/analytics";
import BillingPage from "./pages/dashboard/billing";
import DevOpsPage from "./pages/dashboard/devops";
import SecurityPage from "./pages/dashboard/security";
import SettingsPage from "./pages/dashboard/settings";
import TeamsPage from "./pages/dashboard/teams";
import DashboardProfilePage from "./pages/dashboard/profile";
import AdminIndex from "./pages/admin/index";
import AdminUsers from "./pages/admin/users";
import AdminHealth from "./pages/admin/health";
import AdminSecurity from "./pages/admin/security";
import AdminAuditLogs from "./pages/admin/audit-logs";
import AdminSubscriptions from "./pages/admin/subscriptions";
import MarketingCommandCenter from "./pages/dashboard/marketing";
import { Bushfeexer } from "@/components/Bushfeexer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        error instanceof Error && error.message.includes("401") ? false : failureCount < 3,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const Public = ({ children }: { children: React.ReactNode }) => <PublicRoute>{children}</PublicRoute>;
const GuestOnly = ({ children }: { children: React.ReactNode }) => <GuestOnlyRoute>{children}</GuestOnlyRoute>;
const Protected = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;

const App = () => (
  <ErrorBoundary
    onError={(error, errorInfo) =>
      globalErrorHandler.captureException(error, {
        componentStack: errorInfo.componentStack,
        section: "app-root",
      })
    }
  >
    <div className="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary
              onError={(error, errorInfo) =>
                globalErrorHandler.captureException(error, {
                  componentStack: errorInfo.componentStack,
                  section: "router",
                })
              }
            >
              <FirebaseAuthProvider>
                <Routes>
                  {/* Public World Model & Showcase Experience: 3D Galaxy, Omni Command, Projects & Landing */}
                  <Route path="/" element={<Public><Index /></Public>} />
                  <Route path="/world" element={<Public><SpatialWorld /></Public>} />
                  <Route path="/omni" element={<Public><OmniCommand /></Public>} />
                  <Route path="/projects" element={<Public><Projects /></Public>} />

                  {/* Authenticated Intelligence & Evidence Services */}
                  <Route path="/navigator" element={<Protected><Navigator /></Protected>} />
                  <Route path="/evidence" element={<Protected><EvidenceExplorer /></Protected>} />
                  <Route path="/evidence/:projectId" element={<Protected><EvidenceExplorer /></Protected>} />
                  <Route path="/lab" element={<Navigate to="/" replace />} />
                  <Route path="/components" element={<Navigate to="/" replace />} />

                  {/* Guest-only Authentication routes */}
                  <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                  <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
                  <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
                  <Route path="/reset-password" element={<GuestOnly><ResetPassword /></GuestOnly>} />
                  <Route path="/verify-email" element={<GuestOnly><EmailVerification /></GuestOnly>} />

                  {/* Authenticated Dashboard Experience */}
                  <Route path="/dashboard" element={<Protected><DashboardIndex /></Protected>} />
                  <Route path="/dashboard/ai" element={<Protected><AIServicesPage /></Protected>} />
                  <Route path="/dashboard/ai-services" element={<Protected><AIServicesPage /></Protected>} />
                  <Route path="/dashboard/analytics" element={<Protected><AnalyticsPage /></Protected>} />
                  <Route path="/dashboard/billing" element={<Protected><BillingPage /></Protected>} />
                  <Route path="/dashboard/devops" element={<Protected><DevOpsPage /></Protected>} />
                  <Route path="/dashboard/security" element={<Protected><SecurityPage /></Protected>} />
                  <Route path="/dashboard/settings" element={<Protected><SettingsPage /></Protected>} />
                  <Route path="/dashboard/teams" element={<Protected><TeamsPage /></Protected>} />
                  <Route path="/dashboard/profile" element={<Protected><DashboardProfilePage /></Protected>} />
                  <Route path="/dashboard/marketing" element={<Protected><MarketingCommandCenter /></Protected>} />

                  {/* Legacy redirects */}
                  <Route path="/ai" element={<Navigate to="/dashboard/ai" replace />} />
                  <Route path="/ai-services" element={<Navigate to="/dashboard/ai-services" replace />} />
                  <Route path="/devops" element={<Navigate to="/dashboard/devops" replace />} />
                  <Route path="/security" element={<Navigate to="/dashboard/security" replace />} />
                  <Route path="/analytics" element={<Navigate to="/dashboard/analytics" replace />} />
                  <Route path="/billing" element={<Navigate to="/dashboard/billing" replace />} />
                  <Route path="/teams" element={<Navigate to="/dashboard/teams" replace />} />
                  <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
                  <Route path="/subscription" element={<Navigate to="/dashboard/billing" replace />} />

                  {/* User Profile and Admin Routes */}
                  <Route path="/profile" element={<Protected><UserProfile /></Protected>} />
                  <Route path="/admin" element={<Protected><AdminIndex /></Protected>} />
                  <Route path="/admin/users" element={<Protected><AdminUsers /></Protected>} />
                  <Route path="/admin/health" element={<Protected><AdminHealth /></Protected>} />
                  <Route path="/admin/security" element={<Protected><AdminSecurity /></Protected>} />
                  <Route path="/admin/audit-logs" element={<Protected><AdminAuditLogs /></Protected>} />
                  <Route path="/admin/subscriptions" element={<Protected><AdminSubscriptions /></Protected>} />

                  {/* Catch-all 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </FirebaseAuthProvider>
              {/* Global chat widget — visible on all pages */}
              <Bushfeexer />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);

export default App;
