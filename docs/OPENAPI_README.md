# FeexSystems API - OpenAPI 3.0 Documentation

Complete, production-ready OpenAPI 3.0 specification for the FeexSystems Living Intelligence World API.

## 📋 Documentation Files

### Core Specification

- **`openapi.3.0.yaml`** (Recommended) - Human-readable YAML format
  - 1700+ lines of comprehensive API documentation
  - All endpoints, schemas, security schemes, rate limits
  - Examples and error codes
  - Best for: Editing, version control, CI/CD

- **`openapi.3.0.json`** - Machine-readable JSON format
  - Auto-generated from YAML
  - Best for: Tooling, client generation, automation

### Guides

- **`OPENAPI_GUIDE.md`** - Complete introduction & features overview
  - What's documented
  - How to use the spec
  - Architecture overview
  - Examples & commands

- **`API_QUICK_REFERENCE.md`** - Fast lookup for developers
  - All endpoints table
  - Common patterns
  - Error codes
  - Rate limits
  - 📌 **Start here for quick lookups**

- **`INTEGRATION_GUIDE.md`** - Step-by-step integration instructions
  - OpenAPI doc tools (Swagger, Redoc, Elements)
  - Client library generation (TypeScript, Python, Go, Java, C#)
  - Testing & validation
  - IDE setup
  - Framework examples (React, Next.js, Vue, Python, Go)
  - CI/CD & deployment

- **`OPENAPI_README.md`** - This file

## 🚀 Quick Start

### 1. View Documentation

**Option A: Swagger UI (Interactive)**
```bash
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/specs/openapi.3.0.yaml \
  -v $(pwd)/docs:/specs \
  swaggerapi/swagger-ui

# Visit: http://localhost:8080/?url=/specs/openapi.3.0.yaml
```

**Option B: Redoc (Beautiful Static Docs)**
```bash
docker run -p 8000:8080 \
  -e SPEC_URL=file:///specs/openapi.3.0.yaml \
  -v $(pwd)/docs:/specs \
  redocly/redoc

# Visit: http://localhost:8000
```

**Option C: Online Editor**
- Visit: https://editor.swagger.io
- File → Import URL → paste your spec URL

### 2. Generate Client

```bash
# TypeScript
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g typescript-fetch \
  -o generated/typescript-client

# Python
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g python \
  -o generated/python-client

# Go
openapi-generator-cli generate \
  -i docs/openapi.3.0.yaml \
  -g go \
  -o generated/go-client
```

### 3. Test Endpoints

Using cURL:

```bash
# Get projects (public, no auth)
curl https://api.feexsystems.codes/api/world-model/projects

# Get current user (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.feexsystems.codes/api/auth/me

# Search World Model
curl "https://api.feexsystems.codes/api/world-model/navigator?q=react"
```

Using Postman:
- Import `openapi.3.0.yaml` → Postman Auto-creates Collection
- Set up environment variables
- Test endpoints interactively

## 📚 API Endpoints

### By Category

#### Health & Status (Public)
- `GET /health` - Full health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /api/ping` - Ecosystem ping

#### World Model (Public, Rate-Limited)
- `GET /api/world-model/projects` - List projects
- `GET /api/world-model/graph` - 3D graph topology
- `GET /api/world-model/evidence/*` - Evidence ledger
- `GET /api/world-model/navigator` - Grounded search
- `POST /api/world-model/navigator` - Multi-turn search

#### Omni-Command (Rate-Limited)
- `POST /api/world-model/omni-command` - Execute command
- `POST /api/world-model/omni-command/stream` - Stream with SSE

#### Authentication (Requires Firebase JWT)
- `GET /api/auth/me` - Current user
- `GET /api/auth/sessions` - Active sessions
- `GET /api/auth/stats` - Auth stats

#### Users (Requires Auth)
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/profile/avatar` - Upload avatar
- `DELETE /api/users/profile/avatar` - Delete avatar

#### Billing (Requires Auth)
- `GET /api/billing/calculate` - Current billing
- `GET /api/billing/history` - Billing history
- `GET /api/billing/estimate` - Next bill estimate

#### Admin (Requires ADMIN+ Role)
- `GET /api/admin/metrics` - Dashboard metrics
- `GET /api/admin/users` - User analytics
- `GET /api/admin/security` - Security report
- `GET /api/admin/audit-logs` - Audit logs

#### Marketing (Public)
- `POST /api/marketing/telemetry/events` - Ingest event
- `GET /api/marketing/telemetry/events/entity/{type}/{id}` - Entity events

See `API_QUICK_REFERENCE.md` for complete endpoint table.

## 🔐 Authentication

### Methods

1. **Firebase JWT (Recommended)**
   ```bash
   Authorization: Bearer <firebase_jwt_token>
   ```

2. **Mock Auth (Development)**
   ```bash
   X-Mock-User: user-123
   # Requires: USE_MOCK_AUTH=true
   ```

3. **GitHub Webhooks (HMAC)**
   ```bash
   X-Hub-Signature-256: sha256=<hmac>
   ```

### No Auth Required

- All public endpoints (projects, graph, navigator, etc.)
- Health checks
- Webhook receiver (uses HMAC instead)
- Marketing telemetry (public ingestion)

## ⏱️ Rate Limiting

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1694702400
```

Tier 1: 100 requests / 15 minutes (general)
Tier 2: 10 requests / 15 minutes (auth)
Tier 3: 5 requests / 15 minutes (hard query limits)
Tier 4: 10 requests / 1 minute (AI services)

See `OPENAPI_GUIDE.md` for details.

## 🎯 Features Documented

✅ All 50+ endpoints documented
✅ Request/response schemas
✅ Error codes and examples
✅ Rate limiting tiers
✅ Authentication methods
✅ Global headers
✅ World Model concepts
✅ Streaming responses (SSE)
✅ Pagination patterns
✅ Admin role-based access
✅ Marketing telemetry schema

## 🛠️ Tools & Integration

### Documentation Tools

- **Swagger UI** - Interactive API explorer
- **Redoc** - Beautiful static docs
- **Elements** - Reference docs with examples
- **VS Code** - Built-in preview
- **JetBrains IDEs** - Native support

### Client Generation

Supported languages:
- TypeScript / JavaScript
- Python
- Go
- Java
- C# / .NET
- Ruby
- PHP
- Rust
- [50+ more](https://openapi-generator.tech/docs/generators/)

### Testing & Validation

- Swagger CLI validation
- Postman collection generation
- Insomnia import
- Contract testing

## 📖 How to Use This Documentation

### I want to...

**...explore the API interactively**
→ Use Swagger UI (see "Quick Start")

**...find all endpoints quickly**
→ See `API_QUICK_REFERENCE.md` endpoint table

**...understand how to implement**
→ Read `INTEGRATION_GUIDE.md` for your framework

**...set up local documentation**
→ Follow Docker commands in `OPENAPI_GUIDE.md`

**...generate a client library**
→ Follow "Client Generation" in `INTEGRATION_GUIDE.md`

**...integrate with CI/CD**
→ See Deployment & CI/CD section in `INTEGRATION_GUIDE.md`

## 🏗️ API Architecture

### Principles

1. **Canonical Data + Model Reasoning**
   - Database-backed World Model is authoritative
   - Models interpret and summarize

2. **Graph, Not List**
   - Relationships are first-class entities
   - Evidence trails built-in

3. **Evidence, Not Claims**
   - Every fact has traceable GitHub proof
   - Cryptographic commit SHAs

4. **Provider-Neutral Intelligence**
   - Swap AI models without breaking contracts
   - Gemini, OpenAI, Claude support

5. **Spatial Meaning**
   - 3D visualization meaningful
   - Graph topology matters

## 📊 Request/Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "USER"
  },
  "metadata": {
    "timestamp": "2026-09-14T12:00:00Z"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_FAILED",
    "message": "Invalid request",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-09-14T12:00:00Z",
    "requestId": "req_..."
  }
}
```

## 🌍 World Model Concepts

### Project
GitHub repository in World Model with evidence.

```json
{
  "id": "feex-core",
  "name": "FEEX Core",
  "repository": "owner/repo",
  "stars": 150
}
```

### Evidence
Cryptographic proof of implementation.

```json
{
  "projectId": "feex-core",
  "repository": "owner/repo",
  "commitSha": "abc123def...",
  "branch": "main",
  "filePath": "/src/index.ts"
}
```

### Graph
Nodes (projects, techs) + Edges (relationships).

```json
{
  "nodes": [
    {"id": "react", "type": "technology"},
    {"id": "feex-ui", "type": "project"}
  ],
  "edges": [
    {"source": "feex-ui", "target": "react", "type": "uses"}
  ]
}
```

## 🚦 Common Patterns

### Pagination

```bash
GET /api/admin/users?page=2&limit=50
```

Response includes:
```json
{
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

### Filtering

```bash
GET /api/admin/users?role=ADMIN&emailVerified=true
```

### Date Range

```bash
GET /api/admin/audit-logs?startDate=2026-01-01&endDate=2026-12-31
```

### Streaming

```bash
curl -N \
  https://api.feexsystems.codes/api/world-model/omni-command/stream \
  -H "Accept: text/event-stream"

# Responses:
# event: trace
# data: {...}
#
# event: result
# data: {...}
```

## 📋 Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `AUTHENTICATION_REQUIRED` | 401 | Must authenticate |
| `INSUFFICIENT_PERMISSIONS` | 403 | Wrong role |
| `VALIDATION_FAILED` | 400 | Bad input |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_FOUND_ERROR` | 404 | Resource missing |
| `INTERNAL_ERROR` | 500 | Server error |

Full list in `API_QUICK_REFERENCE.md`.

## 🔄 Development vs Production

| Aspect | Dev | Production |
|--------|-----|------------|
| Base URL | `localhost:3001` | `api.feexsystems.codes` |
| Auth | Mock or Firebase | Firebase JWT only |
| HTTPS | Optional | Required |
| CORS | Open | Strict |
| Errors | Detailed | Sanitized |

## 📦 Generated Artifacts

From this OpenAPI spec, you can generate:

- TypeScript/JavaScript client library
- Python SDK
- Go SDK
- Java SDK
- C# / .NET SDK
- Interactive Swagger UI
- Beautiful Redoc site
- Postman collection
- API test suites
- Type definitions
- API mock server

## 🤝 Contributing

When modifying the API:

1. **Update OpenAPI spec first** (spec-driven development)
2. **Validate spec**: `swagger-cli validate docs/openapi.3.0.yaml`
3. **Regenerate clients**: `openapi-generator-cli generate ...`
4. **Commit spec changes**: `git add docs/openapi.3.0.yaml`
5. **Test endpoints**: Validate implementation matches spec

## 🔗 Links

- **OpenAPI Spec**: `docs/openapi.3.0.yaml` (main specification)
- **Quick Reference**: `docs/API_QUICK_REFERENCE.md` (fast lookups)
- **Integration Guide**: `docs/INTEGRATION_GUIDE.md` (implementation examples)
- **OpenAPI Guide**: `docs/OPENAPI_GUIDE.md` (detailed overview)

- **Swagger Editor**: https://editor.swagger.io
- **OpenAPI Tools**: https://openapi.tools/
- **OpenAPI Generator**: https://openapi-generator.tech/

## ✨ Highlights

- **50+ endpoints** comprehensively documented
- **Production-ready** specification
- **Evidence-backed** World Model contracts
- **Rate limits** clearly defined
- **Error codes** standardized
- **Examples** for every endpoint
- **Multi-language client generation** supported
- **Streaming** (SSE) responses documented
- **Admin controls** role-based
- **Marketing telemetry** public ingestion

## 📞 Support

For API issues:
- Check `API_QUICK_REFERENCE.md` for endpoint details
- Review `INTEGRATION_GUIDE.md` for framework examples
- Validate spec: `swagger-cli validate`
- Use Swagger UI to test endpoints

For spec issues:
- File GitHub issue with spec section
- Include error code or endpoint name
- Provide reproduction steps

---

**Version**: 2.0.0  
**Last Updated**: 2026-09-14  
**Spec Format**: OpenAPI 3.0.0  
**Status**: Production Ready ✅

Generated from FeexSystems server route analysis and world model specifications.
