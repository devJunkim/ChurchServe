# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 13: Authentication and Session State**.
ChurchServe now restores a server-managed cookie session before rendering navigation,
provides a tested sign-in and sign-out experience, protects coordination APIs, and uses
Angular's XSRF convention with server-side antiforgery validation for mutating requests.

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
POST /api/service-events
GET  /api/volunteers?query={name}
GET  /api/session
POST /api/session/sign-in
DELETE /api/session
```

SQLite keeps schedule and volunteer data runnable without installing a database server.
The EF Core boundary remains provider-focused so a later part can replace SQLite with
Microsoft SQL Server while preserving the HTTP contract and Angular repositories.

## Verify Part 13

```bash
dotnet test ChurchServe.slnx
npm test -- --watch=false
npm run build
```

The API integration tests use isolated in-memory SQLite databases to verify schedule
filtering, deterministic paging, persistence, and the volunteer search contract.
Angular tests protect session restoration, sign-in transitions, password handling,
sign-out timing, content projection, URL query parsing, HTTP repositories, request
states, debouncing, and cancellation. API integration tests exercise real antiforgery
tokens, encrypted authentication cookies, protected endpoints, invalid credentials, and
logout. The production build verifies strict TypeScript and Angular template compilation.

## Current structure

```text
server/
  ChurchServe.Api/
    Authentication/
    Data/
    ServiceEvents/
    Volunteers/
    Program.cs
tests/
  ChurchServe.Api.Tests/
src/app/
  core/
    auth/
  features/
    home/
    sign-in/
    schedule/
      assignment.ts
      assignment-store.ts
      api/
      create-service-event-command.ts
      page.ts
      schedule-query.ts
      service-event-repository.ts
      service-event-create/
      service-event-detail/
      service-event-form/
    volunteers/
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
```

`features` owns user-facing workflows. Application-wide infrastructure and
genuinely reusable presentation code will be introduced only when later parts
need them.
