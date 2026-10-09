import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { ProtectedRoute, PublicRoute, GuestOnlyRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { resolveRouteTitle, ScrollToTop } from "@/components/navigation";
import { globalErrorHandler } from "@/lib/error-handler";
import { announcePolite } from "@/lib/announcements";
import Index from "./pages/Index";
import { Bushfeexer } from "@/components/Bushfeexer";
import { useWebMCP } from "@/hooks/useWebMCP";
import { StructuredData } from "@/components/agentic/StructuredData";
import { SkipLink } from "@/components/SkipLink";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";

function WebMCPRegistrar() {
  useWebMCP();
  return null;
}

function NetworkStatus() {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      toast.error("You are offline. Please check your network connection.", { duration: 10000 });
      wasOffline.current = true;
    } else if (wasOffline.current) {
      toast.success("You are back online!", { duration: 3000 });
      wasOffline.current = false;
    }
  }, [isOnline]);

  return null;
}

// Route-level code splitting: only the landing entry is eager. Every other
// route is lazily imported so visiting `/` does not download the dashboard,
// auth, security and devops bundles (previously ~22 eager page modules).
const Projects = lazy(() => import("./pages/Projects"));
const Navigator = lazy(() => import("./pages/Navigator"));
const EvidenceExplorer = lazy(() => import("./pages/EvidenceExplorer"));
const OmniCommand = lazy(() => import("./pages/OmniCommand"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const DashboardIndex = lazy(() => import("./pages/dashboard/index"));
const AIServicesPage = lazy(() => import("./pages/dashboard/ai-services"));
const AIAgentsPage = lazy(() => import("./pages/dashboard/ai-agents"));
const AIObservabilityPage = lazy(() => import("./pages/dashboard/ai-observability"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/analytics"));
const BillingPage = lazy(() => import("./pages/dashboard/billing"));
const DevOpsPage = lazy(() => import("./pages/dashboard/devops"));
const SecurityPage = lazy(() => import("./pages/dashboard/security"));
const SettingsPage = lazy(() => import("./pages/dashboard/settings"));
const TeamsPage = lazy(() => import("./pages/dashboard/teams"));
const DashboardProfilePage = lazy(() => import("./pages/dashboard/profile"));
const MarketingCommandCenter = lazy(() => import("./pages/dashboard/marketing"));

// Lazy-loaded heavy routes
const SpatialWorld = lazy(() => import("./pages/SpatialWorld"));
const AdminIndex = lazy(() => import("./pages/admin/index"));
const AdminUsers = lazy(() => import("./pages/admin/users"));
const AdminHealth = lazy(() => import("./pages/admin/health"));
const AdminSecurity = lazy(() => import("./pages/admin/security"));
const AdminAuditLogs = lazy(() => import("./pages/admin/audit-logs"));
const AdminSubscriptions = lazy(() => import("./pages/admin/subscriptions"));

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

/**
 * Per-route document title.
 *
 * The static <title> in index.html covers crawlers; this keeps the browser tab,
 * history entries and bookmark labels in sync once the SPA navigates. Labels and
 * titles derive from the shared navigation registry so they never drift from the
 * breadcrumbs and back controls.
 */
function RouteTitle() {
  const location = useLocation();
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    const title = resolveRouteTitle(location.pathname);
    document.title = title;
    // WCAG 4.1.3 / 2.4.2: an SPA route change does not reload the document, so
    // assistive tech is otherwise unaware the view changed. Announce the new
    // page name. Skipped on first mount — the initial document title already
    // conveys it, and announcing on load is noise.
    if (hasNavigatedRef.current) {
      announcePolite(title);
    }
    hasNavigatedRef.current = true;
  }, [location.pathname]);
  return null;
}

const BASE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "FeexSystems Living Intelligence",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web",
  "description": "An evidence-backed engineering intelligence platform featuring an explorable World Model.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "/navigator?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

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
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <RouteTitle />
            <ScrollToTop />
            <WebMCPRegistrar />
            <NetworkStatus />
            <StructuredData schema={BASE_SCHEMA} />
            <ErrorBoundary
              onError={(error, errorInfo) =>
                globalErrorHandler.captureException(error, {
                  componentStack: errorInfo.componentStack,
                  section: "router",
                })
              }
            >
              <FirebaseAuthProvider>
                <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
                  <div id="main-content" role="main">
                    <Routes>
                    {/* Public World Model & Showcase Experience: 3D Galaxy, Omni Command, Projects & Landing */}
                  <Route path="/" element={<Public><Index /></Public>} />
                  <Route path="/world" element={<Public><SpatialWorld /></Public>} />
                  <Route path="/omni" element={<Public><OmniCommand /></Public>} />
                  <Route path="/projects" element={<Public><Projects /></Public>} />

                  {/* Public Intelligence & Evidence Services */}
                  <Route path="/navigator" element={<Public><Navigator /></Public>} />
                  <Route path="/evidence" element={<Public><EvidenceExplorer /></Public>} />
                  <Route path="/evidence/:projectId" element={<Public><EvidenceExplorer /></Public>} />
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
                  <Route path="/dashboard/ai-services" element={<Protected><AIServicesPage /></Protected>} />
                  <Route path="/dashboard/ai-agents" element={<Protected><AIAgentsPage /></Protected>} />
                  <Route path="/dashboard/ai-observability" element={<Protected><AIObservabilityPage /></Protected>} />
                  <Route path="/dashboard/ai" element={<Navigate to="/dashboard/ai-services" replace />} />
                  <Route path="/dashboard/analytics" element={<Protected><AnalyticsPage /></Protected>} />
                  <Route path="/dashboard/billing" element={<Protected><BillingPage /></Protected>} />
                  <Route path="/dashboard/devops" element={<Protected><DevOpsPage /></Protected>} />
                  <Route path="/dashboard/security" element={<Protected><SecurityPage /></Protected>} />
                  <Route path="/dashboard/settings" element={<Protected><SettingsPage /></Protected>} />
                  <Route path="/dashboard/teams" element={<Protected><TeamsPage /></Protected>} />
                  <Route path="/dashboard/profile" element={<Protected><DashboardProfilePage /></Protected>} />
                  <Route path="/dashboard/marketing" element={<Protected><MarketingCommandCenter /></Protected>} />

                  {/* Legacy redirects */}
                  <Route path="/ai" element={<Navigate to="/dashboard/ai-services" replace />} />
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
                  </div>
                </Suspense>
                {/* Global chat widget — visible on all pages */}
                <Bushfeexer />
              </FirebaseAuthProvider>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);

export default App;
