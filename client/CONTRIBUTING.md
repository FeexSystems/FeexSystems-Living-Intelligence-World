# Contributing to the FeexSystems Frontend

Guidelines for working inside `client/`. Read this before opening a PR.

## Path Aliases

The alias is configured **identically in three places** — keep them in sync if you ever add one:

| Alias | Target | Configured in |
|-------|--------|---------------|
| `@/*` | `./client/*` | `tsconfig.json` (`paths`), `vite.config.ts` (`resolve.alias`), `vitest.config.ts` (`resolve.alias`) |
| `@shared/*` | `./shared/*` | same three files |
| `@server/*` | `./server/*` | `vitest.config.ts` only (test-time) |

### Rules

```typescript
// ✅ Always use the @/ alias for client imports
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

// ✅ Shared API contracts live in shared/
import type { OmniCommandResponse } from '@shared/orchestration';

// ✅ Relative imports are fine only within the same folder
import { SceneCard } from './SceneCard';

// ❌ Never write deep relative paths crossing folder boundaries
import { Button } from '../../../components/ui/button';
```

- **No deep relative imports** — anything reaching outside the current directory must use `@/`.
- **No absolute filesystem or `src/` prefixed imports** — the entry point is `client/src/main.tsx`, but app code lives at `client/*` and resolves via `@/`.
- Server code (`server/*`) never imports from `client/` and vice versa; shared contracts belong in `shared/`.

## Styling Conventions

- TailwindCSS utility classes first; design tokens and glassmorphism/HUD classes come from `client/global.css` and the partials it imports (`client/styles/*.css`).
- Do **not** add new `@import`s directly to partials — add them to `client/global.css` in dependency order (base tokens → components → utilities).
- Prefer the existing `cn()` helper (`@/lib/utils`) for conditional class merging.

## Testing Conventions

- Unit/integration tests: colocated or under `client/test/`, run with `npm test` (Vitest + jsdom + MSW).
- E2E tests: root `e2e/*.spec.ts`, run with `npm run test:e2e` (Playwright).
- Use the templates in `client/test/templates/` when adding a new component test.

## Before You Open a PR

```bash
npm run typecheck   # must be clean (0 errors)
npm test            # must pass
npm run lint        # when ESLint lands (Phase 4, Task 62)
```

See `docs/FRONTEND_ARCHITECTURE.md` for the full architecture and
`docs/FRONTEND_MODERNIZATION_PLAN.md` for the active improvement roadmap.
