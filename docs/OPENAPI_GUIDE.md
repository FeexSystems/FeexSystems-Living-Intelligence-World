# FeexSystems API - OpenAPI 3.0 Specification Guide

## Overview

This directory contains the complete OpenAPI 3.0 specification for the **FeexSystems Living Intelligence World** API.

- **YAML Version**: `openapi.3.0.yaml` (recommended, human-readable)
- **JSON Version**: `openapi.3.0.json` (for tooling)

## What is OpenAPI?

OpenAPI 3.0 (formerly Swagger) is a standardized format for describing REST APIs. It enables:
- **Automatic documentation** in Swagger UI and Redoc
- **Client generation** in multiple languages
- **API testing** and validation
- **Contract testing** and compliance
- **IDE integration** (autocomplete, type hints)

## Key Features of This Specification

### 1. **Comprehensive Endpoint Coverage**

All FeexSystems routes are documented:

- ✅ **Health & Status**: `/health`, `/health/ready`, `/health/live`, `/api/ping`
- ✅ **Authentication**: Firebase JWT, session tokens, mock auth
- ✅ **World Model**: Projects, graph, evidence, navigator, temporal reconstruction
- ✅ **Omni-Command**: Orchestration with streaming SSE support
- ✅ **Users**: Profile, avatar, activity logs
- ✅ **Billing**: Calculations, history, estimates
- ✅ **Admin**: Metrics, user analytics, security, audit logs
- ✅ **Marketing**: Telemetry ingestion, event analytics
- ✅ **Webhooks**: GitHub webhook receiver with HMAC verification

### 2. **Authentication Schemes**

Four authentication methods are documented:

```yaml
firebaseJwt:
  type: http
  scheme: bearer
  bearerFormat: JWT
  description: Firebase JWT token in Authorization header

sessionToken:
  type: apiKey
  in: header
  name: X-Session-Token

apiKey:
  type: apiKey
  in: header
  name: X-API-Key

mockAuth:
  type: apiKey
  in: header
  name: X-Mock-User
  description: For development (USE_MOCK_AUTH=true)
```

### 3. **Global Headers**

Request/response headers for tracking and rate limiting:

```yaml
X-Request-ID: Unique request identifier (UUID)
X-RateLimit-Limit: Rate limit ceiling
X-RateLimit-Remaining: Requests remaining
X-RateLimit-Reset: Unix timestamp of reset
```

### 4. **Rate Limiting Tiers**

Different endpoints have different rate limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 | 15 min |
| Auth endpoints | 10 | 15 min |
| Password reset | 3 | 1 hour |
| AI services | 10 | 1 min (per user) |
| Omni-Command | 5 | 15 min |
| Hard query limits | 5 | 15 min |

### 5. **Error Response Schema**

