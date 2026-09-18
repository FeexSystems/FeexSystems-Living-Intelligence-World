# FEEXSYSTEMS — Living Engineering Intelligence

**FeexSystems.codes** is the public SaaS experience for FEEXSYSTEMS: an evidence-backed engineering intelligence platform that turns the FeexSystems GitHub ecosystem into an explorable World Model.

## Tech Stack

- **Frontend**: React 18 + React Router 7 + TypeScript + Vite + TailwindCSS 3 + Three.js (@react-three/fiber & @react-three/drei) + Lucide Icons + Radix UI
- **Backend**: Express 5 server integrated with Vite dev server
- **Database**: PostgreSQL 15+ via Prisma ORM
- **Cache**: Redis (ioredis) + Bull queue
- **Testing**: Vitest + Playwright E2E + MSW
- **Intelligence**: Provider-neutral model adapters (`aiService`) + Evidence Fabric grounded retrieval + pgvector semantic retrieval

## Architecture & Canonical Principles

1. **Canonical Data + Model Reasoning**: The database-backed World Model is authoritative; models interpret, reason, and summarize. Models do not invent or mutate canonical facts without evidence.
2. **Graph, Not List**: Relationships (`PROJECT ── HAS_REPOSITORY ──> REPOSITORY`, `REPOSITORY ── CONTAINS ──> ARTIFACT`, `PROJECT ── USES ──> TECHNOLOGY`) are first-class data entities.
3. **Evidence, Not Claims**: Facts must have traceable implementation evidence (GitHub repo, branch, commit SHA, file path, artifact, observation timestamp).
4. **Provider-Neutral Intelligence**: Model reasoning layers must use provider-agnostic abstractions so underlying models can interchange without breaking World Model contracts.
5. **Spatial Meaning**: The 3D interface (`/world`) communicates engineering topology and relationships rather than acting as mere decoration.
6. **Browser as Projection**: The browser is a read model/view projection. Server state is canonical.
7. **Dual Mode Routing**: Public routes (`/`, `/projects`, `/navigator`, `/world`) are accessible to all users (both guests and authenticated users). Only guest auth routes (`/login`, `/register`) redirect authenticated users.
8. **Non-Blocking Infrastructure Initialization**: Database and external service connections must never hang the HTTP dev server or readiness checks.
9. **WebGL & Scrollytelling 60 FPS Safeguards**: Always clamp WebGL canvas pixel ratios with `dpr={[1, 2]}` to protect high-DPI displays from thermal throttling. Register raw GLSL transform plugins in both `vite.config.ts` and `vitest.config.ts`. Telemetry streams must implement resilient procedural fallback loops.

## Project Structure

```text
FeexSystems-Living-Intelligence-World/
├── client/                  # React SPA frontend & 3D Spatial World
│   ├── pages/               # Route components (Index, Projects, Navigator, SpatialWorld, dashboard, admin)
│   ├── components/webgl/    # 3D scenes (NeuralNetwork, ParticleField, WaveBackground, ImmersiveHeroBackground)
│   ├── components/ui/       # Radix + Tailwind component library
│   ├── App.tsx              # React Router 7 SPA routing & error boundary setup
│   └── global.css           # TailwindCSS 3 theming & design tokens
├── server/                  # Express API backend & World Model services
│   ├── index.ts             # Express server setup, health checks & route wiring
│   ├── routes/              # Route controllers (world-model, auth, ai, devops, security, etc.)
│   └── lib/services/        # World Model synchronization, AI service, database & redis clients
├── shared/                  # Shared TypeScript types & API contracts
├── prisma/                  # Prisma schema (SaaS models + World Model entities)
├── docs/                    # Architecture, World Model, Evidence Fabric & Ingestion documentation
├── docker/                  # Docker & Compose configurations
└── .agents/                 # Antigravity agent rules and operational skills
```

## Key Routes & Endpoints

### Public Experience
- `/` — Living SaaS landing experience with interactive WebGL background
- `/projects` — Public project explorer with GitHub sync action
- `/navigator` — AI-grounded Navigator interface with evidence provenance
- `/world` — Full-screen 3D Spatial Knowledge Galaxy with node inspector
- `/evidence` — Evidence Fabric Ledger with cryptographic commit SHAs
- `/omni` — Agent-driven Omni-Command Stage with live reasoning trace

### Authenticated Experience
- `/dashboard` — Platform overview & operations
- `/dashboard/ai-services` — AI model orchestration
- `/dashboard/devops` — Pipelines & deployments
- `/dashboard/security` — Security scans & audit logs
- `/admin/*` — Admin panel & user management

### API Routes
- `GET /health` — Basic liveness & health check
- `GET /health/ready` — Readiness check
- `GET /api/ping` — Ecosystem status & timestamp
- `GET /api/world-model/projects` — Synchronized World Model projects
- `GET /api/world-model/graph` — 3D/2D node & edge graph topology
- `GET /api/world-model/evidence/:projectId` — Evidence provenance ledger
- `GET /api/world-model/navigator?q=<query>` — Grounded retrieval with AI explanation
- `POST /api/world-model/omni-command` — Omni-Command orchestration contract
- `POST /api/world-model/omni-command/stream` — Omni-Command streaming SSE trace
- `GET /api/world-model/telemetry/stream` — Canonical `WorldModelEvent` SSE telemetry stream for the Sovereign Engine HUD (falls back to clearly-labeled procedural feed client-side)
- `POST /api/world-model/sync/github-pinned` — Trigger GitHub profile sync
- `POST /api/world-model/webhook` — GitHub webhook receiver with HMAC SHA-256 verification

## Development Commands

```bash
npm run dev        # Start dev server (Vite + Express on port 8080)
npm run build      # Build client (dist/spa) and server (dist/server)
npm run start      # Start production server
npm test           # Run Vitest test suite
npm run typecheck  # TypeScript validation
npm run db:init    # Initialize database
npm run db:migrate # Run Prisma migrations
```
