# FEEXSYSTEMS — Living Engineering Intelligence

<div align="center">

```
███████╗███████╗███████╗██╗  ██╗███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗███████╗
██╔════╝██╔════╝██╔════╝╚██╗██╔╝██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║██╔════╝
█████╗  █████╗  █████╗   ╚███╔╝ ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║███████╗
██╔══╝  ██╔══╝  ██╔══╝   ██╔██╗ ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║╚════██║
██║     ███████╗███████╗██╔╝ ██╗███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║███████║
╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚══════╝
```

**The Autonomous, Evidence-Backed Engineering Intelligence Platform and 3D World Model**

[![Production Status](https://img.shields.io/badge/Production-Live%20%26%20Operational-emerald?style=for-the-badge&logo=googlecloud)](https://feexsystems-prod-508304.web.app)
[![Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-Auto--Scaling-4285F4?style=for-the-badge&logo=googlecloud)](https://cloud.google.com/run)
[![Firebase Edge](https://img.shields.io/badge/Firebase_Hosting-Global_Edge_CDN-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![PostgreSQL & pgvector](https://img.shields.io/badge/Cloud_SQL-PostgreSQL_15_%2B_pgvector-336791?style=for-the-badge&logo=postgresql)](https://cloud.google.com/sql)
[![Redis TLS](https://img.shields.io/badge/Memorystore-Redis_TLS_%2B_BullMQ-DC382D?style=for-the-badge&logo=redis)](https://redis.io)
[![Gemini 2.5](https://img.shields.io/badge/AI_Director-Gemini_2.5_Flash_%2B_Live-8E75C2?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini)
[![Three.js WebGL](https://img.shields.io/badge/3D_Engine-Three.js_%26_WebGL-black?style=for-the-badge&logo=three.js)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

[**Live Experience**](https://feexsystems-prod-508304.web.app) • [**API Health**](https://feexsystems-server-1098867692790.us-central1.run.app/health) • [**Spatial Galaxy**](https://feexsystems-prod-508304.web.app/world) • [**Omni-Command Stage**](https://feexsystems-prod-508304.web.app/omni) • [**Evidence Fabric**](https://feexsystems-prod-508304.web.app/evidence)

---

</div>

## 1. Executive Overview

**FEEXSYSTEMS** (`feexsystems.codes`) is an enterprise-grade SaaS and cognitive engineering platform that transforms the FeexSystems GitHub ecosystem into a real-time, queryable, 3D Spatial World Model. 

Unlike traditional code search engines or static documentation sites, FEEXSYSTEMS treats codebases, infrastructure configurations, dependency topologies, and deployment artifacts as living, interconnected nodes in an evidence-anchored knowledge graph.

### The Mission
> *"Building digital worlds, one system at a time."*

FEEXSYSTEMS bridges the gap between human engineering intent and machine intelligence. Autonomous background workers continuously ingest and cryptographically verify ecosystem telemetry (commits, trees, releases, webhooks), synthesizing an authoritative World Model. Large Language Models (LLMs) act strictly as non-destructive reasoning directors and spatial navigators over this canonical truth—never hallucinating facts without provenance.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FEEXSYSTEMS COGNITIVE PIPELINE                         │
└──────────────────────────────────────────────────────────────────────────────────┘
    GitHub Ecosystem (Orgs, Repos, Commits, PRs, Tree Manifests)
                            │
                            ▼
    [Ingestion Worker] HMAC-SHA256 Webhook Verification & Discovery
                            │
                            ▼
    [Evidence Fabric] Cryptographic Commit SHAs, Line Ranges & Artifact URLs
                            │
                            ▼
    [World Model Graph] Entities: Projects ──(USES)──> Technologies
                                  Projects ──(CONTAINS)─> Artifacts
                            │
                            ▼
    [Hybrid Embeddings] 768-dim Vectors (pgvector) + Full-Text RRF Fusion
                            │
                            ▼
    [Omni-Command Stage] Streaming SSE Reasoning Trace + Web Speech STT
                            │
                            ▼
    [Spatial Galaxy (/world)] Three.js 3D WebGL Topological Knowledge Engine
```

---

## 2. Core Canonical Invariants

All architectural modules, background workers, and UI projections in FEEXSYSTEMS strictly obey the **Seven Canonical Invariants**:

| # | Invariant | Architectural Contract |
|---|---|---|
| **1** | **World Model is Authoritative** | The database-backed World Model is the canonical reality. Models (LLMs) interpret, reason, and summarize; they **never** invent or mutate canonical facts without provenance. |
| **2** | **Evidence Fabric Provenance** | Every claim, relationship, and technology node must be anchored in verifiable evidence (GitHub repo, branch, commit SHA, file path, artifact URL, or observation timestamp). |
| **3** | **Non-Blocking Infrastructure Initialization** | Database, Redis, and third-party API connections must never hang the HTTP dev server, Cloud Run boot lifecycle, or container readiness probes. Services attach lazily and retry in background. |
| **4** | **Provider-Neutral Intelligence** | AI model interactions leverage provider-agnostic abstractions (`aiService`), enabling transparent interchange between Google Gemini, OpenAI, and Anthropic models without breaking contract schemas. |
| **5** | **Browser as Projection** | The client browser is a read model/view projection. Server state is canonical. State cache syncs unidirectionally through SSE and REST endpoints. |
| **6** | **Dual Mode Routing** | Public routes (`/`, `/projects`, `/navigator`, `/world`, `/evidence`, `/omni`) are accessible to all users (both guests and authenticated). Only dedicated guest auth routes (`/login`, `/register`) redirect authenticated users. |
| **7** | **3D Spatial Meaning** | WebGL 3D scenes (`/world`) communicate topological graph distance, cluster density, and dependency relationships rather than serving as mere visual decoration. |

---

## 3. High-Level System Architecture

FEEXSYSTEMS implements a modern, resilient enterprise topology across Google Cloud Platform and Firebase:

```text
                                  ┌────────────────────────┐
                                  │      Public User       │
                                  └───────────┬────────────┘
                                              │ HTTPS (TLS 1.3)
                                              ▼
                             ┌──────────────────────────────────┐
                             │     Firebase Hosting (Edge)      │
                             │  Global CDN · HTTP/2 · SPA Cache  │
                             └────────────────┬─────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ Static Assets (/assets/*, HTML5)              │ Dynamic API (/api/**, /health)
                      ▼                                               ▼
        ┌───────────────────────────┐                   ┌───────────────────────────┐
        │     React 18 SPA Dist     │                   │   Google Cloud Run v2     │
        │  Vite · Three.js · Radix  │                   │  feexsystems-server:latest│
        └───────────────────────────┘                   └─────────────┬─────────────┘
                                                                      │
                ┌──────────────────────────────┬──────────────────────┴───────────────────────┐
                ▼                              ▼                                              ▼
  ┌───────────────────────────┐  ┌───────────────────────────┐                  ┌───────────────────────────┐
  │      Google Cloud SQL     │  │    Upstash Redis (TLS)    │                  │      Google Cloud AI      │
  │  PostgreSQL 15 + pgvector │  │   Bull Queues · Sessions  │                  │  Gemini 2.5 Flash / Live  │
  │   Private Service Connect │  │   Distributed Rate-Limit  │                  │  Embeddings & Multi-Turn  │
  └───────────────────────────┘  └───────────────────────────┘                  └───────────────────────────┘
                │                              │                                              │
                └──────────────────────────────┼──────────────────────────────────────────────┘
                                               │
                                               ▼
                                 ┌───────────────────────────┐
                                 │ Google Cloud Observability│
                                 │ BigQuery ML · GCS Artifact│
                                 │ Cloud Logging · Secret Mgr│
                                 └───────────────────────────┘
```

### Infrastructure Components
- **Client Presentation Tier**: Vite + React 18 + React Router 7 + TailwindCSS 3, deployed to **Firebase Hosting** with global edge CDN caching and atomic deployments.
- **Compute Tier**: Express 5 containerized runtime on **Google Cloud Run** (`us-central1`), configured with 2 vCPU, 2 GiB memory, concurrency 80, and `min-instances: 1` to eliminate cold-start latency.
- **Primary Data Store**: **Google Cloud SQL** (PostgreSQL 15) with `pgvector` extension for 768-dimensional vector similarity search, connected via Private Service Connect (PSC).
- **In-Memory Fabric**: Managed **Redis** with TLS encryption for Bull task queues, distributed session tokens, rate limiting, and real-time pub/sub.
- **Analytics & Big Data**: **Google BigQuery** dataset (`feexsystems_analytics`) with streaming ingestion for telemetry, audit logs, and graph density metrics.
- **Artifact Warehouse**: **Google Cloud Storage** (`feexsystems-evidence-artifacts`) with immutable object versioning for code manifests and evidence snapshots.
- **Secrets Governance**: **Google Cloud Secret Manager** mounted directly into Cloud Run runtime containers without disk persistence.

---

## 4. Key Subsystems & Capabilities

### 4.1 The World Model & Graph Topology
The World Model continuously indexes repositories in the FeexSystems ecosystem (e.g. *Persona OS*, *Yurrheeler AI*, *3WM Sonik*, *Rental Paradise*, *KappaXChangeFin*).
- **Node Classification**: Categorized into `PROJECT`, `REPOSITORY`, `ARTIFACT`, and `TECHNOLOGY`.
- **Edge Semantics**: Strongly-typed relations (`HAS_REPOSITORY`, `CONTAINS`, `USES`, `DEPENDS_ON`).
- **Graph Clustering**: Louvain community detection and force-directed algorithms compute coordinate clusters projected into 2D and 3D coordinate space.

### 4.2 The Evidence Fabric Ledger
The Evidence Fabric is an immutable audit log ensuring algorithmic honesty:
- **Traceable Identifiers**: Every fact is linked to a cryptographic SHA-1 or SHA-256 commit hash, repository identifier, branch name, relative file path, and start/end line offsets.
- **Webhook Ingestion**: Real-time GitHub events (`push`, `release`, `repository`) are verified using HMAC-SHA256 signatures before triggering graph delta updates.
- **Temporal Reconstruction**: Supports querying the exact state of any world, repository, or artifact as it existed at any historical commit SHA or timestamp (`/api/world-model/temporal/:projectId`).

### 4.3 Omni-Command Orchestration Stage
The `/omni` interface is an agentic, multi-modal command stage:
- **Orchestration Contract**: Natural language requests are translated by the Gemini AI Director into a strict, Zod-validated JSON Orchestration Contract.
- **Streaming Execution Trace**: Real-time reasoning steps are streamed via Server-Sent Events (SSE) to the browser, displaying reasoning tokens before UI state transitions.
- **Context-Aware Dynamic Stage**: Automatically mounts interactive components (Interactive CodeViewer, 3D Graph Focus, Evidence Audit Panel, Metrics Grids) based on the contract payload.
- **Speech Navigation**: Built-in voice input powered by the Web Speech API enables hands-free voice exploration of the entire World Model.

### 4.4 3D Spatial Knowledge Galaxy (`/world`)
An interactive, high-performance WebGL environment powered by Three.js and `@react-three/fiber`:
- **Spatial Topology**: Visualizes projects as central gravitational nodes with orbited technology satellites and artifact nodes.
- **Node Inspector**: Click-to-focus camera interpolation (using smooth spherical lerp) with contextual HUD inspection cards.
- **Particle Dynamics**: Real-time GPU particle fields responsive to user interaction, representing ecosystem activity.

### 4.5 Bushfeexer — Living Intelligence Assistant
A floating, ambient conversational interface accessible from every viewport:
- **Grounded Retrieval**: Directly queries `/api/world-model/navigator` to deliver fact-anchored answers with live evidence counts.
- **Graceful Fallback**: Intelligent local heuristic models handle offline or degraded network conditions without breaking UI responsiveness.

---

## 5. Production API Specification

All endpoints return uniform enterprise envelopes `{ success: boolean, data?: T, error?: string, timestamp: string }`:

### System Diagnostics & Health
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Deep liveness & dependency readiness probe (Cloud SQL, Redis, Uptime) | Public |
| `GET` | `/health/ready` | Quick Kubernetes/Cloud Run readiness probe | Public |
| `GET` | `/api/ping` | Ecosystem status, node timestamp, and active environment metadata | Public |

### World Model & Evidence Engine
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/world-model/projects` | List all synchronized World Model projects with technology badges | Public |
| `GET` | `/api/world-model/graph` | Fetch complete 2D/3D node and edge graph topology | Public |
| `GET` | `/api/world-model/evidence/:projectId` | Retrieve cryptographic Evidence Fabric ledger for a project | Public |
| `GET` | `/api/world-model/navigator?q=:query` | Grounded hybrid vector/graph retrieval with AI explanation | Public |
| `GET` | `/api/world-model/temporal/:projectId` | Reconstruct project state at a specific historical commit SHA | Public |
| `POST` | `/api/world-model/embeddings/reindex` | Trigger asynchronous pgvector embedding batch regeneration | Admin |
| `POST` | `/api/world-model/maintenance/run` | Execute autonomous graph reconciliation and orphan cleanup | Admin |

### Omni-Command Stage
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/world-model/omni-command` | Synchronous Orchestration Contract generation | Public |
| `POST` | `/api/world-model/omni-command/stream` | Streaming Server-Sent Events (SSE) reasoning trace | Public |

| `POST` | `/api/security/scan` | Initiate a static code or dependencies scan | Authenticated |
| `GET` | `/api/security/remediation/tickets` | Retrieve active vulnerability remediation tasks | Authenticated |
| `GET` | `/api/security/compliance/reports` | Fetch compliance status (SOC2, ISO27001, GDPR) | Authenticated |

### Ingestion & Webhooks
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/world-model/webhook` | GitHub webhook receiver with HMAC-SHA256 cryptographic verification | GitHub Webhook |
| `POST` | `/api/world-model/sync/github-pinned`| Trigger immediate ecosystem sync from pinned GitHub repositories | Authenticated |

---

## 6. Enterprise Security & Zero-Secrets Policy

FEEXSYSTEMS implements a rigorous zero-trust security architecture.

### Zero Hardcoded Secrets Invariant
- **No plaintext secrets** (API keys, private keys, database passwords, webhook tokens) are ever stored in source code, committed to Git, or baked into Docker container layers.
- Production credentials reside exclusively in **Google Cloud Secret Manager** and are resolved at runtime via environment bindings or Secret Manager APIs.
- `.gitignore` and `.dockerignore` are enforced at the repository root to block credentials, certificates (`*.pem`, `*.crt`, `*.key`), local environment files, and scratch artifacts.

### Security Architecture Highlights
1. **Private Service Connect (PSC)**: Cloud SQL PostgreSQL instances reside inside a private VPC network without public IP exposure.
2. **HMAC-SHA256 Webhook Verification**: Inbound GitHub webhooks calculate the HMAC signature against `GITHUB_WEBHOOK_SECRET` before processing the payload.
3. **Dual-Layer Authentication**: Stateless high-entropy JSON Web Tokens (JWT) signed with 256-bit keys for API access, paired with Firebase Admin SDK token verification for federated identities.
4. **Content Security Policy & Headers**: Production Express server applies strict Helmet policies (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
5. **Non-Root Container Execution**: Production Docker images execute under an unprivileged user (`feexuser:feexgroup`, UID 1001) utilizing `dumb-init` for POSIX signal propagation.

---

## 7. Repository Structure

```text
FeexSystems-Living-Intelligence-World/
├── client/                          # React 18 SPA Frontend (TanStack Query for State)
├── client/                          # React 18 SPA Frontend
│   ├── components/                  # UI Components & Design System
│   │   ├── omni/                    # Omni-Command Stage & Command Bar
│   │   ├── security/                # Security Dashboard, Remediation, & Analytics
│   │   ├── webgl/                   # Three.js 3D WebGL scenes & Particle Fields
│   │   ├── ui/                      # Radix UI + Tailwind component library
│   │   └── Bushfeexer.tsx           # Living Intelligence Assistant
│   ├── hooks/                       # React hooks (useSpeechNavigation, useAuth)
│   ├── lib/                         # Client utilities & Firebase client adapter
│   ├── pages/                       # Application Routes
│   │   ├── Index.tsx                # SaaS Hero & Living World Showcase
│   │   ├── Projects.tsx             # Public Project Explorer
│   │   ├── Navigator.tsx            # Grounded Navigator & Evidence Inspector
│   │   ├── SpatialWorld.tsx         # Full-Screen 3D Knowledge Galaxy
│   │   ├── EvidenceLedger.tsx       # Cryptographic Proof Explorer
│   │   └── OmniStage.tsx            # Multi-Modal Command Stage
│   ├── App.tsx                      # React Router 7 configuration
│   └── global.css                   # Design tokens & Tailwind theme
├── server/                          # Express 5 Backend Runtime
│   ├── lib/                         # Backend Core Services
│   │   ├── database.ts              # Resilient Prisma + non-blocking connection pool
│   │   ├── middleware/              # Production security, rate-limiting & auth
│   │   └── services/                # World Model, AI Director, BigQuery, GCS
│   ├── routes/                      # API Route Controllers
│   │   ├── world-model.ts           # World Model, Navigator, Graph & Omni routes
│   │   ├── auth.ts                  # Authentication & session verification
│   │   ├── devops.ts                # Build & deployment pipeline endpoints
│   │   └── security.ts              # Audit logging & vulnerability scanning
│   ├── test/                        # Testing Infrastructure & Mocks
│   │   ├── prisma-mock.ts           # Prismock memory database & Firebase auth bypass
│   │   └── helpers/                 # Test factories and utility wrappers
│   ├── node-build.ts                # Production SSR/Static bundle server
│   └── index.ts                     # Main Express server entrypoint
├── shared/                          # Universal TypeScript contracts & schemas
│   ├── world-model.ts               # World Model entities, nodes & edge types
│   ├── omni-schema.ts               # Zod Orchestration Contract validation
│   └── api.ts                       # Shared API response interfaces
├── prisma/                          # Prisma ORM Schema & Migrations
│   └── schema.prisma                # PostgreSQL models + pgvector definitions
├── pipelines/                       # Data Engineering & Orchestration
│   └── airflow/                     # Cloud Composer / Apache Airflow DAGs
├── scripts/                         # Enterprise DevOps & Deployment Scripts
│   ├── deploy-cloud-run.ps1         # Automated Cloud Run deploy (PowerShell)
│   ├── deploy-cloud-run.sh          # Automated Cloud Run deploy (Bash)
│   ├── setup-gcp-secrets.ps1        # GCP Secret Manager setup (PowerShell)
│   └── setup-gcp-secrets.sh         # GCP Secret Manager setup (Bash)
├── docs/                            # Deep Technical Documentation
│   ├── DEPLOYMENT_GUIDE.md          # Cloud Run & Firebase deployment runbook
│   ├── brand-assets/screenshots/    # System showcase visual captures
│   └── specs/                       # Architecture & feature specifications
├── Dockerfile                       # Multi-stage production container build
├── firebase.json                    # Firebase Hosting & Cloud Run rewrite rules
├── cloudbuild.yaml                  # Google Cloud Build automated CI/CD pipeline
└── package.json                     # Monorepo dependencies and scripts
```

---

## 8. Local Development Quickstart

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: `npm` (v10+)
- **Database**: PostgreSQL 15+ (with `pgvector` extension)
- **Cache**: Redis 7+

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World.git
cd FeexSystems-Living-Intelligence-World
npm install
```

### 2. Configure Environment Variables
Copy the development template and configure your local credentials:
```bash
cp .env.example .env
```

Key environment configurations:
```ini
NODE_ENV="development"
PORT=8080
DATABASE_URL="postgresql://feexsystems:localpassword@localhost:5432/feexsystems_dev?schema=public"
REDIS_URL="redis://localhost:6379"
GEMINI_API_KEY="your-gemini-api-key"
GITHUB_ACCESS_TOKEN="ghp_your-personal-access-token"
GITHUB_WEBHOOK_SECRET="your-local-webhook-secret"
USE_MOCK_AUTH="true"
```

### 3. Initialize the Database
```bash
# Generate Prisma client bindings
npx prisma generate

# Apply migrations to local PostgreSQL
npm run db:init
```

### 4. Launch Development Server
```bash
npm run dev
```
The integrated Vite dev server and Express API will be accessible at:
- **Local Application**: `http://localhost:8080`
- **Health Diagnostic**: `http://localhost:8080/health`
- **3D Spatial Galaxy**: `http://localhost:8080/world`

### 5. Running Quality & Test Suites
```bash
# TypeScript strict typechecking
npm run typecheck

# Vitest unit and integration suite (Powered by Prismock)
npm test

# Production build validation
npm run build
```

#### Note on Test Infrastructure
The project uses **Prismock** and **Firebase Admin Mocking** to run the complete integration test suite in-memory. This allows testing authenticated API endpoints (like those in `/api/security` and `/api/users`) without requiring a live PostgreSQL instance or connecting to Firebase Auth in CI.

---

## 9. Production Deployment Runbook

### Continuous Deployment via Google Cloud Build
Pushing to `main` triggers `cloudbuild.yaml`:
1. Installs dependencies and compiles Prisma client.
2. Executes strict TypeScript verification (`npm run typecheck`) and Vitest test suite.
3. Builds container image with Kaniko caching (`gcr.io/$PROJECT_ID/feexsystems-server:$COMMIT_SHA`).
4. Deploys container to **Google Cloud Run** with Secret Manager bindings.

### Manual One-Click Deployment

#### Deploy Backend to Google Cloud Run:
```powershell
# Windows PowerShell
.\scripts\deploy-cloud-run.ps1 -ProjectId "feexsystems-prod-508304" -Region "us-central1"
```
```bash
# Linux / macOS
./scripts\deploy-cloud-run.sh feexsystems-prod-508304 us-central1
```

#### Deploy Frontend to Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting
```

---

## 10. Visual Experience Showcase

<div align="center">

| 3D Spatial Knowledge Galaxy | AI Grounded Navigator |
|:---:|:---:|
| ![Spatial World](docs/brand-assets/screenshots/world-screenshot.webp) | ![Navigator](docs/brand-assets/screenshots/navigator-screenshot.webp) |
| *Topological graph clustering and node inspector* | *Evidence-grounded semantic retrieval* |

| Living Project Explorer | Multi-Modal Showcase |
|:---:|:---:|
| ![Project Explorer](docs/brand-assets/screenshots/projects-screenshot.webp) | ![Showcase Carousel](docs/brand-assets/screenshots/showcase-carousel-slider.webp) |
| *Real-time GitHub sync & evidence ledger* | *Dynamic multimedia artifact cards* |

</div>

---

## 11. Maintenance & Operations

- **Autonomous Maintenance Cron**: Executes periodically or on boot to crawl pinned GitHub repositories, re-embed updated files with Gemini, and prune orphan nodes.
- **Airflow Orchestration**: Managed Service for Apache Airflow (`pipelines/airflow/feex_world_model_crawl_dag.py`) triggers scheduled full-ecosystem reconciliation every 6 hours.
- **BigQuery Event Streaming**: All user interactions, search queries, and navigation events stream to BigQuery table `world_model_events` for real-time analytics.

---

## 12. License & Intellectual Property

Proprietary software owned by **FeexSystems**. All rights reserved.

- **Product**: FEEXSYSTEMS — Living Engineering Intelligence
- **Public Experience**: [feexsystems.codes](https://feexsystems.codes) / [feexsystems-prod-508304.web.app](https://feexsystems-prod-508304.web.app)
- **Organization**: FeexSystems
- **Engineering Contact**: `engineering@feexsystems.codes`
