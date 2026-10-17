# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 12: Reusable UI and Content Projection**.
The Schedule and Volunteers pages now share accessible panel and empty-state components.
Named content slots let each feature keep its own language and actions while the shared
components own stable structure, styling, labels, and a small set of deliberate tones.

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
GET  /api/service-events?month={YYYY-MM}&ministry={name}&page={number}&pageSize={number}
GET  /api/service-events/{eventId}
POST /api/service-events
GET  /api/volunteers?query={name}
```

SQLite keeps schedule and volunteer data runnable without installing a database server.
The EF Core boundary remains provider-focused so a later part can replace SQLite with
Microsoft SQL Server while preserving the HTTP contract and Angular repositories.

## Verify Part 12

```bash
dotnet test ChurchServe.slnx
npm test -- --watch=false
npm run build
```

The API integration tests use isolated in-memory SQLite databases to verify schedule
filtering, deterministic paging, persistence, and the volunteer search contract.
Angular tests protect content projection, unique accessible labels, caller-owned actions,
URL query parsing, router-driven filters, HTTP repositories, request states, retry
behavior, debouncing, and cancellation. The production build verifies strict TypeScript
and Angular template compilation across every lazy feature route.

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
