# UI Component Inventory

> **Generated:** 2026-10-07 (Sprint 2, Task 5 of [FRONTEND_MODERNIZATION_PLAN.md](../../docs/FRONTEND_MODERNIZATION_PLAN.md))
> **Source of truth:** `node scripts/analyze-ui-components.mjs` → `.temp/ui-analysis.json`
> Regenerate after adding/removing components: `node scripts/analyze-ui-components.mjs`

## Summary

| Metric | Value |
|--------|-------|
| Total components | **49** (all in `client/components/ui/*.tsx`) |
| Radix-based (built-in keyboard/ARIA semantics) | 32 |
| Interactive / static / native | 36 interactive · 13 static |
| With unit tests | **0 / 49** ⚠️ |
| With explicit ARIA attributes in source | 7 (form, breadcrumb, pagination, sidebar, navigation-menu, carousel, alert) |
| Used in ≥1 app file | 32 · **17 currently unused** |
| Largest | sidebar (770 LOC), chart (364), carousel (261) |

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Reasonable a11y baseline (score ≥ 4), in active use |
| ⚠️ | Needs tests (applies to everything until Sprint 14) |
| ❌ | Needs a11y work: interactive with source score ≤ 2 |

*A11y score (0–10) is a static heuristic: +3 Radix, +2 explicit ARIA, +1 each for
roles, keyboard handlers, focus handlers, labels, ref forwarding, +1 if static.
Raw data: `.temp/ui-analysis.json`.*

## Inventory — Used Components (sorted by usage)

| Component | LOC | Type | Key dependencies | Main exports | Used by (files) | A11y | Tests | Status |
|-----------|-----|------|------------------|--------------|-----------------|------|-------|--------|
| button | 58 | Radix slot | cva, radix:slot | Button, ButtonProps, buttonVariants | **63** | 4 | 0 | ⚠️ |
| card | 87 | static | react | Card, CardHeader, CardTitle… (7) | **52** | 2 | 0 | ⚠️ |
| badge | 37 | static | cva | Badge, BadgeProps, badgeVariants | **46** | 1 | 0 | ⚠️ |
| input | 23 | native | react | Input | **31** | **1** | 0 | ❌ |
| progress | 25 | Radix | radix:progress | Progress | 21 | 4 | 0 | ⚠️ |
| select | 159 | Radix | radix:select | Select, SelectTrigger, SelectItem… (10) | 18 | 4 | 0 | ⚠️ |
| tabs | 52 | Radix | radix:tabs | Tabs, TabsList, TabsTrigger, TabsContent | 17 | 4 | 0 | ⚠️ |
| label | 25 | Radix | radix:label, cva | Label | 15 | 4 | 0 | ⚠️ |
| dialog | 121 | Radix | radix:dialog | Dialog, DialogContent, DialogTitle… (10) | 13 | 5 | 0 | ⚠️ |
| dropdown-menu | 199 | Radix | radix:dropdown-menu | DropdownMenu, Item, Trigger… (15) | 12 | 4 | 0 | ⚠️ |
| separator | 29 | Radix | radix:separator | Separator | 9 | 4 | 0 | ⚠️ |
| alert | 60 | static | cva | Alert, AlertTitle, AlertDescription | 6 | 4 | 0 | ⚠️ |
| scroll-area | 45 | Radix | radix:scroll-area | ScrollArea, ScrollBar | 6 | 4 | 0 | ⚠️ |
| textarea | 23 | native | react | Textarea, TextareaProps | 6 | **1** | 0 | ❌ |
| avatar | 49 | Radix | radix:avatar | Avatar, AvatarImage, AvatarFallback | 5 | 4 | 0 | ⚠️ |
| checkbox | 28 | Radix | radix:checkbox | Checkbox | 4 | 4 | 0 | ⚠️ |
| form | 178 | Radix | radix:label, react-hook-form | FormField, FormLabel, FormMessage… (8) | 4 | **7** | 0 | ⚠️ |
| switch | 27 | Radix | radix:switch | Switch | 4 | 4 | 0 | ⚠️ |
| table | 118 | static | react | Table, TableHeader, TableRow… (9) | 4 | 2 | 0 | ⚠️ |
| popover | 30 | Radix | radix:popover | Popover, PopoverTrigger, PopoverContent | 3 | 4 | 0 | ⚠️ |
| tooltip | 29 | Radix | radix:tooltip | Tooltip, TooltipTrigger, TooltipContent | 3 | 4 | 0 | ⚠️ |

## Inventory — Currently Unused Components (usedBy = 0)

These ship in the bundle graph only if imported; candidates for Storybook docs
(Sprint 13) or removal review (Sprint 15) before they rot.

