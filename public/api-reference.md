# FeexSystems World Model API
The Express API is the programmatic interface to the canonical World Model and Evidence Fabric. Base URL is the same origin as the web application unless your deployment configures an API subdomain. JSON endpoints use `application/json`; streaming endpoints use Server-Sent Events.

## OpenAPI
- Interactive Swagger UI: `/api/docs` (available in development; production requires `ENABLE_DOCS=true`).
- Raw OpenAPI JSON: `/api/docs/spec.json` (same availability policy).
- [Detailed API quick reference](https://feexsystems.codes/docs/API_QUICK_REFERENCE.md).

## Public World Model endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/world-model/projects` | Read synchronized project records. |
| GET | `/api/world-model/graph` | Read graph nodes, edges, and topology. |
| GET | `/api/world-model/evidence/{projectId}` | Read project evidence provenance. |
| GET | `/api/world-model/navigator?q={query}` | Grounded retrieval over the World Model. |
| GET | `/api/world-model/telemetry/stream` | Receive canonical WorldModelEvent telemetry via SSE. |
| POST | `/api/world-model/omni-command` | Submit an Omni-Command orchestration request. |
| POST | `/api/world-model/omni-command/stream` | Receive an orchestration reasoning trace via SSE. |

Some routes are rate-limited; mutation and synchronization operations may require authentication. Consult the live OpenAPI schema for request/response details and deployment-specific availability. Do not assume model output is canonical: database-backed facts and their evidence provenance remain authoritative.
