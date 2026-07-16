# Repository Guide

- Runtime and package manager: Bun. Shipped plugin entrypoint: checked-in standalone Node ESM.
- TypeScript is strict: Zod at file/API/environment boundaries, readonly data, typed errors, no `any`,
  assertions, non-null assertions, ignored diagnostics, enums, or default exports.
- Keep each pure source file at or below 250 nonblank, noncomment lines.
- Add behavior tests first using Given/When/Then. Unit tests cover pure policy/config behavior,
  integration tests use a real local HTTP server, and E2E tests isolate all writes with `GROK_HOME`.
- Never run tests or smoke checks against the real `~/.grok/config.toml`.
- `config.json`, manifests, docs, and test fixtures must contain no private endpoints or credentials.
- Build with `bun run build`; commit `plugins/cliproxy-api-provider/dist/cli.mjs`.
- Before handoff run format, lint, typecheck, tests, build, `grok plugin validate`, and an isolated local
  install smoke test.
