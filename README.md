# LinaLab Grok Marketplace

A public Grok Build marketplace for connecting Grok to a local
[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) OpenAI-compatible gateway.

## Plugins

| Plugin | Source |
| --- | --- |
| cliproxy-api-provider | [islee23520/cliproxy-api-provider](https://github.com/islee23520/cliproxy-api-provider) (git submodule at `plugins/cliproxy-api-provider`) |

**cliproxy-api-provider** fetches `GET /v1/models` from CLIProxyAPI and maintains one clearly marked
block in the Grok `config.toml`, adding model context windows and explicit reasoning-effort fields
(including `grok-4.5` with default `xhigh`). It exposes `/cliproxy-sync` and `/cliproxy-status`, and
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

> **Submodule note:** This marketplace references its plugin through a git submodule. If
> `grok plugin marketplace add` does not initialize submodules automatically and the plugin appears
> missing, clone with `--recurse-submodules` or run `git submodule update --init` in the marketplace
> checkout before installing.

## Development

```bash
git submodule update --init --recursive
bun install
bun test             # validate marketplace manifests
bun run lint
bun run format:check
```

The plugin itself is developed in its own repository. Update the pinned submodule with:

```bash
git submodule update --remote plugins/cliproxy-api-provider
```

Where the `grok` CLI is available, also run `grok plugin validate` and an isolated local install
smoke test before handoff.

## License

MIT
