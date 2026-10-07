# FEEXSYSTEMS Frontend Architecture

## Overview

FEEXSYSTEMS frontend is a React 18 SPA built with TypeScript, Vite, and TailwindCSS 3. It features a cinematic landing experience with WebGL 3D elements, a spatial knowledge galaxy (`/world`), and AI-powered interfaces (Navigator, Omni-Command).

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.x |
| Routing | React Router | 7.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 6.x |
| Styling | TailwindCSS | 3.x |
| 3D Graphics | Three.js, @react-three/fiber, @react-three/drei | Latest |
| Icons | Lucide React | Latest |
| UI Components | Radix UI Primitives | Latest |
| State Management | Zustand, React Query | Latest |
| Forms | React Hook Form + Zod | Latest |
| Testing | Vitest, Playwright, MSW | Latest |

## Project Structure

```
client/
├── App.tsx                    # React Router 7 routing & error boundaries
├── src/
│   └── main.tsx               # SPA entry point (loaded by /index.html)
├── global.css                 # TailwindCSS entry (imports all partials)
│
├── pages/                     # Route components
│   ├── Index.tsx              # Landing page wrapper
│   ├── Projects.tsx           # Public project explorer
│   ├── Navigator.tsx          # AI-grounded Navigator interface
│   ├── SpatialWorld.tsx       # Full-screen 3D Spatial Galaxy
│   ├── EvidenceExplorer.tsx   # Evidence Fabric Ledger
│   ├── OmniCommand.tsx        # Agent-driven command stage
│   ├── Login.tsx              # Authentication pages
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   ├── EmailVerification.tsx
│   ├── UserProfile.tsx
│   ├── NotFound.tsx
│   └── dashboard/             # Authenticated dashboard routes
│       ├── index.tsx
│       ├── ai-services/
│       ├── devops/
│       └── security/
│
├── landing/                   # Cinematic landing experience
│   ├── Landing.tsx            # Main landing orchestrator
│   ├── components/            # CinematicScene, NavigationOverlay
│   ├── scenes/                # Seven-scene landing composition
│   │   ├── HeroScene.tsx
│   │   ├── WorldsScene.tsx
│   │   ├── GalaxySequenceScene.tsx
│   │   ├── CoreSystemsScene.tsx
│   │   ├── MissionCapabilityScene.tsx
│   │   ├── UILoopsScene.tsx
│   │   └── ConvergenceScene.tsx
│   ├── cinematic/             # Cinematic primitives
│   │   ├── SceneController.tsx
│   │   ├── AssetPreloader.tsx
│   │   ├── MagneticGlowButton.tsx
│   │   ├── TransitionVisualizer.tsx
│   │   ├── SequentialCarousel.tsx
│   │   └── SushCinematicCarousel.tsx
│   ├── motion/                # Motion system & animations
│   ├── registry/              # Landing assets registry
│   └── world/                 # World model components
│
├── components/                # Shared components
│   ├── ui/                    # Radix + Tailwind component library
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   └── ... (25+ components)
│   ├── galaxy/                # 3D Galaxy scene components
│   ├── sovereign/             # Sovereign HUD runtime
│   ├── omni/                  # Omni-Command stage components
│   ├── motion/                # Animation & motion components
│   ├── media/                 # Media components (video, previews)
│   ├── carousel/              # Carousel & ticker components
│   ├── agentic/               # Structured data & SEO
│   ├── navigation/            # Navigation components
│   ├── FeexLogo.tsx           # Logo components
│   ├── ProtectedRoute.tsx     # Auth route guards
│   ├── ErrorBoundary.tsx      # Error handling
│   └── LoadingIndicators.tsx  # Loading states
│
├── hooks/                     # Custom React hooks
│   ├── use-auth.ts            # Firebase authentication
│   ├── use-toast.ts           # Toast notifications
│   ├── useWebMCP.ts           # MCP integration
│   └── ...
│
├── lib/                       # Utilities & services
│   ├── utils.ts               # Tailwind cn() helper
│   ├── api-client.ts          # API client with auth
│   ├── firebase.ts            # Firebase config
│   ├── firebase-auth.tsx      # Auth provider
│   ├── auth-store.tsx         # Auth state management
│   ├── worldModelClient.ts    # World Model API client
│   ├── error-handler.ts       # Global error handling
│   └── sonikAudio.ts          # Audio engine
│
├── stores/                    # Zustand stores
│   ├── omniStore.ts           # Omni-Command state
│   └── ...
│
├── world-model/               # World Model types & registry
│   ├── types/
│   │   └── ecosystem.ts
│   └── registry/
│       ├── planetary-ecosystems.ts
│       └── evidence.ts
│
├── styles/                    # CSS partials
│   ├── sovereign-hud-glass.css
│   ├── global-body-p0.css
│   └── ...
│
└── test/                      # Test infrastructure
    ├── setup.ts               # Vitest setup & mocks
    ├── utils/                 # Test utilities
    │   ├── test-utils.tsx     # renderWithProviders
    │   └── mock-factories.ts  # Mock data factories
    ├── mocks/                 # MSW handlers
    ├── templates/             # Test templates
    └── [unit tests...]        # Test files mirror src structure
```

