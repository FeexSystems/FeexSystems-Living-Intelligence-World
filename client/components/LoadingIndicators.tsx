import React from 'react';
import { Loader2, RefreshCw, Upload, Download, Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Basic Loading Spinner
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-primary',
        sizeClasses[size],
        className
      )} 
    />
  );
}

// Full Screen Loading
export function FullScreenLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Inline Loading
export function InlineLoading({ 
  message = 'Loading...', 
  size = 'sm' 
}: { 
  message?: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

// Button Loading States
interface ButtonLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  icon?: 'refresh' | 'upload' | 'download' | 'save' | 'send';
}

export function ButtonLoading({ 
  isLoading, 
  loadingText, 
  children, 
  icon 
}: ButtonLoadingProps) {
  const getIcon = () => {
    if (!isLoading) return null;
    
    switch (icon) {
      case 'refresh':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'upload':
        return <Upload className="h-4 w-4 animate-pulse" />;
      case 'download':
        return <Download className="h-4 w-4 animate-pulse" />;
      case 'save':
        return <Save className="h-4 w-4 animate-pulse" />;
      case 'send':
        return <Send className="h-4 w-4 animate-pulse" />;
      default:
        return <LoadingSpinner size="sm" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </div>
  );
}

// Progress Bar
interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  className, 
  showPercentage = false 
}: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm text-muted-foreground">{progress}%</span>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

// Pulsing Dot Indicator
export function PulsingDot({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}

// Loading Overlay for specific components
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  message = 'Loading...', 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center rounded-md">
          <div className="text-center">
            <LoadingSpinner size="md" className="mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Shimmer Effect
export function ShimmerEffect({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'animate-pulse bg-linear-to-r from-muted via-muted/50 to-muted bg-size-[200%_100%]',
        className
      )}
      style={{
        animation: 'shimmer 2s infinite linear',
      }}
    />
  );
}

// Loading States for Different Operations
export const LoadingStates = {
  // Authentication operations
  SigningIn: () => <ButtonLoading isLoading={true} loadingText="Signing in..." children="Sign In" />,
  SigningUp: () => <ButtonLoading isLoading={true} loadingText="Creating account..." children="Sign Up" />,
  SigningOut: () => <ButtonLoading isLoading={true} loadingText="Signing out..." children="Sign Out" />,
  
  // Profile operations
  UpdatingProfile: () => <ButtonLoading isLoading={true} loadingText="Saving..." children="Save Changes" icon="save" />,
  UploadingImage: () => <ButtonLoading isLoading={true} loadingText="Uploading..." children="Upload" icon="upload" />,
  
  // Email operations
  SendingEmail: () => <ButtonLoading isLoading={true} loadingText="Sending..." children="Send" icon="send" />,
  VerifyingEmail: () => <InlineLoading message="Verifying email..." />,
  
  // General operations
  Saving: () => <ButtonLoading isLoading={true} loadingText="Saving..." children="Save" icon="save" />,
  Loading: () => <InlineLoading message="Loading..." />,
  Processing: () => <InlineLoading message="Processing..." />,
  Refreshing: () => <ButtonLoading isLoading={true} loadingText="Refreshing..." children="Refresh" icon="refresh" />,
};

// Hook for managing loading states
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);
  
  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(() => setIsLoading(prev => !prev), []);
  
  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading,
  };
}

// Add shimmer animation to global CSS
const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}