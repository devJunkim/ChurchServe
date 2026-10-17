# ChurchServe

ChurchServe is the single evolving application used by the ChurchServe Angular
tutorial series. It helps church coordinators plan service events, organize
ministry positions, and identify where volunteers are still needed.

This repository currently represents **Part 4: Signals and Volunteer Assignment State**.
It contains an accessible application frame, explicit schedule request states,
reusable event cards, and signal-backed volunteer assignment state with pure domain
validation. Later parts will extend these same features rather than replace them
with disconnected examples.

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

## Verify Part 4

```bash
npm test -- --watch=false
npm run build
```

The tests protect the application shell, reusable event-card contract, schedule
request states, stable list identity, assignment validation, immutable updates,
and computed open positions. The production build verifies strict TypeScript and
Angular template compilation, including the lazy feature routes.

## Current structure

```text
src/app/
  features/
    home/
    schedule/
      assignment.ts
      assignment-store.ts
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
