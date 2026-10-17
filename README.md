# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 7: Services and a Repository Boundary**.
It contains an accessible application frame, explicit schedule request states,
reusable event cards, typed service-event forms, and bookmarkable create and detail routes
with explicit missing-page behavior. Components now depend on a focused service-event
repository contract supplied by Angular dependency injection, while an in-memory
implementation preserves the current behavior. Later parts can replace that implementation
without rewriting the schedule screens.

## Pinned toolchain

- Angular CLI: 22.2.3
- Angular packages: 22.2.x
- Node.js used to generate Part 1: 26.8.2
- npm used to generate Part 1: 11.19.1
- Unit test runner: Vitest 5

The exact dependency graph is recorded in `package-lock.json`. Run `npm ci` on
a clean checkout to reproduce it.

## Run locally

```bash
npm ci
npm start
```

Open `http://localhost:4201/`. The development server reloads the page when a
source file changes.

## Verify Part 7

```bash
npm test -- --watch=false
npm run build
```

The tests protect the application shell, route table, repository lookup and creation,
missing-page behavior, reusable event-card links, schedule request states, assignment
state, typed form validation, and create-to-detail navigation. The production build
verifies strict TypeScript and Angular template compilation across every lazy feature route.

## Current structure

```text
src/app/
  features/
    home/
    schedule/
      assignment.ts
      assignment-store.ts
      create-service-event-command.ts
      in-memory-service-event-repository.ts
      service-event-repository.ts
      service-event-create/
      service-event-detail/
      service-event-form/
    volunteers/
  app.config.ts
  app.html
  app.routes.ts
  app.scss
  app.spec.ts
  app.ts
```

`features` owns user-facing workflows. Application-wide infrastructure and
genuinely reusable presentation code will be introduced only when later parts
need them.
