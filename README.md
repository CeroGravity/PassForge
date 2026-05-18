# PassForge

A client-side password strength analyzer. Evaluates password strength, provides
actionable feedback, and checks breach exposure via the Have I Been Pwned
k-anonymity API — all without your password ever leaving the browser.

> **Status:** Phase 0 — project skeleton only. No features implemented yet.

## Quick Start

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

## Project Structure

```
packages/core/         Framework-agnostic analysis logic (TypeScript)
apps/web/              Vite + React SPA
shared/test-vectors/   Language-neutral JSON fixtures
docs/                  Architecture decisions and privacy model
```

## Documentation

- [Architecture Decision Record](docs/adr/0001-architecture.md)
- [Privacy Model](docs/privacy-model.md)

## License

TBD
