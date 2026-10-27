# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 25: Production Build and Deployment**.
Angular now loads validated public runtime configuration before bootstrap, while ASP.NET Core serves
the optimized browser files and API from one same-origin release artifact. The host exposes liveness
and database-backed readiness probes, keeps SPA fallback away from missing API and asset routes, and
applies security and cache headers. CI smoke-tests the published output before retaining it as an artifact.

## Pinned toolchain

- Angular CLI: 22.2.3
- Angular packages: 22.2.x
- Node.js used to generate Part 1: 26.8.2
- npm used to generate Part 1: 11.19.1
- Unit test runner: Vitest 5
- End-to-end test runner: Playwright 1.64
- .NET SDK: 10
- EF Core SQLite: 10.0.13

The exact dependency graph is recorded in `package-lock.json`. Run `npm ci` on
a clean checkout to reproduce it.

## Run locally

Start the API in one terminal:

```bash
dotnet run --project server/ChurchServe.Api
```

Start Angular in a second terminal:

```bash
npm ci
npm start
```

Open `http://localhost:4201/`. Angular proxies `/api` requests to the API at
`http://localhost:5091`, so the browser still uses same-origin URLs. The API creates
`server/ChurchServe.Api/churchserve.db` on first run and seeds two schedule entries.

The development-only tutorial account is `coordinator@churchserve.local`. Configure its
local password without committing it:

```bash
dotnet user-secrets set --project server/ChurchServe.Api "Authentication:LocalAccount:Password" "<choose-a-local-password>"
```

The local account authenticator is disabled outside Development and Testing; replace it
with ASP.NET Core Identity or an external identity provider for a deployed application.
Part 25 prepares and verifies the deployable artifact but deliberately does not weaken that
authentication boundary.

## Build and verify a release artifact

Create one framework-dependent ASP.NET Core artifact containing the optimized Angular application:

```bash
npm ci
npm run build:release
```

The artifact is written to `artifacts/publish/`. Angular's size budgets and automatic script CSP
run during the production build, and the .NET publish target fails when the browser output is absent.
The server reads public configuration at startup and returns it from `/runtime-config.json`:

```bash
PublicRuntime__ApiBaseUrl=/api
PublicRuntime__Release=2026.10.25.1
ConnectionStrings__ChurchServe="Data Source=/data/churchserve.db"
```

`PublicRuntime__ApiBaseUrl` must be a same-origin absolute path because ChurchServe uses strict
same-origin cookies and antiforgery. Runtime configuration is visible to every browser and must
never contain secrets.

Smoke-test the exact published output in the `Production` environment:

```bash
npm run test:release
```

The verifier chooses an available loopback port and a temporary SQLite database. It checks the
application shell, a deep link, missing API and asset 404s, runtime configuration, liveness and
readiness, response headers, immutable fingerprinted assets, source-map exclusion, and known
configuration-secret markers. The temporary database is removed after the process stops.

The host endpoints are:

```text
GET /runtime-config.json  -> public deploy-time browser settings
GET /health/live          -> process is running
GET /health/ready         -> required database is reachable
```

TLS termination, durable storage, backups, a production identity provider, and release promotion
remain responsibilities of the selected hosting platform. Keep the previous artifact available and
use backward-compatible database changes so rollback does not depend on rebuilding older source.

## API contract

The ASP.NET Core server implements these endpoints:

```text
GET  /api/service-events?month={YYYY-MM}&ministry={name}&page={number}&pageSize={number}
GET  /api/service-events/{eventId}
GET  /api/service-events/{eventId}/assignment-board
POST /api/service-events
POST /api/service-events/{eventId}/assignments
GET  /api/volunteers?query={name}
GET  /api/session
POST /api/session/sign-in
DELETE /api/session
```

SQLite keeps schedule and volunteer data runnable without installing a database server.
The EF Core boundary remains provider-focused so a later part can replace SQLite with
Microsoft SQL Server while preserving the HTTP contract and Angular repositories.

## Run the critical browser journeys

Install the pinned Chromium build once after `npm ci`:

```bash
npx playwright install chromium
```

Then run the end-to-end suite:

```bash
npm run test:e2e
```