## Path Aliases

Path aliases are configured in `tsconfig.json` and `vite.config.ts`:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

**Usage:**
```typescript
// ✅ Preferred - use @/ alias for client imports
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

// ✅ For shared types
import type { OmniCommandResponse } from '@shared/orchestration';

// ❌ Avoid deep relative paths
import { Button } from '../../../components/ui/button';
```

## Routing Architecture

### Route Structure

```typescript
// client/App.tsx
<Routes>
  {/* Public routes (accessible to guests and authenticated users) */}
  <Route path="/" element={<Index />} />
  <Route path="/projects" element={<Projects />} />
  <Route path="/navigator" element={<Navigator />} />
  <Route path="/world" element={<SpatialWorld />} />
  <Route path="/evidence" element={<EvidenceExplorer />} />
  <Route path="/omni" element={<OmniCommand />} />
  
  {/* Guest-only routes (redirect if authenticated) */}
  <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
  <Route path="/register" element={<GuestOnlyRoute><Register /></GuestOnlyRoute>} />
  
  {/* Protected routes (require authentication) */}
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
    <Route path="ai-services" element={<AIServices />} />
    <Route path="devops" element={<DevOps />} />
    <Route path="security" element={<Security />} />
  </Route>
  
  {/* Admin routes */}
  <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
  
  {/* 404 fallback */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Route Guards

| Guard | Purpose |
|-------|---------|
| `ProtectedRoute` | Requires authentication |
| `GuestOnlyRoute` | Redirects authenticated users |
| `AdminRoute` | Requires admin role |
| `SuperAdminRoute` | Requires superadmin role |

## Component Architecture

### UI Component Library

Located in `client/components/ui/`, built on Radix UI primitives with TailwindCSS styling.

**Design Principles:**
- Compound component pattern (e.g., `Card`, `CardHeader`, `CardContent`)
- Consistent prop interface via `React.ComponentPropsWithoutRef`
- TailwindCSS utility classes for styling
- `cn()` utility for conditional class merging

**Example:**
```typescript
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
```

### Motion & Animation

**Motion System** (`client/landing/motion/`):
- Consistent animation variants
- Spring configurations
- Transition presets

**Animation Libraries:**
- Framer Motion for complex sequences
- CSS animations for performance-critical elements
- Web Animations API for scroll-driven effects

### 3D Graphics Architecture

**Spatial World** (`/world`):
- `@react-three/fiber` Canvas with WebXR support
- `@react-three/drei` helpers (OrbitControls, Environment, etc.)
- Custom GLSL shaders for visual effects
- Performance optimization with `dpr={[1, 2]}` for high-DPI displays

**Key Safeguards:**
```typescript
// Always clamp pixel ratio to prevent thermal throttling
<Canvas dpr={[1, 2]}>
  {/* Scene content */}
</Canvas>

// Register GLSL transform plugins in both configs
// vite.config.ts & vitest.config.ts
```

## State Management

### Authentication State

```typescript
// hooks/use-auth.ts - Firebase Auth
const { user, loading, error, signIn, signOut } = useAuth();

// lib/auth-store.tsx - Zustand store (migration shim)
export const useAuthStore = () => useAuth();
```

### Server State

```typescript
// React Query for server state
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, // React Query v5 name (formerly cacheTime)
    },
  },
});
```

### Local State

```typescript
// Zustand for client-only state
import { create } from 'zustand';

export const useOmniStore = create<OmniState>((set) => ({
  command: '',
  response: null,
  setCommand: (cmd) => set({ command: cmd }),
  // ...
}));
```

## Styling Architecture

### TailwindCSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./client/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Custom color palette
      },
      fontFamily: {
        // Custom typography
      },
      animation: {
        // Custom animations
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};
```

### CSS Architecture

```
client/
├── global.css                 # Main entry - imports all partials
└── styles/
    ├── sovereign-hud-glass.css    # HUD glass morphism
    ├── global-body-p0.css         # Base styles
    └── ...                         # Feature-specific styles
```

**Import Order:**
1. TailwindCSS base/styles
2. Custom CSS partials
3. Component-level styles

## Testing Architecture

### Test Stack

