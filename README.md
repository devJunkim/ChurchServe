# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 10: RxJS Search, Cancellation, and Request
State**. The Volunteers page now treats search text as a stream, waits for meaningful
input, cancels stale work with `switchMap`, and renders explicit idle, loading, loaded,
empty, and recoverable error states. A typed Angular repository calls a matching
ASP.NET Core volunteer-search endpoint backed by SQLite.

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

## API contract

The ASP.NET Core server implements these endpoints:

```text
GET  /api/service-events
GET  /api/service-events/{eventId}
POST /api/service-events
GET  /api/volunteers?query={name}
```

SQLite keeps schedule and volunteer data runnable without installing a database server.
The EF Core boundary remains provider-focused so a later part can replace SQLite with
Microsoft SQL Server while preserving the HTTP contract and Angular repositories.

## Verify Part 10

```bash
dotnet test ChurchServe.slnx
npm test -- --watch=false
npm run build
```

The API integration tests use isolated in-memory SQLite databases to verify schedule
persistence and the volunteer search contract. Angular tests protect the application
shell, HTTP repositories, runtime DTO validation, request states, retry behavior,
debouncing, and cancellation. The production build verifies strict TypeScript and
Angular template compilation across every lazy feature route.

## Current structure

```text
server/
  ChurchServe.Api/
    Data/
    ServiceEvents/
    Volunteers/
    Program.cs
tests/
  ChurchServe.Api.Tests/
src/app/
  features/
    home/
    schedule/
      assignment.ts
      assignment-store.ts
      api/
      create-service-event-command.ts
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
