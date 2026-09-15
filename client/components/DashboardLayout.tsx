import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Shield,
  Code,
  Bot,
  Settings,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  Home,
  CreditCard,
  Activity,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Zap,
  Globe,
  Megaphone
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ConnectionStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';
import { AmbientLivingBackground } from '@/components/framer';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard, description: 'Overview & stats' },
  { name: 'Spatial Galaxy', href: '/world', icon: Globe, description: '3D Knowledge Graph' },
  { name: 'Omni Command', href: '/omni', icon: Terminal, description: 'World Model Stage' },
  { name: 'AI Services', href: '/dashboard/ai', icon: Bot, description: 'AI-powered tools' },
];

const subNavigation = [
  { name: 'Marketing', href: '/dashboard/marketing', icon: Megaphone, description: 'Gaps, decay & opportunities' },
  { name: 'DevOps', href: '/dashboard/devops', icon: Code, description: 'CI/CD & deployments' },
  { name: 'Security', href: '/dashboard/security', icon: Shield, description: 'Scans & compliance' },
  { name: 'Teams', href: '/dashboard/teams', icon: Users, description: 'Team management' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, description: 'Usage insights' },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard, description: 'Plans & invoices' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Preferences' },
];

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'System Health', href: '/admin/health', icon: Activity },
  { name: 'Security Monitoring', href: '/admin/security', icon: Shield },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useFirebaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    // Navigate back, but stop at dashboard
    if (location.pathname === '/dashboard') {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const canGoBack = location.pathname !== '/dashboard';

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const getPageTitle = () => {
    const current = navigation.find(item => isActive(item.href));
    if (current) return current.name;
    const adminCurrent = adminNavigation.find(item => isActive(item.href));
    if (adminCurrent) return adminCurrent.name;
    if (location.pathname.includes('/profile')) return 'Profile';
    return 'Dashboard';
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <AmbientLivingBackground fixed={true} opacity={18} linesOpacity={10} />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-card/90 backdrop-blur-md border-r border-border transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-black" />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold text-white">
                  FeexSystems
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex h-8 w-8 p-0"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-8 w-8 p-0"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={active ? 'secondary' : 'ghost'}
                    className={`w-full ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} h-10 ${active
                      ? 'bg-white/10 text-white border border-white/30 hover:bg-white/20'
                      : 'hover:bg-muted/50'
                      }`}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-white' : ''}`} />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-border space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Services
                </div>
              )}
              {subNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={active ? 'secondary' : 'ghost'}
                    className={`w-full ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} h-10 ${active
                      ? 'bg-white/10 text-white border border-white/30 hover:bg-white/20'
                      : 'hover:bg-muted/50'
                      }`}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-white' : ''}`} />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Admin Navigation */}
            {isAdmin && (
              <>
                <div className="pt-4 mt-4 border-t border-border">
                  {!sidebarCollapsed && (
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Admin
                    </div>
                  )}
                  <div className="space-y-1">
                    {adminNavigation.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                          <Button
                            key={item.name}
                            variant={active ? 'secondary' : 'ghost'}
                            className={`w-full ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} h-10 ${active
                              ? 'bg-white/10 text-white border border-white/30 hover:bg-white/20'
                              : 'hover:bg-muted/50'
                              }`}
                            onClick={() => {
                              navigate(item.href);
                              setSidebarOpen(false);
                            }}
                            title={sidebarCollapsed ? item.name : undefined}
                          >
                            <Icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-white' : ''}`} />
                            {!sidebarCollapsed && (
                              <span className="truncate">{item.name}</span>
                            )}
                          </Button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </nav>

          {/* User Profile */}
          <div className="border-t border-border p-3">
            {sidebarCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full h-10 p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl} alt={user?.firstName} />
                      <AvatarFallback className="bg-white text-black text-xs">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.profileImageUrl} alt={user?.firstName} />
                  <AvatarFallback className="bg-white text-black text-sm">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-6 lg:px-8 shadow-sm sm:gap-x-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-9 w-9 p-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Back button */}
          {canGoBack && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleBack}
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}

          {/* Page title */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-x-2 sm:gap-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Connection Status */}
            <div className="hidden sm:block">
              <ConnectionStatusIndicator />
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* User role badge */}
            <Badge
              variant="outline"
              className={`hidden sm:inline-flex ${user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
                ? 'border-white/50 text-white bg-white/10'
                : 'border-white/50 text-white bg-white/10'
                }`}
            >
              {user?.role}
            </Badge>
          </div>
        </div>

        {/* Page content */}
        <main className="relative z-10 py-4 sm:py-6">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Notifications panel */}
      {notificationsOpen && (
        <div className="fixed right-4 top-20 z-50 w-80 bg-card border border-border rounded-lg shadow-lg">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-white rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New team invitation</p>
                <p className="text-xs text-muted-foreground">You've been invited to join Team Alpha</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-white/60 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Security scan completed</p>
                <p className="text-xs text-muted-foreground">Vulnerability scan for repo/backend completed</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-white/30 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Usage limit warning</p>
                <p className="text-xs text-muted-foreground">You're approaching your AI requests limit</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