Standardized error responses with context:

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_FAILED",
    "message": "Invalid request parameters",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-09-14T12:00:00Z",
    "requestId": "req_12345",
    "details": { /* additional context */ }
  }
}
```

### 6. **Core Response Formats**

#### Success Response

```json
{
  "success": true,
  "data": { /* endpoint-specific */ },
  "metadata": { /* pagination, timing */ },
  "timestamp": "2026-09-14T12:00:00Z"
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Using the Specification

### 1. **Swagger UI (Interactive Documentation)**

Run Swagger UI locally:

```bash
# Using Docker
docker run -p 80:8080 \
  -e SWAGGER_JSON=/openapi.3.0.yaml \
  -v $(pwd)/docs:/specs \
  swaggerapi/swagger-ui

# Then visit: http://localhost:80/?url=/specs/openapi.3.0.yaml
```

Or use the online editor:
```
https://editor.swagger.io
# Then File > Import URL > point to your openapi.3.0.yaml
```

### 2. **Redoc (Beautiful Documentation)**

```bash
docker run -p 8000:8080 \
  -e SPEC_URL=https://raw.githubusercontent.com/your-repo/docs/openapi.3.0.yaml \
  redocly/redoc

# Then visit: http://localhost:8000
```

### 3. **Generate API Clients**

Using OpenAPI Generator:

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g typescript-fetch \
  -o generated/typescript-client

# Generate Python client
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g python \
  -o generated/python-client

# Generate Go client
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g go \
  -o generated/go-client
```

### 4. **IDE Integration**

#### VS Code
Install the OpenAPI extension:
```
ext install Arjun.swagger-viewer
```

Then right-click the YAML file and select "Preview OpenAPI".

#### JetBrains IDEs (IntelliJ, PyCharm, etc.)
- Built-in OpenAPI support
- Open `openapi.3.0.yaml` and click the preview icon
- Provides code completion and validation

### 5. **Validate Specification**

Using Spectacle or Swagger CLI:

```bash
# Validate YAML format
swagger-cli validate docs/openapi.3.0.yaml

# Convert to JSON
swagger-cli bundle docs/openapi.3.0.yaml --outfile docs/openapi.3.0.json --type json
```

## API Architecture Overview

### Public Endpoints (No Auth Required)

- GET `/health`, `/health/ready`, `/health/live`
- GET `/api/ping`
- GET `/api/world-model/projects`
- GET `/api/world-model/graph`
- GET `/api/world-model/evidence/*`
- GET `/api/world-model/navigator`
- POST `/api/marketing/telemetry/events` (public ingestion)
- POST `/api/world-model/webhook` (GitHub webhooks with HMAC)

### Authenticated Endpoints

Require Firebase JWT Bearer token:

```bash
curl -H "Authorization: Bearer <firebase_jwt>" \
  https://api.feexsystems.codes/api/auth/me
```

- GET `/api/auth/me`
- GET `/api/users/profile`
- GET `/api/billing/calculate`
- etc.

### Admin-Only Endpoints

Require `ADMIN` or `SUPER_ADMIN` role:

- GET `/api/admin/metrics`
- GET `/api/admin/users`
- GET `/api/admin/audit-logs`
- POST `/api/admin/system/maintenance` (SUPER_ADMIN only)

### Rate-Limited Endpoints

Obey specific rate limits and return headers:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1694702400
```

When limit exceeded:

```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

## World Model Endpoints - Special Features

### 1. **Evidence Ledger**

Every project has a traceable evidence chain:

```
GET /api/world-model/evidence/{projectId}
```

Returns:
- Repository URL and commit SHA
- File artifacts with paths
- Technologies detected
- Observation timestamps

### 2. **Temporal Reconstruction**

Query project state at a specific time:

```
GET /api/world-model/temporal/{projectId}?at=2026-09-14T00:00:00Z
GET /api/world-model/temporal/{projectId}?commit=abc123def456
```

### 3. **Navigator (Grounded Retrieval)**

AI-powered exploration with evidence:

```
GET /api/world-model/navigator?q=authentication+systems
POST /api/world-model/navigator (with multi-turn history)
```

Combines:
- Keyword search (BM25)
- Semantic search (pgvector)
- AI reasoning (Gemini/OpenAI/Claude)

### 4. **Omni-Command with Streaming**

Real-time command execution:

```
POST /api/world-model/omni-command/stream
```

Server-Sent Events response:

```
event: trace
data: {"step": 1, "action": "query_world_model"}

event: trace
data: {"step": 2, "action": "analyze_technologies"}

event: result
data: {"status": "success", "outcome": {...}}
```

## Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_TOKEN` | 401 | No token provided |
| `INVALID_TOKEN` | 401 | Token format invalid |
| `TOKEN_EXPIRED` | 401 | JWT expired |
| `AUTHENTICATION_REQUIRED` | 401 | Must be authenticated |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |
| `VALIDATION_FAILED` | 400 | Request body/params invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_FOUND_ERROR` | 404 | Resource doesn't exist |
| `CONFLICT_ERROR` | 409 | Resource conflict |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service down/maintenance |

## Development vs. Production

### Development (localhost:3001)

- Mock auth enabled: Set `USE_MOCK_AUTH=true`
- Use header: `X-Mock-User: user-123`
- No HTTPS required
- Firebase optional

### Production (api.feexsystems.codes)

- Firebase JWT required
- HTTPS enforced
- Sentry error tracking
- Production security headers
- CloudRun/Google Cloud Load Balancer

## Examples

### 1. Authenticate & Get Profile

```bash
# Get Firebase token (from frontend)
FIREBASE_TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9..."

# Get profile
curl -X GET https://api.feexsystems.codes/api/auth/me \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Search World Model

```bash
# Query the Navigator
curl -X GET "https://api.feexsystems.codes/api/world-model/navigator?q=react+components" \
  -H "Content-Type: application/json"

# Multi-turn navigation
curl -X POST https://api.feexsystems.codes/api/world-model/navigator \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show me more about testing",
    "history": [
      {"role": "user", "content": "find react projects"},
      {"role": "assistant", "content": "Found 15 React projects..."}
    ]
  }'
```

### 3. Stream Omni-Command

```bash
# Execute with streaming trace
curl -X POST https://api.feexsystems.codes/api/world-model/omni-command/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "query": "find all JavaScript security vulnerabilities"
  }' \
  | grep -v "^:" | sed 's/^data: //'
```

### 4. Ingest Marketing Event

```bash
# Public marketing telemetry (no auth)
curl -X POST https://api.feexsystems.codes/api/marketing/telemetry/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "click",
    "entityType": "worldModelProject",
    "entityId": "feex-core",
    "metadata": {
      "section": "hero",
      "cta": "explore-world"
    }
  }'
```

### 5. GitHub Webhook

```bash
# GitHub sends this (with HMAC signature)
curl -X POST https://api.feexsystems.codes/api/world-model/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=your_hmac_here" \
  -d '{
    "repository": {
      "full_name": "owner/repo",
      "default_branch": "main"
    },
    "ref": "refs/heads/main",
    "action": "opened",
    "commits": [...]
  }'
```

## SDK Generation

Pre-generated clients are available:

```typescript
// TypeScript
import { FeexSystemsApi } from '@feexsystems/api-client';

const api = new FeexSystemsApi({
  basePath: 'https://api.feexsystems.codes'
});

const projects = await api.getWorldModelProjects();
const navigator = await api.navigateWorldModel({ q: 'react' });
```

## Support & Issues

- **API Issues**: Report via GitHub Issues with endpoint and error code
- **Spec Issues**: Check `docs/openapi.3.0.yaml` version and timestamp
- **Client Generation**: Use `openapi-generator` or `swagger-codegen`

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-09-14 | Initial OpenAPI 3.0 spec |

---

**Generated from source code exploration of FeexSystems server routes.**

Last updated: 2026-09-14