| Type | Tool | Location |
|------|------|----------|
| Unit | Vitest | `client/**/*.test.{ts,tsx}` |
| Integration | Vitest + MSW | `client/test/integration/` |
| E2E | Playwright | `e2e/**/*.spec.ts` |
| Mocking | MSW | `client/test/mocks/` |

### Test Infrastructure

```typescript
// client/test/setup.ts
// Global mocks: matchMedia, IntersectionObserver, ResizeObserver, localStorage

// client/test/utils/test-utils.tsx
export function renderWithProviders(ui: React.ReactElement, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={testQueryClient}>
        <BrowserRouter>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ),
    ...options,
  });
}
```

### Component Test Template

See `client/test/templates/component.test.tsx.template` for the canonical test structure.

## API Integration

### API Client

```typescript
// lib/api-client.ts
export const apiClient = new ApiClient({
  baseURL: '/api',
  onUnauthorized: () => {
    // Handle 401 - redirect to login
  },
});

// Usage
const response = await apiClient.get('/world-model/projects');
```

### World Model Client

```typescript
// lib/worldModelClient.ts
export async function fetchWorldProjects(): Promise<WorldModelProject[]> {
  return apiClient.get('/world-model/projects');
}

export async function fetchWorldMetrics(): Promise<WorldMetrics> {
  return apiClient.get('/world-model/metrics');
}
```

## Performance Guidelines

### Bundle Optimization

- **Code splitting** via React.lazy() and dynamic imports
- **Route-level splitting**: every route in `App.tsx` is `lazy()` except the landing entry (`Index`) — visiting `/` does not download dashboard/admin bundles
- **Chunk strategy** defined in `vite.config.ts`:
  - `react-vendor`: React core
  - `three-vendor`: Three.js (large, isolated)
  - `r3f-vendor`: React Three Fiber ecosystem
  - `ui-vendor`: Radix UI components
  - `query-vendor`: TanStack Query

### Rendering Performance

- **WebGL**: Clamp DPR with `dpr={[1, 2]}`
- **Lists**: Virtualization for long lists
- **Images**: Lazy loading with `loading="lazy"`
- **Animations**: Use `will-change` sparingly, prefer CSS animations

### Load Time Optimization

- **Critical CSS**: Inlined in `<head>`
- **Fonts**: Preload critical fonts
- **Images**: WebP with fallbacks, responsive images
- **3D Assets**: Progressive loading, LOD system

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

- **Semantic HTML**: Use proper heading hierarchy, landmarks
- **ARIA**: Labels for interactive elements
- **Keyboard Navigation**: All interactive elements focusable
- **Color Contrast**: Minimum 4.5:1 for text
- **Focus Management**: Visible focus indicators
- **Screen Readers**: Announce dynamic content changes

### Testing Accessibility

```typescript
// Use aria-label and role attributes
<button aria-label="Close dialog" onClick={onClose}>
  <X className="h-4 w-4" />
</button>

// Test with vitest-axe
import { axe } from 'vitest-axe';
const { container } = render(<Button />);
expect(await axe(container)).toHaveNoViolations();
```

## Error Handling

### Error Boundaries

```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    globalErrorHandler.capture(error, { extra: errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return <FallbackUI />;
    }
    return this.props.children;
  }
}
```

### Global Error Handler

```typescript
// lib/error-handler.ts
export const globalErrorHandler = {
  capture(error: Error, context?: Record<string, unknown>) {
    // Log to monitoring service
    console.error('[FEEXSYSTEMS]', error, context);
  },
};
```

## Development Workflow

### Commands

```bash
npm run dev        # Start dev server (Vite + Express on port 8080)
npm run build      # Build client & server
npm run start      # Start production server
npm test           # Run Vitest test suite
npm run typecheck  # TypeScript validation
```

### Environment Variables

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# API
VITE_API_URL=/api
```

## Security Considerations

- **Authentication**: Firebase Auth with session management
- **API Security**: CSRF protection, rate limiting
- **Input Validation**: Zod schemas on all forms
- **XSS Prevention**: React's default escaping, sanitize user content
- **CSP**: Content Security Policy headers

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL support required for `/world` spatial experience.

---

**Related Documentation:**
- [Architecture Overview](./ARCHITECTURE.md)
- [World Model](./WORLD_MODEL.md)
- [Evidence Fabric](./EVIDENCE_FABRIC.md)
- [Omni-Command](./OMNI_COMMAND.md)
- [Testing Guide](./TESTING.md)
- [API Reference](./API.md)
- [Frontend Modernization Plan](./FRONTEND_MODERNIZATION_PLAN.md)
- [Frontend Contributing Guide](../client/CONTRIBUTING.md)
