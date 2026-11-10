# CLAUDE.md — solarcammayotte-site

## Project Overview

This is the website for **Solar Cam Mayotte** — a solar-powered camera project based in Mayotte. The repository is in its initial setup phase.

## Repository Status

The Solar Cam site itself is not started yet. The repo currently contains **`coach-app/`**, a separate bodybuilding coach PWA (see below). Move it to its own repository when one is available.

## Development Guidelines

### Git Workflow

- Work on feature branches prefixed with `claude/`
- Write clear, descriptive commit messages
- Push with `git push -u origin <branch-name>`

### Code Style

- Follow the linting and formatting rules configured in the project (update this section once tooling is added)
- Prefer simple, readable code over clever abstractions

### Testing

- Vitest for unit tests; engine logic lives in `coach-app/src/engine` and must stay covered by tests (`engine.test.ts`)
- Coaching rules are rule-based (no AI/backend yet); morphology thresholds are heuristics, not medical norms

## Project Structure

```
solarcammayotte-site/
├── CLAUDE.md          # This file — guidance for AI assistants
└── coach-app/         # Coach Muscu — Vite + React + TypeScript PWA (French UI)
    ├── public/        # manifest, icon, service worker (offline)
    └── src/
        ├── engine/    # Pure logic, unit-tested (no React)
        │   ├── morphology.ts  # ape index, femur/torso ratio -> traits + insights
        │   ├── exercises.ts   # exercise DB (equipment, injury stress, morphology fit)
        │   ├── program.ts     # split + exercise selection + sets/reps
        │   └── coach.ts       # double progression, deload, volume adaptation, feedback
        ├── ui/        # ProfileForm, Today (workout), Plan, History
        ├── storage.ts # localStorage persistence (no backend)
        └── types.ts
```

> **Note:** Update this structure diagram as directories and files are added.

## Commands

Run from `coach-app/`:

```
npm install        # Install dependencies
npm run dev        # Start dev server
npm run build      # Typecheck + production build
npm test           # Run unit tests (vitest)
npm run typecheck  # tsc --noEmit
```

No linter/formatter configured yet.

## Key Conventions

1. Keep dependencies minimal
2. Document new tooling choices in this file
3. Prefer standard, well-maintained libraries
4. Write semantic HTML and accessible markup for the website

## Updating This File

This CLAUDE.md should be kept in sync with the project. When adding:
- A framework (e.g., Next.js, Astro, Hugo) — document it here
- Build scripts — list them under **Commands**
- New directories — update **Project Structure**
- Linting/formatting config — note rules under **Code Style**
- CI/CD pipelines — add a **CI/CD** section
