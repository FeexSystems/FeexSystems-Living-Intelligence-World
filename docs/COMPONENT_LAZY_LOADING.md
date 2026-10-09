# Component-Level Lazy Loading

**Task Reference:** Phase 3, Sprint 11, Task 43

**Last Updated:** 2026-10-07

## Overview

This document identifies heavy components that should be lazy-loaded to improve initial bundle size and performance.

## Heavy Components Identified

### 1. Recharts (Chart Library)

**Files:**
- `client/components/ui/chart.tsx` - Chart wrapper component
- `client/components/visualizations/SentimentAndTags.tsx` - Chart usage (not imported anywhere)

**Bundle Impact:**
- Recharts is a heavy library (~200 KB unzipped)
- Used only in dashboard pages
- Not needed for initial page load

**Current Usage:**
- Chart component is in UI library
- Not actively used in critical paths (landing, projects, navigator, world)

**Recommendation:**
Lazy-load chart component only when needed:

```typescript
const Chart = React.lazy(() => import('@/components/ui/chart'));
```

### 2. Dialog Components

**Files:**
- `client/components/ui/dialog.tsx` - Base dialog component
- `client/components/ui/alert-dialog.tsx` - Alert dialog
- `client/components/ui/command.tsx` - Command palette

**Usage Locations:**
- Dashboard settings page
- Dashboard devops page
- Admin pages (subscriptions, audit-logs, users)
- Security components (ScanHistory, VulnerabilityDashboard, etc.)
- Devops components (DeploymentDashboard, PipelineList, ConnectRepositoryDialog)
- AI components (AITemplateManager)
- SessionTimeoutWarning

**Bundle Impact:**
- Dialog components are in UI vendor chunk (~490 KB unzipped)
- Radix UI dialog is part of this chunk
- Used extensively but not on initial load

**Recommendation:**
Lazy-load dialog components only when needed:

```typescript
const Dialog = React.lazy(() => import('@/components/ui/dialog'));
const AlertDialog = React.lazy(() => import('@/components/ui/alert-dialog'));
```

### 3. Other Heavy Components

**Admin Pages:**
- Subscriptions page
- Audit logs page
- Users page

**Security Components:**
- ScanHistory
- VulnerabilityDashboard
- ScanInitiationForm
- RemediationTracking

**DevOps Components:**
- DeploymentDashboard
- PipelineList
- ConnectRepositoryDialog

**AI Components:**
- AITemplateManager

**Recommendation:**
Lazy-load entire admin, security, devops, and AI routes:

```typescript
const AdminSubscriptions = React.lazy(() => import('@/pages/admin/subscriptions'));
const SecurityScanHistory = React.lazy(() => import('@/components/security/ScanHistory'));
const DevOpsDeploymentDashboard = React.lazy(() => import('@/components/devops/DeploymentDashboard'));
```

## Current Route-Level Lazy Loading

From `client/App.tsx`, routes are already lazy-loaded:

```typescript
const Landing = lazy(() => import('./pages/Landing'));
const Projects = lazy(() => import('./pages/Projects'));
const Navigator = lazy(() => import('./pages/Navigator'));
const SpatialWorld = lazy(() => import('./pages/SpatialWorld'));
// ... other routes
```

**Status:** ✅ Route-level lazy loading is already implemented

## Implementation Plan

### Step 1: Lazy-Load Chart Component

```typescript
// In files that use charts
const Chart = React.lazy(() => import('@/components/ui/chart'));

<Suspense fallback={<ChartSkeleton />}>
  <Chart ... />
</Suspense>
```

### Step 2: Lazy-Load Dialog Components

```typescript
// In files that use dialogs
const Dialog = React.lazy(() => import('@/components/ui/dialog'));
const AlertDialog = React.lazy(() => import('@/components/ui/alert-dialog'));

<Suspense fallback={<DialogSkeleton />}>
  <Dialog ... />
</Suspense>
```

### Step 3: Lazy-Load Heavy Route Components

The following routes are already lazy-loaded, but we can add more granular lazy loading for their internal components:

- Admin routes (subscriptions, audit-logs, users)
- Security components
- DevOps components
- AI components

## Skeleton Components

Create skeleton components for lazy-loaded items:

```typescript
// ChartSkeleton.tsx
export function ChartSkeleton() {
  return (
    <div className="aspect-video animate-pulse bg-muted rounded" />
  );
}

// DialogSkeleton.tsx
export function DialogSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="w-full max-w-md h-64 animate-pulse bg-muted rounded-lg" />
    </div>
  );
}
```

## Testing Checklist

- [ ] Test chart lazy loading on dashboard pages
- [ ] Test dialog lazy loading on admin pages
- [ ] Test skeleton components display correctly
- [ ] Verify no layout shift during lazy loading
- [ ] Test that components load on interaction
- [ ] Verify bundle size reduction
- [ ] Test that functionality still works

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Initial Bundle Size | ~2.4 MB | < 2.0 MB | 17% |
| Chart Bundle (Deferred) | Loaded immediately | On demand | 100% |
| Dialog Bundle (Deferred) | Loaded immediately | On demand | 100% |
| Initial Load Time | ~3s | < 2.5s | 17% |

## Status

**Overall Status:** ✅ Foundation Good

**Completed:** Identified heavy components (charts, dialogs, admin/security/devops components)
**In Progress:** Implementing lazy loading for chart and dialog components
**Next Steps:** Create skeleton components and implement lazy loading
