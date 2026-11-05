# Changelog

All notable changes to the FEEXSYSTEMS Living Intelligence World platform will be documented in this file.

## [unreleased]

### Added
- Initial CHANGELOG creation for the FeexSystems repository

### Changed
- 

### Fixed
-

## [2.0.0] - 2026-09-14

### Added
- Full OpenAPI 3.0 specification (`docs/openapi.3.0.yaml`) with 50+ endpoints
- Swagger UI at `GET /api/docs`
- API Quick Reference (`docs/API_QUICK_REFERENCE.md`)
- Authentication system with Firebase JWT and mock auth support
- World Model endpoints: /projects, /graph, /evidence/*, /navigator
- Omni-Command orchestration with SSE streaming
- Admin dashboard endpoints: /metrics, /users, /audit-logs, /system-health
- Marketing CRUD endpoints under /api/marketing
- Usage tracking and bandwidth monitoring
- GitHub webhook integration with HMAC SHA-256 verification
- Non-blocking infrastructure initialization (invariant #3 compliance)
- WebGL dpr clamping `[1, 2]` for high-DPI display protection

### Changed
- Infrastructure initialization: database and Redis connections are non-blocking
- Authentication: legacy JWT endpoints removed; Firebase Auth is the single source of truth
- World Model: evidence verification gate added before anchoring commit SHAs

### Fixed
- Removed guaranteed-session fallback that minted hard-coded SUPER_ADMIN user on auth failure
- Fixed mock auth flow to require backend reachability for Google login in development