| Component | LOC | Type | Key dependencies | Main exports | A11y | Status |
|-----------|-----|------|------------------|--------------|------|--------|
| accordion | 57 | Radix | radix:accordion | Accordion, AccordionItem, Trigger, Content | 4 | ⚠️ |
| aspect-ratio | 6 | Radix | radix:aspect-ratio | AspectRatio | 3 | ⚠️ |
| carousel | 261 | static | embla-carousel-react | Carousel, Content, Item, Previous, Next | 6 | ⚠️ |
| chart | 364 | static | recharts | ChartContainer, ChartTooltip, ChartLegend… | 2 | ⚠️ |
| collapsible | 10 | Radix | radix:collapsible | Collapsible, Trigger, Content | 3 | ⚠️ |
| command | 154 | Radix | radix:dialog, cmdk | Command, CommandInput, CommandItem… (9) | 4 | ⚠️ |
| context-menu | 199 | Radix | radix:context-menu | ContextMenu + 15 parts | 4 | ⚠️ |
| drawer | 117 | static | vaul | Drawer + 11 parts | 2 | ⚠️ |
| hover-card | 28 | Radix | radix:hover-card | HoverCard, Trigger, Content | 4 | ⚠️ |
| input-otp | 70 | static | input-otp | InputOTP, Group, Slot, Separator | 4 | ⚠️ |
| menubar | 235 | Radix | radix:menubar | Menubar + 16 parts | 4 | ⚠️ |
| navigation-menu | 129 | Radix | radix:navigation-menu | NavigationMenu + 8 parts | 7 | ⚠️ |
| pagination | 118 | native | react | Pagination, Content, Link, Next, Previous | 5 | ⚠️ |
| radio-group | 43 | Radix | radix:radio-group | RadioGroup, RadioGroupItem | 4 | ⚠️ |
| resizable | 44 | static | react-resizable-panels | ResizablePanelGroup, Panel, Handle | 1 | ⚠️ |
| sidebar | 770 | Radix | radix:slot, cva | Sidebar + 21 parts, useSidebar | 7 | ⚠️ |
| toggle-group | 60 | Radix | radix:toggle-group, cva | ToggleGroup, ToggleGroupItem | 4 | ⚠️ |

> Note: `command` shows 0 usage while a command palette exists — the launcher
> (CommandLauncher / sovereign runtime) implements its own UI. Verify during
> Sprint 15 whether `command.tsx` is dead code or a missed adoption.

## Key Findings

1. **Test coverage: 0/49.** No file in `client/test/` imports any
   `components/ui/*` module. Sprint 14 (Tasks 53–56) closes this, starting with
   the top-10 most-used components in [docs/COMPONENT_PRIORITY.md](../../docs/COMPONENT_PRIORITY.md).
2. **Only 7 components carry explicit ARIA.** The 32 Radix wrappers inherit
   solid semantics from their primitives; the risk concentrates in **native
   components** (`input`, `textarea`, `ErrorBoundary`, `calendar`) where the
   source does nothing beyond rendering elements — see
   [ACCESSIBILITY_REPORT.md](./ACCESSIBILITY_REPORT.md).
3. **`form.tsx` is the a11y role-model** (score 7): `aria-describedby` +
   `aria-invalid` wiring for errors. Its pattern must propagate to bare
   `input`/`textarea` usage (Sprint 15, Task 58/59).
4. **17 unused components** — document in Storybook before they drift, or
   schedule removal review.
5. **`sidebar` (770 LOC)** is the largest surface and ships with zero tests;
   it is also unused — prioritize a decision (adopt, document, or remove).

## Maintenance

```bash
node scripts/analyze-ui-components.mjs   # regenerate .temp/ui-analysis.json
```

When adding a component: drop the `.tsx` in this folder, re-run the analyzer,
and add a row here with status ⚠️ (needs tests) until Sprint 14 coverage lands.

| calendar | 65 | static | react-day-picker | Calendar, CalendarProps | 2 | **1** | 0 | ❌ |
| skeleton | 19 | static | react | Skeleton | 2 | 1 | 0 | ⚠️ |
| toast | 128 | Radix | radix:toast, cva | ToastProvider, Toast, ToastTitle… (8) | 2 | 4 | 0 | ⚠️ |
| alert-dialog | 140 | Radix | radix:alert-dialog | AlertDialog, Action, Cancel… (11) | 1 | 4 | 0 | ⚠️ |
| breadcrumb | 116 | Radix | radix:slot | Breadcrumb, BreadcrumbLink… (7) | 1 | **8** | 0 | ⚠️ |
| ErrorBoundary | 175 | native | react | ErrorBoundary, SectionErrorBoundary | 1 | **0** | 0 | ❌ |
| sheet | 139 | Radix | radix:dialog, cva | Sheet, SheetContent, SheetTrigger… (11) | 1 | 5 | 0 | ⚠️ |
| slider | 25 | Radix | radix:slider | Slider | 1 | 4 | 0 | ⚠️ |
| sonner | 30 | static | sonner, next-themes | Toaster | 1 | 1 | 0 | ⚠️ |
| toaster | 34 | static | react | Toaster | 1 | 1 | 0 | ⚠️ |
| toggle | 44 | Radix | radix:toggle, cva | Toggle, toggleVariants | 1 | 4 | 0 | ⚠️ |
