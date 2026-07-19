# LinaLab Grok Marketplace

Public Grok Build marketplace. Plugins live under `plugins/` as **vendored**
trees (not git submodules). Grok marketplace clones do not initialize
submodules, so vendoring is required for `grok plugin install` to find
`.grok-plugin/plugin.json`.

## Layout

- `marketplace.json` and `.grok-plugin/marketplace.json` — must stay identical
- `plugin-index.json` and `.grok-plugin/plugin-index.json` — must stay identical
- `plugins/cliproxy-api-provider/` — full plugin tree with `.grok-plugin/plugin.json`

## Checks

```bash
bun test
grok plugin validate ./plugins/cliproxy-api-provider
```

Upstream plugin development: https://github.com/islee23520/cliproxy-api-provider
