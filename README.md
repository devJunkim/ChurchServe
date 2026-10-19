# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 18: Optimistic Updates and Version Conflicts**.
The service-detail page now loads assignable ministry positions and eligible volunteers, shows
assignments immediately with a visible pending state, and reconciles each operation with the API.
The API protects assignments with event versions, idempotency keys, eligibility and overlap checks,
unique database constraints, and authoritative `409 Conflict` responses.

## Pinned toolchain

- Angular CLI: 22.2.3
- Angular packages: 22.2.x
- Node.js used to generate Part 1: 26.8.2
- npm used to generate Part 1: 11.19.1
- Unit test runner: Vitest 5
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

## Verify Part 18

```bash
dotnet test ChurchServe.slnx
npm run test:ci
npm run test:coverage
npm run check:architecture
npm run build
```

The API integration tests use isolated in-memory SQLite databases to verify schedule
filtering, deterministic paging, persistence, the volunteer search contract, assignment-board
queries, version conflicts, idempotent retries, eligibility, occupied positions, and overlapping
volunteer assignments.
Angular tests protect lazy route activation, route-scoped state recreation, request deduplication,
caching, derived values,
session restoration, sign-in transitions, password handling,
sign-out timing, guarded redirects, safe return URLs, resolver outcomes, dirty-form
navigation, content projection, URL query parsing, HTTP repositories, request states,
debouncing, and cancellation. API integration tests exercise real antiforgery tokens,
encrypted authentication cookies, protected endpoints, invalid credentials, logout, and assignment
mutations. Part 18 tests also verify optimistic confirmation, operation-scoped rollback, conflict
reconciliation, DTO validation, and the rendered pending state.
The production build verifies strict TypeScript and Angular template compilation.

## Current structure

```text
server/
  ChurchServe.Api/
    Assignments/
    Authentication/
    Data/
    ServiceEvents/
    Volunteers/
    Program.cs
tests/
  ChurchServe.Api.Tests/
src/testing/
  fake-service-event-repository.ts
  service-event.builder.ts
src/app/
  core/
    auth/
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
