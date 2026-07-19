# LinaLab Grok Marketplace

A public Grok Build marketplace for connecting Grok to a local
[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) OpenAI-compatible gateway.

## Plugins

| Plugin | Source |
| --- | --- |
| cliproxy-api-provider | Vendored at `plugins/cliproxy-api-provider` (source of truth also at [islee23520/cliproxy-api-provider](https://github.com/islee23520/cliproxy-api-provider)) |

**cliproxy-api-provider** fetches `GET /v1/models` from CLIProxyAPI and maintains one clearly marked
block in the Grok `config.toml`, adding model context windows and explicit reasoning-effort fields
(including `grok-4.5` at **500k** context with default `xhigh`; context windows from `~/.agents/references/model-catalog.json`). It exposes `/cliproxy-sync` and `/cliproxy-status`, and
runs a quiet sync on `SessionStart`. See the
[plugin README](https://github.com/islee23520/cliproxy-api-provider) for configuration, write safety,
and troubleshooting.

## Install

```bash
grok plugin marketplace add https://github.com/islee23520/linalab-grok-marketplace.git
grok plugin install cliproxy-api-provider --trust
grok plugin enable cliproxy-api-provider
```

Start CLIProxyAPI on `http://127.0.0.1:8317/v1`, set `CLIPROXY_API_KEY`, then run
`/cliproxy-sync` or start a new Grok session. See the
[plugin README](https://github.com/islee23520/cliproxy-api-provider) for configuration, status,
safety, and troubleshooting details.


## Development

```bash
bun install
bun test             # validate marketplace manifests
bun run lint
bun run format:check
```

The plugin is **vendored** under `plugins/cliproxy-api-provider` (Grok marketplace
clones do not initialize git submodules, so a submodule left the install path empty).

Upstream development repo: https://github.com/islee23520/cliproxy-api-provider  
To refresh the vendored copy after a plugin release:

```bash
rsync -a --delete --exclude .git --exclude node_modules \
  /path/to/cliproxy-api-provider/ plugins/cliproxy-api-provider/
# keep marketplace.json + .grok-plugin/marketplace.json versions in sync
```

Where the `grok` CLI is available:

```bash
grok plugin validate ./plugins/cliproxy-api-provider
grok plugin install ./plugins/cliproxy-api-provider --trust
```

## License

MIT
