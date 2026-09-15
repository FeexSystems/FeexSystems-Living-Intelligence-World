# Project Structure

FEEXSYSTEMS is organized by responsibility rather than historical task numbers or one-off experiments.

```text
FeexSystems-Living-Intelligence-World/
├── client/        # React/Vite public and authenticated application
│   ├── components/omni/       # Omni Stage, command bar, visualizers
│   ├── components/security/   # Security Dashboard, Remediation, & Analytics
│   ├── pages/OmniCommand.tsx
│   └── stores/omniStore.ts
├── server/        # API, World Model, ingestion and intelligence services
│   ├── routes/omni-command.ts
│   ├── routes/security.ts
│   ├── lib/services/omni-command.service.ts
│   └── test/prisma-mock.ts    # Prismock in-memory database and auth bypass
├── shared/        # Shared types and contracts (orchestration + Zod schemas)
├── prisma/        # Database schema and migrations
├── docs/          # Canonical product, architecture and operations documentation
├── scripts/       # Maintained operational scripts only
├── docker/        # Container and local infrastructure configuration
├── .github/       # CI/CD and repository automation
├── public/        # Required product assets
├── package.json   # Canonical package scripts and dependencies
└── README.md      # Product and architecture entry point
```

## Hygiene rules

- No loose verification scripts in the repository root.
- No task-numbered historical scripts or reports.
- No generated artifacts committed unless required by the product.
- No vendor deployment files unless the deployment is actively used.
- Tests belong in the maintained test suites or the relevant package.
- Documentation belongs in `docs/`.
- Operational scripts belong in `scripts/` and must have an active consumer.
- Configuration files must correspond to an active toolchain.

## Canonical product flow

```text
GitHub Organization
  → Repository Discovery
  → Persistent World Model
  → Evidence Fabric
  → Incremental Ingestion
  → Project Explorer
  → Navigator / Omni-Command Stage
```
