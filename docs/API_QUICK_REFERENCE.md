# FeexSystems API - Quick Reference

## Base URL

```
Production: https://api.feexsystems.codes
Development: http://localhost:3001 or http://localhost:8080
```

## Authentication

### Firebase JWT (Bearer Token)

```bash
Authorization: Bearer <firebase_jwt_token>
```

### Mock Auth (Development Only)

```bash
X-Mock-User: <user-id>
# Set USE_MOCK_AUTH=true in .env
```

### No Auth (Public Endpoints)

Some endpoints are completely public and require no authentication.

## Common Headers

```http
Content-Type: application/json
X-Request-ID: <uuid>  # Optional, for request tracking
Accept: application/json
```

## Response Format

### Success

```json
{
  "success": true,
  "data": { /* ... */ },
  "metadata": { /* pagination, etc */ },
  "timestamp": "2026-09-14T12:00:00Z"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human readable message",
    "code": "ERROR_CODE",
    "timestamp": "2026-09-14T12:00:00Z"
  }
}
```

## Endpoints

### Health & Status

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/health` | ✗ | Full health check |
| GET | `/health/ready` | ✗ | Readiness probe |
| GET | `/health/live` | ✗ | Liveness probe |
| GET | `/api/ping` | ✗ | API ping |

### Authentication

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/auth/me` | ✓ | Current user profile |
| POST | `/api/auth/sync-user` | ✓ | Sync Firebase user |
| GET | `/api/auth/sessions` | ✓ | Get active sessions |
| GET | `/api/auth/stats` | ✓ | Auth statistics |
| GET | `/api/auth/health` | ✗ | Auth subsystem health |

### World Model - Projects

| Method | Endpoint | Auth | Rate Limit |
|--------|----------|------|-----------|
| GET | `/api/world-model/projects` | ✗ | 100/15min |
| GET | `/api/world-model/graph` | ✗ | 100/15min |

### World Model - Evidence

| Method | Endpoint | Auth | Rate Limit |
|--------|----------|------|-----------|
| GET | `/api/world-model/evidence/projects` | ✗ | 5/15min |
| GET | `/api/world-model/evidence/{projectId}` | ✗ | 5/15min |
| GET | `/api/world-model/evidence/{projectId}/content` | ✗ | 5/15min |

### World Model - Navigator

| Method | Endpoint | Auth | Rate Limit |
|--------|----------|------|-----------|
| GET | `/api/world-model/navigator?q=<query>` | ✗ | 5/15min |
| POST | `/api/world-model/navigator` | ✗ | 5/15min |
| GET | `/api/world-model/providers/status` | ✗ | — |

### World Model - Temporal

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/world-model/temporal/{projectId}` | ✗ | Project state at time |
| GET | `/api/world-model/temporal/{projectId}/events` | ✗ | Project events |

### World Model - Sync & Maintenance

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/world-model/sync/github-pinned` | ✓ | Trigger GitHub sync |
| POST | `/api/world-model/embeddings/reindex` | ✓ | Reindex embeddings |
| POST | `/api/world-model/webhooks/provision` | ✓ | Provision webhooks |
| GET | `/api/world-model/maintenance/status` | ✓ | Maintenance status |
| POST | `/api/world-model/maintenance/run` | ✓ | Run maintenance |

### World Model - Webhooks (GitHub)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/world-model/webhook` | HMAC | GitHub webhook receiver |

### Omni-Command

| Method | Endpoint | Auth | Rate Limit |
|--------|----------|------|-----------|
| POST | `/api/world-model/omni-command` | ✗ | 5/15min |
| POST | `/api/world-model/omni-command/stream` | ✗ | 5/15min (SSE) |

### Users

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/users/profile` | ✓ | Get profile |
| PUT | `/api/users/profile` | ✓ | Update profile |
| POST | `/api/users/profile/avatar` | ✓ | Upload avatar |
| DELETE | `/api/users/profile/avatar` | ✓ | Delete avatar |
| GET | `/api/users/profile/activity` | ✓ | Activity logs |

### Billing

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/billing/calculate` | ✓ | Current billing |
| GET | `/api/billing/history` | ✓ | Billing history |
| GET | `/api/billing/estimate` | ✓ | Next bill estimate |

### Admin

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/admin/metrics` | ✓ | ADMIN+ |
| GET | `/api/admin/users` | ✓ | ADMIN+ |
| GET | `/api/admin/subscriptions` | ✓ | ADMIN+ |
| GET | `/api/admin/security` | ✓ | ADMIN+ |
| GET | `/api/admin/audit-logs` | ✓ | ADMIN+ |
| GET | `/api/admin/permissions` | ✓ | ADMIN+ |
| GET | `/api/admin/system/health` | ✓ | ADMIN+ |
| POST | `/api/admin/system/maintenance` | ✓ | SUPER_ADMIN |

### Marketing

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/marketing/telemetry/events` | ✗ | Ingest event |
| GET | `/api/marketing/telemetry/events/entity/{type}/{id}` | ✗ | Get entity events |
| GET | `/api/marketing/telemetry/stats` | ✗ | Event stats |

