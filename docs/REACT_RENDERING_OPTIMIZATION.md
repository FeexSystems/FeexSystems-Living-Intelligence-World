# React Rendering Optimization

**Task Reference:** Phase 3, Sprint 11, Task 44

**Last Updated:** 2026-10-07

## Overview

This document identifies React rendering optimization opportunities using memo, useMemo, and useCallback.

## Current State

### Existing Optimizations

The codebase already has some React optimizations in place:

1. **React.lazy** - Route-level code splitting (Task 43)
2. **useMemo** - Used in some components for expensive computations
3. **React.Suspense** - Used for lazy-loaded routes

### Areas for Improvement

### 1. SpatialWorld Page

**File:** `client/pages/SpatialWorld.tsx`

**Current Usage:**
- Uses `useMemo` for DPR calculation
- Uses `useCallback` for event handlers
- Could benefit from memo for child components

**Recommendations:**
- Memoize GalaxyScene if props don't change frequently
- Memoize SovereignHUD if props are stable
- Use React.memo for list items in node inspector

### 2. WebGL Components

**Files:**
- `client/components/webgl/ProjectMini3DCard.tsx`
- `client/components/webgl/DreiProjectsHero.tsx`
- `client/components/webgl/DreiNavigatorHero.tsx`

**Current Usage:**
- No explicit memoization
- WebGL rendering is expensive

**Recommendations:**
- Wrap components in React.memo
- Use useMemo for geometry calculations
- Use useCallback for event handlers

### 3. Dashboard Components

**Files:**
- `client/pages/dashboard/settings.tsx`
- `client/pages/dashboard/devops.tsx`
- `client/components/devops/DeploymentDashboard.tsx`
- `client/components/devops/PipelineList.tsx`

**Current Usage:**
- No explicit memoization
- Lists may cause unnecessary re-renders

**Recommendations:**
- Use React.memo for list items
- Use useMemo for computed values
- Use useCallback for event handlers
- Consider virtualization for long lists (@tanstack/react-virtual)

### 4. Security Components

**Files:**
- `client/components/security/ScanHistory.tsx`
- `client/components/security/VulnerabilityDashboard.tsx`
- `client/components/security/RemediationTracking.tsx`

**Current Usage:**
- No explicit memoization
- Tables may cause unnecessary re-renders

**Recommendations:**
- Use React.memo for table rows
- Use useMemo for filtered/sorted data
- Use useCallback for action handlers

### 5. Admin Components

**Files:**
- `client/pages/admin/subscriptions.tsx`
- `client/pages/admin/audit-logs.tsx`
- `client/pages/admin/users.tsx`

**Current Usage:**
- No explicit memoization
- Tables and lists may cause unnecessary re-renders

**Recommendations:**
- Use React.memo for table rows
- Use useMemo for filtered/sorted data
- Use useCallback for action handlers

## Implementation Guidelines

### When to Use React.memo

Use React.memo for:
- Components that render the same output with the same props
- List items that re-render frequently
- Components with expensive render logic
- WebGL/3D components

```typescript
export const GalaxyNode = React.memo(({ node, onClick }) => {
  // Component logic
});
```

### When to Use useMemo

Use useMemo for:
- Expensive calculations
- Derived data from props/state
- Objects/arrays passed as props to memoized components
- WebGL geometry calculations

```typescript
const filteredNodes = useMemo(() => {
  return nodes.filter(node => node.visible);
}, [nodes]);
```

### When to Use useCallback

Use useCallback for:
- Event handlers passed to memoized child components
- Functions used in useEffect dependencies
- Functions passed as props to memoized components

```typescript
const handleNodeClick = useCallback((nodeId) => {
  onNodeClick(nodeId);
}, [onNodeClick]);
```

## Virtualization

For long lists, consider using @tanstack/react-virtual:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

## Testing Checklist

- [ ] Test React.memo prevents unnecessary re-renders
- [ ] Test useMemo caches expensive calculations
- [ ] Test useCallback maintains function identity
- [ ] Test virtualization for long lists
- [ ] Verify no performance regressions
- [ ] Use React DevTools Profiler to measure improvements

## Expected Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Re-renders (Dashboard) | Variable | Reduced by 30% | 30% |
| Re-renders (Lists) | Variable | Reduced by 50% | 50% |
| Interaction Response | Variable | < 100ms | Consistent |
| Frame Rate (3D) | Variable | Stable 60 FPS | Stable |

## Status

**Overall Status:** ⚠️ Recommendations Documented

**Completed:** Identified components that need optimization
**In Progress:** Implementing memo, useMemo, useCallback
**Next Steps:** Apply optimizations to identified components
