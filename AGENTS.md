# Repository Guide

- This is a Grok Build marketplace catalog. Plugin source lives in the
  `plugins/cliproxy-api-provider` git submodule, developed in
  https://github.com/islee23520/cliproxy-api-provider.
- Marketplace manifests: `marketplace.json`, `plugin-index.json`, and their `.grok-plugin/` copies
  must stay identical in pairs and must reflect the plugin's real components.
- `config.json`, manifests, docs, and test fixtures must contain no private endpoints or credentials.
- Validate with `bun test` (manifest consistency), `bun run lint`, `bun run format:check`, and
  `grok plugin validate` plus an isolated local install smoke test where the `grok` CLI is available.
- After checkout, initialize the submodule: `git submodule update --init --recursive`.
- Keep checked-in JSON valid; no `any`, assertions, non-null assertions, or default exports in TS.
