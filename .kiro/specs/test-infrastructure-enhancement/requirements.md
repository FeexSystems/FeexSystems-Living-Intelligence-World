# Test Infrastructure Enhancement — Requirements

## Overview

Establish comprehensive test infrastructure for FeexSystems codebase with Vitest, Playwright, and MSW.

## Current State

- Vitest configured but **0% test coverage** (no actual tests written)
- Canvas/jsdom issues prevent Three.js WebGL tests
- Test framework libraries installed but unused (prismock, vitest-mock-extended)
- No E2E test scripts

## Desired State

- **Unit Tests**: 50+ tests covering auth, API client, services
- **Integration Tests**: Database, Redis, Prisma operations
- **E2E Tests**: Critical user flows via Playwright
- **Canvas Tests**: WebGL scenes testable without browser
- **Type-safe Mocks**: Error scenarios, edge cases

## Requirements

### REQ-1: Vitest Canvas Configuration
1.1 WHEN Vitest runs Three.js component tests THEN they execute without `HTMLCanvasElement.getContext` errors
1.2 WHEN Canvas tests run THEN WebGL context is available (via polyfill or happy-dom)
1.3 WHEN dev command runs THEN tests can be watched with canvas support

### REQ-2: Critical Path Test Coverage
2.1 WHEN auth middleware processes a request THEN all outcomes are tested (valid token, expired, missing)
2.2 WHEN API client makes requests THEN success/error/timeout scenarios covered
2.3 WHEN database queries execute THEN transactions and edge cases tested
2.4 WHEN 3D components render THEN canvas setup tested

### REQ-3: Playwright E2E Setup
3.1 WHEN E2E suite runs THEN critical user journeys validate (login → navigate → world model)
3.2 WHEN public routes test THEN unauthenticated access verified
3.3 WHEN assertions fail THEN Playwright screenshots/traces capture state

### REQ-4: Mock & Fixture Strategy
4.1 WHEN tests need external services THEN MSW intercepts HTTP mocks
4.2 WHEN database accessed THEN Prismock provides fake data
4.3 WHEN tests need Firebase THEN mock auth decorator provides tokens

## Acceptance Criteria

✅ **Vitest**: Runs without canvas errors, watch mode works  
✅ **Coverage**: 20+ unit tests written for auth, API, services  
✅ **E2E**: 5+ critical user flows automated with Playwright  
✅ **CI**: Tests run in GitHub Actions on every PR  
✅ **Type Safety**: All mocks fully typed (no `any`)  

## Scope

- **In Scope**: Vitest config, test examples, Playwright setup, GitHub Actions CI
- **Out of Scope**: 100% coverage (target initial 40%), API endpoint mocking beyond critical paths
