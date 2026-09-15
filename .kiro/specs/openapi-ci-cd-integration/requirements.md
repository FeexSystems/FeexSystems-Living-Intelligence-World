# OpenAPI CI/CD Integration — Requirements

## Overview

Integrate OpenAPI specification validation, client generation, and documentation publishing into CI/CD pipeline.

## Current State

- OpenAPI spec exists (`docs/openapi.3.0.yaml`) — **not validated**
- No spec validation on commits or PRs
- No automated client generation
- Documentation site not published

## Desired State

- **Validation**: Every PR validates spec before merge
- **Client Generation**: Auto-generate TypeScript client on release tags
- **Documentation**: Redoc site published to dev.feexsystems.codes
- **Swagger UI**: Interactive docs available for testing

## Requirements

### REQ-1: Pre-commit Validation
1.1 WHEN spec file is committed THEN `swagger-cli validate` runs automatically
1.2 WHEN spec is invalid THEN commit is blocked with helpful error message
1.3 WHEN spec updates THEN JSON version auto-generated and committed

### REQ-2: GitHub Actions CI Integration
2.1 WHEN PR includes openapi.3.0.yaml changes THEN validation runs on PR
2.2 WHEN validation fails THEN PR shows annotation with error location
2.3 WHEN validation passes THEN client generation triggers

### REQ-3: Automated Client Generation
3.1 WHEN release tag is created THEN TypeScript client generated from spec
3.2 WHEN client generated THEN types are exported and published to npm (@feexsystems/api-client)
3.3 WHEN client published THEN frontend can upgrade with `npm i @feexsystems/api-client@latest`

### REQ-4: Documentation Publishing
4.1 WHEN main branch updated THEN Redoc builds static docs site
4.2 WHEN docs built THEN site deployed to dev.feexsystems.codes via Netlify/GitHub Pages
4.3 WHEN docs deployed THEN Swagger UI also available at /swagger endpoint

### REQ-5: Endpoint Contract Testing
5.1 WHEN spec changes THEN contract tests verify implementation matches
5.2 WHEN implementation diverges from spec THEN test fails
5.3 WHEN test fails THEN developer must update spec or code to re-align

## Acceptance Criteria

✅ **Validation**: Spec validates on every commit (pre-commit hook + CI)  
✅ **Client Generation**: npm package auto-published on release tags  
✅ **Docs Published**: Redoc site live at dev.feexsystems.codes  
✅ **Contract Tests**: 20+ endpoint responses validated against spec  
✅ **Spec as Source of Truth**: Enforced via CI (no implementation without spec update)  

## Scope

- **In Scope**: Pre-commit hook, GitHub Actions CI, npm publishing, Redoc deployment
- **Out of Scope**: SDK generation for languages beyond TypeScript (Python/Go come later)
