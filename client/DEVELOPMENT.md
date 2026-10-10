# FeexSystems Frontend — Development Guide

> Last updated: 2026-10-09

## Quick Start

```bash
npm install
npm run dev        # Vite + Express dev server on http://localhost:8080
npm run storybook  # Component library on http://localhost:6006
```

## Project Layout

```
client/
├── components/
│   ├── ui/          # Primitive components (Button, Input, Dialog …)
│   ├── sovereign/   # Sovereign /world runtime (R3F canvas)
│   ├── galaxy/      # 3D galaxy primitives & types
│   └── navigation/  # FullWidthNav, AppleDock, Breadcrumbs
├── hooks/           # Custom React hooks (useOnlineStatus, …)
├── lib/             # Utilities (cn, performance-monitor, announcements)
├── pages/           # Route page components
├── landing/         # Cinematic landing scenes
├── world-model/     # PLANETARY_ECOSYSTEMS registry & types
├── src/
│   └── main.tsx     # App entrypoint (Sentry init, axe-core dev audit)
└── global.css       # TailwindCSS 3 design tokens & utilities
```

## Component Creation Workflow

### 1. Create the component

Place new UI primitives in `client/components/ui/`. Use the CVA + `cn` pattern:

```tsx
// client/components/ui/my-component.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const myVariants = cva("base-classes", {
  variants: { variant: { default: "…" } },
  defaultVariants: { variant: "default" },
});

export interface MyComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof myVariants> {}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(myVariants({ variant, className }))} {...props} />
  ),
);
MyComponent.displayName = "MyComponent";

export { MyComponent };
```

### 2. Write a story

Create `client/components/ui/my-component.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./my-component";

const meta: Meta<typeof MyComponent> = {
  title: "UI/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MyComponent>;
export const Default: Story = { args: {} };
```

### 3. Write unit + interaction tests

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "@/components/ui/my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent>Hello</MyComponent>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

## Styling Conventions

| Rule | Example |
|------|---------|
| Use design tokens from `global.css` | `text-foreground`, `bg-background`, `border-input` |
| Glassmorphism via utility | `.glass` class, `backdrop-blur-xl bg-white/20` |
| Focus rings | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| Reduced motion | Always pair JS animations with `@media (prefers-reduced-motion: reduce)` |
| Dark-first | All components designed for dark backgrounds; light surface opt-in |

All client imports use the `@/` → `client/` alias:

```tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

## Testing

```bash
npm run test          # Vitest (unit + integration)
npm run test:a11y     # Accessibility suite
npm run test:e2e      # Playwright E2E (requires dev server)
npm run storybook     # Visual + interaction tests via Storybook Vitest
```

Coverage targets: **80%+** on UI components. A11y mode is set to `error` in Storybook — violations fail CI.

## Linting & TypeScript

```bash
npm run lint          # ESLint 9 flat config (0 errors required for CI)
npm run lint:fix      # Auto-fix safe issues
npm run typecheck     # tsc --noEmit (must be clean)
```

## PR Requirements

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` — all tests green
- [ ] New component has a `.stories.tsx` + unit/interaction test
- [ ] No new `any` casts without a `// eslint-disable` comment

## Common Gotchas

| Problem | Fix |
|---------|-----|
| `window is not defined` in Vitest | Guard with `if (typeof window !== "undefined")` |
| Shadow JS artifacts override TS | Run `npm run check:shadows`; delete stray `.js` files |
| `onFID` import error | Removed from `web-vitals@6` — use `onINP` |
| Sentry fires in dev | `Sentry.init` is gated by `import.meta.env.PROD` |
| Stale React Query cache | Call `queryClient.invalidateQueries(...)` to force refresh |