Playwright uses dedicated ports `4202` and `5092`, a disposable
`.churchserve.e2e.db` database, and a synthetic account that exists only in the
spawned `Testing` environment. The suite resets the database before each scenario
and runs with one worker so tests cannot race through shared fixture state. The
`POST /api/test/reset` endpoint is mapped only when the API environment is `Testing`.

Use `npm run test:e2e:ui` for local interactive debugging. Failed tests retain
artifacts under `test-results/` and an HTML report under `playwright-report/`;
both directories are ignored by Git.

## Verify Part 25

```bash
dotnet test ChurchServe.slnx
npm run test:ci
npm run test:coverage
npm run check:architecture
npm run build
npm run test:e2e
npm run build:release
npm run test:release
```

The API integration tests use isolated in-memory SQLite databases to verify schedule
filtering, deterministic paging, persistence, the volunteer search contract, assignment-board
queries, version conflicts, idempotent retries, eligibility, occupied positions, and overlapping
volunteer assignments.
Angular tests protect lazy route activation, permission-aware navigation, route-scoped state recreation, in-flight request
sharing, bounded expiry-based caching, LRU eviction, mutation invalidation, stable event identity,
memoized assignment lookups and eligible-volunteer collections, derived values,
session restoration, sign-in transitions, password handling,
sign-out timing, guarded redirects, safe return URLs, resolver outcomes, dirty-form
navigation, path-aware focus handoff, semantic schedule lists, accessible form errors,
assignment focus preservation, content projection, URL query parsing, HTTP repositories, request states,
debouncing, cancellation, and axe scans of representative rendered states. API integration tests exercise real antiforgery tokens,
encrypted authentication cookies, protected endpoints, invalid credentials, logout, and assignment
mutations. Part 21 tests also verify problem-detail normalization, correlation references, bounded
transient-read retries, non-retryable failures, safe global reporting, field-level server validation,
and session-expiry recovery. Part 22 adds API denial tests for read-only and unknown roles, session
permission-contract tests, hidden-action and route-guard tests, and a hostile-looking text rendering
test. The suite retains keyed reconciliation across unchanged, updated,
reordered, and empty collections plus the existing normalized cache-key, failed-request recovery,
freshness, role-aware clearing, optimistic confirmation, rollback, conflict, and DTO coverage.
The production build verifies strict TypeScript and Angular template compilation.
Part 24 adds Testing-environment fixture-boundary tests and four Chromium journeys
covering sign-in/sign-out protection, validation and event creation, keyboard-only
assignment, and stale assignment conflict recovery.
Part 25 adds eight Angular runtime-configuration tests, four deployment endpoint tests,
and a smoke test against the complete published artifact. CI uploads that verified artifact
with the commit SHA in its name.

## Current structure

```text
server/
  ChurchServe.Api/
    Assignments/
    Authentication/
    Data/
    Deployment/
    ServiceEvents/
    Testing/
    Volunteers/
    Program.cs
tests/
  ChurchServe.Api.Tests/
e2e/
  churchserve.spec.ts
  proxy.conf.json
  test-account.ts
playwright.config.ts
src/testing/
  fake-service-event-repository.ts
  service-event.builder.ts
src/app/
  core/
    auth/
    config/
    data/
    errors/
    http/
    routing/
  features/
    home/
    navigation-unavailable/
    not-found/
    sign-in/
    schedule/
      schedule.routes.ts
      assignment.ts
      assignment-repository.ts
      assignment-store.ts
      api/
      create-service-event-command.ts
      page.ts
      schedule-query.ts
      schedule-store.ts
      service-event-repository.ts
      service-event-create/
      service-event-detail/
        service-event.resolver.ts
      service-event-form/
    volunteers/
      volunteers.routes.ts
      api/
      volunteer.ts
      volunteer-repository.ts
      volunteers.html
      volunteers.scss
      volunteers.ts
  shared/
    ui/
      empty-state/
      panel/
  app.config.ts
  app.html
  app.routes.ts
  app.scss
  app.spec.ts
  app.ts
proxy.conf.json
tools/
  check-architecture.mjs
```

`features` owns user-facing workflows. Application-wide infrastructure and
genuinely reusable presentation code will be introduced only when later parts
need them.
