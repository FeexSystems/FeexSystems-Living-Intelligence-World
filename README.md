# FEEXSYSTEMS  Living Engineering Intelligence

**An evidence-backed World Model that turns a living software ecosystem into an explorable intelligent world.**

[![Production Status](https://img.shields.io/badge/Production-Live%20%26%20Operational-emerald?style=for-the-badge&logo=googlecloud)](https://feexsystems-prod-508304.web.app)  
[![Firebase](https://img.shields.io/badge/Firebase-Cloud_Functions_%2B_Hosting-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)  
[![PostgreSQL%20%2B%20pgvector](https://img.shields.io/badge/Cloud_SQL-PostgreSQL%20%2B%20pgvector-336791?style=for-the-badge&logo=postgresql)](https://cloud.google.com/sql)  
[![Three.js](https://img.shields.io/badge/3D-Three.js%20%2B%20WebGL-black?style=for-the-badge&logo=three.js)](https://threejs.org)  
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

**[Live Experience](https://feexsystems-prod-508304.web.app)** Â· **[Spatial World](https://feexsystems-prod-508304.web.app/world)** Â· **[Navigator](https://feexsystems-prod-508304.web.app/navigator)** Â· **[Omni-Command](https://feexsystems-prod-508304.web.app/omni)** Â· **[Evidence Fabric](https://feexsystems-prod-508304.web.app/evidence)** Â· **[API Health](https://feexsystems-prod-508304.web.app/health)**

## What Is FEEXSYSTEMS?

**FEEXSYSTEMS** is a living engineering intelligence system. It continuously transforms software-development evidence into a structured **World Model** that humans and AI systems can explore, query, inspect, and reason over.

The platform treats repositories, artifacts, technologies, relationships, commits, deployments, and temporal state as connected system entities rather than isolated documents.

It is deliberately **not**:

*   a conventional code-search interface;
*   a static portfolio;
*   an LLM wrapper around a document store;
*   a documentation generator;
*   a decorative 3D visualization.

It is an **evidence-backed engineering intelligence substrate** with a spatial interface.

> **The LLM interprets the World Model. It does not become the World Model.**

Canonical reality lives in structured, evidence-backed system state. Models reason over that state; they do not silently replace it.

## Enter the World

### The Spatial World

[![FEEXSYSTEMS Spatial World](docs/brand-assets/screenshots/world-screenshot.webp)](https://feexsystems-prod-508304.web.app/world)

**Explore the engineering graph as a spatial system.**

Projects, technologies, artifacts, and relationships are projected into a Three.js/WebGL environment where spatial position carries graph meaning.

**[Open Spatial World â†’](https://feexsystems-prod-508304.web.app/world)**

### The Navigator

[![FEEXSYSTEMS Navigator](docs/brand-assets/screenshots/navigator-screenshot.webp)](https://feexsystems-prod-508304.web.app/navigator)

**Ask questions against grounded system state.**

Navigator combines World Model retrieval, evidence provenance, graph relationships, and model-backed reasoning rather than treating the LLM as the source of truth.

**[Open Navigator â†’](https://feexsystems-prod-508304.web.app/navigator)**

## From Repository to Intelligence

FEEXSYSTEMS follows a traceable chain from engineering evidence to machine-assisted understanding:

The important boundary is intentional:

## The World Model

The World Model is the canonical system representation behind the public experience.

### Canonical entities

*   **Projects** â€” coherent system-level products and worlds.
*   **Repositories** â€” source-control boundaries and GitHub evidence sources.
*   **Artifacts** â€” files, manifests, specifications, deployments, and other discoverable system objects.
*   **Technologies** â€” frameworks, runtimes, infrastructure, databases, AI providers, and tooling.
*   **Relationships** â€” typed connections such as `HAS_REPOSITORY`, `CONTAINS`, `USES`, and `DEPENDS_ON`.
*   **Evidence** â€” repository, branch, commit SHA, path, line range, artifact URL, and observation time.
*   **Temporal state** â€” reconstructable system state associated with commits and timestamps.

The World Model is therefore more than a graph visualization: it is the structured reality over which retrieval, explanation, navigation, and reasoning operate.

## The Intelligence Stack

### 1\. World Model

The canonical representation of the FeexSystems ecosystem. Structured entities and typed relationships provide the foundation for all downstream intelligence.

### 2\. Evidence Fabric

A provenance layer connecting claims and relationships to verifiable engineering evidence such as GitHub repositories, commits, paths, line ranges, artifact URLs, and observation timestamps.

### 3\. Navigator

The grounded retrieval and explanation layer. It combines semantic retrieval and graph-aware context so answers can be traced back to the system state that supports them.

### 4\. Omni-Command

A multi-modal command surface for orchestrating World Model interactions. The production architecture uses validated orchestration contracts and streaming SSE execution traces.

### 5\. Spatial World

A Three.js/WebGL projection of graph topology. Spatial relationships communicate system structure rather than serving as decoration.

### 6\. Living Intelligence

Ambient model-backed assistance that operates over the World Model and can degrade gracefully when remote intelligence is unavailable.

## The Living Ecosystem

FEEXSYSTEMS is designed to represent an ecosystem of connected system worlds, including:

| World / System | Role |
| --- | --- |
| **FEEX World OS** | Sovereign engineering intelligence World Model (Planetary Core) |
| **VYRA Labs** | Creator monetization, FanDNA behavioral profiling, and social identity |
| **3WM DSP SONIK** | Procedural audio synthesizer and spatial sound engine |
| **YURRHEELER MED-NET** | Multi-agent healthcare intelligence and tele-diagnostic mesh |
| **FARMPLUG AI** | Voice crop guidance, soil sensor fusion, and market intelligence |
| **FIREHOUSE GRILLS** | Precision thermal control and industrial kitchen IoT mesh |
| **FEEXKEEAUTH SECURITY** | Hardware root of trust and zero-trust cryptographic mesh |
| **KAPPAXCHANGEFIN** | Automated liquidity mesh and decentralized order routing |
| **RENTALL SMARTS HOMES** | Decentralized property management and energy-grid automation |

The repositoryâ€™s World Model is intended to expose these 9 canonical systems as connected evidence-backed entities rather than a flat portfolio list.

![FEEXSYSTEMS Project Explorer](docs/brand-assets/screenshots/projects-screenshot.webp)

## Evidence & Trust

FEEXSYSTEMS is built around an evidence-first engineering model.

### Evidence principles

*   **Repository-grounded** â€” system facts originate from identifiable source material.
*   **Commit-aware** â€” evidence can be anchored to Git commit state.
*   **Path-aware** â€” claims can point toward concrete files and artifacts.
*   **Temporal** â€” system state can be reasoned about across historical observations.
*   **Inspectable** â€” the platform exposes provenance rather than hiding it behind a generated answer.

The Evidence Fabric is the trust boundary between canonical system state and model-backed interpretation.

## Seven Canonical Invariants

The platformâ€™s architecture is governed by seven invariants:

| # | Invariant | Contract |
| --- | --- | --- |
| **1** | **World Model is Authoritative** | The database-backed World Model is canonical. Models interpret and summarize; they do not silently invent canonical facts. |
| **2** | **Evidence Fabric Provenance** | Claims and relationships are anchored to verifiable evidence. |
| **3** | **Non-Blocking Infrastructure Initialization** | Database, Redis, and third-party connections must not block server boot or readiness. |
| **4** | **Provider-Neutral Intelligence** | AI interactions use provider-agnostic service abstractions so model providers can change without breaking application contracts. |
| **5** | **Browser as Projection** | The browser is a read projection; canonical state lives server-side and synchronizes through API/SSE boundaries. |
| **6** | **Dual Mode Routing** | Public experience routes remain accessible to guests; authentication routes handle identity-specific flows. |
| **7** | **3D Spatial Meaning** | Spatial rendering communicates topology, clustering, and relationships rather than existing only for visual effect. |

## System Architecture

The production topology currently centers on Firebase (Hosting + Cloud Functions), Cloud SQL/PostgreSQL, Redis, model services, and Google Cloud observability.

### Production components

*   **Presentation:** React 18, Vite, React Router, TailwindCSS, Radix UI, Three.js.
    
*   **Compute:** Express 5 running as a Firebase Cloud Function (`api`).
    
*   **Data:** PostgreSQL 15 with pgvector on Cloud SQL.
    
*   **In-memory services:** Redis/TLS for queues, sessions, rate limiting, and pub/sub.
    
*   **AI:** Provider-neutral application abstractions with the production Gemini integration described by the current runtime.
    
*   **Billing:** Paystack integration for subscription plans, rate limit upgrades, and webhooks.
    
*   **Analytics:** BigQuery event and telemetry pipelines.
    
*   **Artifacts:** Google Cloud Storage for evidence and artifact snapshots.
    
*   **Secrets:** Google Cloud Secret Manager.
    
*   **Observability:** Google Cloud logging and operational telemetry.
    

## Security & Trust Model

Security is treated as part of the World Model boundary rather than a separate afterthought.

### Source â†’ Verify â†’ Store â†’ Trace â†’ Reason

1. Source â€” identify the originating repository, event, artifact, or runtime observation.
2. Verify â€” validate webhook signatures and other source-integrity controls.
3. Store â€” persist canonical state and evidence in controlled infrastructure.
4. Trace â€” retain provenance identifiers and temporal context.
5. Reason â€” allow model-backed services to interpret retrieved state without replacing it.

### Current security controls documented by the repository

*   No plaintext production secrets committed to source.
    
*   Production credentials managed through Google Cloud Secret Manager.
    
*   GitHub webhooks verified using HMAC-SHA256.
    
*   Private database connectivity is used in the documented production architecture.
    
*   JWT/Firebase identity controls are part of the API security layer.
    
*   Helmet-based security headers are applied by the production Express server.
    
*   Production containers run as an unprivileged user.
    

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite, React Router, TailwindCSS, Radix UI |
| **Spatial** | Three.js, WebGL, @react-three/fiber |
| **Backend** | Node.js, Express 5, TypeScript |
| **Data** | PostgreSQL 15, Prisma, pgvector |
| **Retrieval** | Vector similarity + full-text / graph-aware retrieval |
| **AI** | Provider-neutral AI service abstraction; Gemini integration in current production architecture |
| **Queues / Cache** | Redis, BullMQ |
| **Cloud** | Firebase (Hosting + Cloud Functions `api` + Data Connect), Cloud SQL, Cloud Storage, BigQuery, Secret Manager |
| **Edge** | Firebase Hosting |
| **CI/CD** | GitHub Actions (`test.yml`, `deploy.yml` â†’ Firebase) |
| **Testing** | Vitest, Prisma/Firebase test doubles as documented by the repository |
| **Automation** | Airflow / scheduled reconciliation pipelines |

## Repository Architecture

> **Documentation rule:** as FEEXSYSTEMS evolves toward autonomous ingestion and World Model maintenance, the repository tree and architecture docs should be generated or periodically verified against the source tree. Stale documentation conflicts directly with the systemâ€™s evidence-first doctrine.

## Developer Quickstart

### Prerequisites

*   Node.js 20.x or 22.x LTS
*   npm 10+
*   PostgreSQL 15+ with pgvector
*   Redis 7+

### Install

```bash
git clone https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World.git
cd FeexSystems-Living-Intelligence-World
npm install
```

### Configure

```bash
cp .env.example .env
```

Configure the environment for local development. The exact variable names and integrations should be taken from the repositoryâ€™s current `.env.example` and deployment configuration rather than copied from this document as secrets.

### Initialize

```bash
npx prisma generate
npm run db:init
```

### Run

```bash
npm run dev
```

Expected local experience:

*   Application: `http://localhost:8080`
*   Health: `http://localhost:8080/health`
*   Spatial World: `http://localhost:8080/world`

### Validate

```bash
npm run typecheck
npm test
npm run build
```

## API Surface

The public README intentionally exposes the architectural API surface without duplicating the entire backend contract.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Deep service/dependency health |
| `GET` | `/api/world-model/projects` | World Model project inventory |
| `GET` | `/api/world-model/graph` | Graph topology |
| `GET` | `/api/world-model/navigator?q=:query` | Grounded Navigator retrieval |
| `GET` | `/api/world-model/evidence/:projectId` | Evidence retrieval |
| `GET` | `/api/world-model/temporal/:projectId` | Historical state reconstruction |
| `POST` | `/api/world-model/omni-command` | Orchestration contract |
| `POST` | `/api/world-model/omni-command/stream` | SSE execution stream |
| `POST` | `/api/world-model/webhook` | GitHub webhook ingestion |

For the complete route contract, inspect the server route definitions and shared schemas in the repository.

## Production Deployment

The deployment target is **Firebase** (not Cloud Run): Firebase Hosting serves the SPA (`dist/spa`), the  
Express `api` runs as a Cloud Function, and Data Connect handles SQL. See  
[`docs/FIREBASE_DEPLOYMENT.md`](docs/FIREBASE_DEPLOYMENT.md) for the full runbook.

The documented deployment path is:

### Automated (CI)

Pushes to `main` deploy automatically through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)  
using keyless GCP auth (Workload Identity Federation). Add required reviewers to the `production` GitHub  
Environment for a manual approval gate.

> **First-time setup (one-time):** arm the CI path by following  
> **[`docs/CI-DEPLOYMENT-SETUP.md`](docs/CI-DEPLOYMENT-SETUP.md)** â€” it provisions Workload Identity  
> Federation, the three required GitHub secrets (`GCP_PROJECT_ID`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`),  
> and the runtime secrets in GCP Secret Manager. Until those exist, pushes build and test but skip the deploy.

### Manual (local CLI)

```bash
npm run deploy:firebase        # macOS / Linux / WSL
# Windows:
powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1
```

Production changes should be verified through health probes, browser smoke tests, and the live public routes before being considered complete.

## Operations & Living Synchronization

FEEXSYSTEMS is designed to remain synchronized with its source ecosystem.

Documented operational capabilities include:

*   GitHub webhook ingestion and verification.
*   Scheduled repository reconciliation.
*   Incremental World Model updates.
*   Embedding regeneration.
*   Orphan cleanup and graph maintenance.
*   BigQuery event telemetry.
*   Evidence artifact storage.
*   Temporal World Model reconstruction.

The long-term architecture extends this into continuous change detection, dependency-impact propagation, autonomous World Model maintenance, and event-driven intelligence.

## Cinematic Landing Experience

FEEXSYSTEMS now features a seven-scene cinematic landing page that transforms the public experience into an explorable engineering intelligence narrative.

[![FEEXSYSTEMS Cinematic Landing](docs/brand-assets/screenshots/landing-hero-scene.webp)](https://feexsystems-prod-508304.web.app)

**The Living SaaS Experience**

Scroll through seven carefully crafted cinematic scenes that demonstrate the World Model’s evidence-backed intelligence:

1. Hero — The opening scene that establishes FEEXSYSTEMS as an evidence-first engineering platform
2. Galaxy — The 3D spatial knowledge galaxy where projects, technologies, and relationships are projected
3. Core Systems — Live AI Core Mission Services showcase with grounded answers and interactive recommendations
4. Worlds — The 9 canonical systems projected as interconnected nodes in the spatial graph
5. Mission Capabilities — Detailed breakdown of evidence-backed feature implementations
6. Convergence — The point where product, research, audience, and market signals merge
7. UI Loops — The reactive, state-driven interface that keeps intelligence current

**[Open Cinematic Landing →](https://feexsystems-prod-508304.web.app)**

### AI Core Mission Services Showcase

[![AI Core Mission Services](docs/brand-assets/screenshots/landing-core-systems-scene.webp)](https://feexsystems-prod-508304.web.app)

**Grounded Intelligence in Action**

The Core Systems Scene displays live AI Core Mission Services from the Marketing Navigator API:

*   **Semantic Claim Search** — Vector-based retrieval across the Evidence Fabric
*   **Provider-Neutral LLM Abstraction** — Model-agnostic reasoning without breaking World Model contracts
*   **Graph-Enhanced Recommendations** — Relationship-first data with full evidence provenance
*   **Grounded Answer Generation** — LLM-interpreted prose with deterministic template fallback
*   **Evidence Fabric Ledger** — Cryptographic commit SHAs and full provenance tracking

Click any recommendation to navigate to the related cinematic scene (Worlds for project-based content, Hero for general intelligence flows).

### Cinematic Technical Details

```typescript
// The landing uses React Router 7 with seven-scene composition
import { HeroScene } from "./scenes/HeroScene";
import { GalaxySequenceScene } from "./scenes/GalaxySequenceScene";
import { CoreSystemsScene } from "./scenes/CoreSystemsScene"; // New: AI Core Mission Services
import { WorldsScene } from "./scenes/WorldsScene";
import { MissionCapabilityScene } from "./scenes/MissionCapabilityScene";
import { ConvergenceScene } from "./scenes/ConvergenceScene";
import { UILoopsScene } from "./scenes/UILoopsScene";
```

*   **Snappy Scroll Navigation** — `snap-y snap-mandatory` with `ScrollRestoration`
*   **IntersectionObserver** — Tracks active scene with 25%, 50%, 75% thresholds
*   **Scene Controller** — Fixed navigation rail with scene progress and index
*   **CinematicScene Wrapper** — Video background with parallax content overlay
*   **Asset Preloader** — Warm cinematic assets without blocking first paint

## Visual Showcase

| World Model | Navigator |
| :---: | :---: |
| ![Spatial World](docs/brand-assets/screenshots/world-screenshot.webp) | ![Navigator](docs/brand-assets/screenshots/navigator-screenshot.webp) |

| Project Explorer | Workflow |
| :---: | :---: |
| ![Projects](docs/brand-assets/screenshots/projects-screenshot.webp) | ![Workflow](docs/brand-assets/screenshots/home-workflow-screenshot.webp) |

| Telemetry | Showcase |
| :---: | :---: |
| ![Telemetry](docs/brand-assets/screenshots/home-telemetry-screenshot.webp) | ![Showcase](docs/brand-assets/screenshots/showcase-carousel-slider.webp) |

More visual assets are maintained under `docs/brand-assets/screenshots/`.

## Documentation

The repository contains deeper material for architecture, deployment, specifications, and brand systems.

Recommended documentation hierarchy:

This target hierarchy is the documentation architecture for the next documentation-hardening pass; the current repository may still contain the legacy `docs/brand-assets/` structure.

## Brand System

The repositoryâ€™s canonical brand specification defines FEEXSYSTEMS as an architectural, evidence-oriented, graph-based and living visual system.

Core identity principles:

*   **Architectural, not decorative**
*   **Graph, not list**
*   **Evidence, not claims**
*   **Living substrate**

The canonical brand library defines the master mark, spatial visual language, telemetry components, child-world identity matrix, and FEEXSYSTEMS lexicon.

See: [Brand Assets Library](docs/brand-assets/FEEXSYSTEMS_Brand_Assets_Library.md)

## Engineering Doctrine

### Canonical Truth

The World Model is the system of record for machine-readable ecosystem state.

### Evidence Before Inference

Generated explanations should be grounded in retrieved evidence and identifiable system state.

### Models Are Interpreters

LLMs are reasoning components, not substitutes for the underlying World Model.

### Spatial UI Has Semantics

The 3D interface communicates topology, density, relationship, and focus.

### Living Systems Require Temporal Awareness

A current system state is not the only state that matters. Commits, events, observations, and mutations form a history.

### Documentation Is Part of the System

A living engineering intelligence platform must keep its public documentation synchronized with the reality it claims to model.

## License & Intellectual Property

**Proprietary software owned by FeexSystems. All rights reserved.**

*   **Product:** FEEXSYSTEMS â€” Living Engineering Intelligence
    
*   **Public Experience:** [feexsystems.codes](https://feexsystems.codes) / [production experience](https://feexsystems-prod-508304.web.app)
    
*   **Organization:** FeexSystems
    

**FEEXSYSTEMS**

*Living Engineering Intelligence*

**Repository â†’ Evidence â†’ World Model â†’ Intelligence**