## Query Parameters & Pagination

### Pagination

```bash
?page=1&limit=20
```

- `page`: 1-indexed (default: 1)
- `limit`: 1-100 (default: 20)

### Common Filters

```bash
?search=term
?role=ADMIN
?action=PROFILE_VIEWED
?startDate=2026-09-01T00:00:00Z
?endDate=2026-09-30T23:59:59Z
```

## Rate Limiting

Response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1694702400
```

When exceeded (429):

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

## Common Patterns

### Get Current User

```bash
curl -X GET https://api.feexsystems.codes/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Search World Model

```bash
curl -X GET "https://api.feexsystems.codes/api/world-model/navigator?q=react" \
  -H "Content-Type: application/json"
```

### Stream Omni-Command

```bash
curl -X POST https://api.feexsystems.codes/api/world-model/omni-command/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"query": "find security issues"}'
```

### Upload Avatar

```bash
curl -X POST https://api.feexsystems.codes/api/users/profile/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

### Paginate Users

```bash
curl -X GET "https://api.feexsystems.codes/api/admin/users?page=2&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `MISSING_TOKEN` | 401 | No token in request |
| `INVALID_TOKEN` | 401 | Malformed token |
| `TOKEN_EXPIRED` | 401 | Token TTL exceeded |
| `AUTHENTICATION_REQUIRED` | 401 | Must authenticate |
| `INSUFFICIENT_PERMISSIONS` | 403 | Wrong role |
| `VALIDATION_FAILED` | 400 | Bad input |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_FOUND_ERROR` | 404 | Resource missing |
| `CONFLICT_ERROR` | 409 | Resource conflict |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Maintenance |

## User Roles

- `USER` - Regular user
- `ANALYST` - Analyst (marketing)
- `ADMIN` - Administrator
- `SUPER_ADMIN` - Super administrator

## World Model Concepts

### Project
Represents a GitHub repository in the World Model.

```json
{
  "id": "feex-core",
  "name": "FEEX Core",
  "repository": "owner/repo",
  "description": "...",
  "topics": ["javascript", "react"],
  "stars": 150
}
```

### Technology
Languages, frameworks, tools used in projects.

```json
{
  "id": "react",
  "name": "React",
  "type": "framework",
  "category": "frontend"
}
```

### Artifact
Files, configurations, documentation in projects.

```json
{
  "id": "package.json",
  "name": "package.json",
  "type": "configuration",
  "path": "/package.json",
  "projectId": "feex-core"
}
```

### Evidence
Cryptographic proof of code implementation (commit SHAs, file paths).

```json
{
  "projectId": "feex-core",
  "repository": "owner/repo",
  "commitSha": "abc123def456",
  "branch": "main",
  "filePath": "/src/index.ts",
  "observationTimestamp": "2026-09-14T12:00:00Z"
}
```

## Streaming Responses

### Server-Sent Events (SSE)

Endpoints like `/omni-command/stream` return SSE:

```
event: trace
data: {"step": 1, "action": "..."}

event: trace
data: {"step": 2, "action": "..."}

event: result
data: {"status": "success", "outcome": "..."}
```

Parse in JavaScript:

```javascript
const eventSource = new EventSource(
  'https://api.feexsystems.codes/api/world-model/omni-command/stream',
  { method: 'POST', body: JSON.stringify({...}) }
);

eventSource.addEventListener('trace', (e) => {
  console.log('Trace:', JSON.parse(e.data));
});

eventSource.addEventListener('result', (e) => {
  console.log('Result:', JSON.parse(e.data));
  eventSource.close();
});
```

## Development Notes

### Mock Auth

For local development without Firebase:

1. Set `USE_MOCK_AUTH=true` in `.env`
2. Send any request with `X-Mock-User: user-123` header
3. Gets you a mock user with ID `user-123`

### Environment Variables

```bash
FRONTEND_URL=http://localhost:3000
NODE_ENV=development|production
USE_MOCK_AUTH=true|false
FIREBASE_PROJECT_ID=your-project
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### CORS

Development:
- CORS enabled for `FRONTEND_URL`
- Credentials allowed

Production:
- Strict CORS headers applied
- Reverse proxy trust configured

## Useful Tools

- **Swagger UI**: `https://editor.swagger.io`
- **Postman**: Import OpenAPI spec directly
- **Thunder Client**: VS Code extension
- **REST Client**: VS Code extension
- **cURL**: Command line
- **HTTPie**: User-friendly CLI

## See Also

- [OpenAPI Specification](docs/openapi.3.0.yaml)
- [OpenAPI Guide](docs/OPENAPI_GUIDE.md)
- [Architecture Docs](docs/ARCHITECTURE.md)
- [World Model Documentation](docs/WORLD_MODEL.md)

---

Last updated: 2026-09-14
