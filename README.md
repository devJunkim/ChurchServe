# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 6: Routing and Service Detail Pages**.
It contains an accessible application frame, explicit schedule request states,
reusable event cards, typed service-event forms, and bookmarkable create and detail routes
with explicit missing-page behavior. Later parts will extend these same features rather
than replace them with disconnected examples.

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

## Verify Part 6

```bash
npm test -- --watch=false
npm run build
```

The tests protect the application shell, route table, detail lookup, missing-page
behavior, reusable event-card links, schedule request states, assignment state,
typed form validation, and create-to-detail navigation. The production build verifies
strict TypeScript and Angular template compilation across every lazy feature route.

## Current structure

```text
src/app/
  features/
    home/
    schedule/
      assignment.ts
      assignment-store.ts
      create-service-event-command.ts
      service-event-create/
      service-event-detail/
      service-event-form/
      service-event-store.ts
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
