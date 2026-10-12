# Contributing to FEEXSYSTEMS

Thank you for your interest in contributing to the **FEEXSYSTEMS Living Intelligence Platform**. This guide
covers repository-wide setup, standards, and the pull-request process. For frontend-specific conventions inside
`client/`, see [`client/CONTRIBUTING.md`](client/CONTRIBUTING.md).

> **This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md).** By participating, you are expected to
> uphold it. Please report unacceptable behavior to the maintainers listed there.

## Guiding Principles

Every contribution should respect the platform's canonical principles (see [`AGENTS.md`](AGENTS.md) and
[`docs/`](docs/)):

1. **Evidence, not claims.** Facts must be traceable to a repo, commit SHA, file path, artifact, or timestamp.
2. **Canonical data + model reasoning.** The database-backed World Model is authoritative; models interpret it —
   they never silently invent or mutate canonical facts.
3. **Graph, not list.** Relationships are first-class entities, not documentation.
4. **Provider-neutral intelligence.** Reasoning layers use provider-agnostic abstractions so models can swap
   without breaking contracts.
5. **Server state is canonical.** The browser is a read model / view projection.

## Getting Started

### Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL 15+** with the `pgvector` extension
- **Redis** (for the Bull queue and session cache)

Docker is the fastest path for the data layer: `npm run docker:dev`.

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Copy the template and fill in the values you need for local development.
cp .env.example .env

# 3. Initialize and seed the database
npm run db:init
npm run db:seed

# 4. Validate your setup (checks required env vars and connectivity)
npm run validate

# 5. Start the dev server (Vite + Express on http://localhost:8080)
npm run dev
```

> Infrastructure (Postgres, Redis) connections are initialized **non-blockingly** — the HTTP dev server and
> readiness checks will start even before external services are reachable.

## Development Workflow

### Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite + Express dev server on port `8080` |
| `npm run build` | Build client (`dist/spa`) and server (`dist/server`) |
| `npm run typecheck` | TypeScript validation (`tsc`) — must be clean |
| `npm test` | Run the Vitest unit/integration suite |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run lint` | ESLint (errors block CI) |
| `npm run format.fix` | Prettier auto-format |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

### Project Layout

```text
client/     # React SPA, 3D Spatial World, UI component library
server/     # Express API, World Model services, AI service adapters
shared/     # Shared TypeScript types & API contracts
prisma/     # Prisma schema (SaaS models + World Model entities)
docs/       # Architecture, World Model, Evidence Fabric & Ingestion docs
```

### Code Standards

- **TypeScript everywhere.** Keep `npm run typecheck` clean; do not loosen compiler flags to force a change through.
- **Respect the boundaries.** `server/*` never imports from `client/` and vice versa; shared contracts live in
  `shared/`. Use the `@/`, `@shared/`, and `@server/` path aliases (kept in sync across `tsconfig.json`,
  `vite.config.ts`, and `vitest.config.ts`).
- **Evidence-first.** Any change touching World Model data must preserve traceable provenance (commit SHAs, file
  paths, observation timestamps). Do not introduce hardcoded "facts" where canonical state should flow from the
  database.
- **Performance.** Clamp WebGL pixel ratios with `dpr={[1, 2]}`; telemetry streams must have resilient
  procedural fallbacks. See the 60 FPS safeguards in [`AGENTS.md`](AGENTS.md).
- **Tests.** Add or update tests for behavioral changes. Colocate unit tests; put E2E specs in `e2e/`.
- **Secrets.** Never commit secrets. Add any new variable to `.env.example` with a placeholder.

## Pull Request Process

1. **Branch** from `main` using a descriptive name (e.g., `feat/world-model-sync`, `fix/navigator-retrieval`).
2. **Keep PRs focused** — one logical change per PR makes review faster and safer.
3. **Run the checks locally** before opening:

   ```bash
   npm run typecheck   # must be clean (0 errors)
   npm test            # must pass
   npm run lint        # no new errors
   ```

4. **Describe your change** in the PR: what it does, why, and how it was verified. Link any related issue.
5. **Evidence for World Model changes** — if your change affects canonical data or retrieval, note the
   provenance implications and any migration steps.
6. **CI must pass.** The pipeline runs lint, typecheck, unit, integration, and e2e jobs. Please address review
   feedback promptly.

## Reporting Issues & Security

- **Bugs / features:** open an issue with reproduction steps and, where relevant, the commit SHA or endpoint.
- **Security vulnerabilities:** do **not** open a public issue. Follow the private disclosure process in
  [`SECURITY.md`](SECURITY.md).

## License & Contribution Ownership

FEEXSYSTEMS is **proprietary software**. See the [`LICENSE`](LICENSE) file for the full terms — in short, no
permission is granted to use, copy, modify, or distribute the Software except by an explicit written agreement
signed by FeexSystems.

By submitting a contribution (a pull request, patch, or other material) to this repository, you agree that:

- Your contribution is **licensed to FeexSystems** on a perpetual, worldwide, royalty-free, non-exclusive basis,
  allowing it to be incorporated into the proprietary codebase and its derivatives.
- You retain copyright to your own work, but you grant FeexSystems the right to use, modify, relicense, and
  distribute your contribution as part of the Software.
- You confirm that you have the right to grant these terms (i.e., the contribution is your original work and
  does not infringe third-party rights).

If these terms are a concern, please raise it with the maintainers **before** submitting your pull request.

Thanks again for helping build the FEEXSYSTEMS World Model. 🙌

