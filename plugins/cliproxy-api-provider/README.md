# CLIProxyAPI Provider

This Grok Build plugin fetches `GET /v1/models` from CLIProxyAPI and maintains one
clearly marked block in the Grok `config.toml`. It adds model context windows and explicit
reasoning fields, including `grok-4.5` with default `xhigh` effort.

**Context windows** come from the shared SSOT
`~/.agents/references/model-catalog.json` (override with `catalogPath` /
`MODEL_CATALOG`). Live model **ids** still come from CLIProxy `GET /v1/models`.
This matches [pi-proxy-models](https://github.com/victormilk/pi-proxy-models) so
pi and Grok stay aligned on grok-4.5 (500k), glm-5.2 (1M), kimi-k3 (1M), etc.


This repository is the plugin source; it is distributed through the
[LinaLab Grok Marketplace](https://github.com/islee23520/linalab-grok-marketplace), where it is
pinned as a git submodule.

## Install

Install from the marketplace:

```bash
grok plugin marketplace add https://github.com/islee23520/linalab-grok-marketplace.git
grok plugin install cliproxy-api-provider --trust
grok plugin enable cliproxy-api-provider
```

Or install directly from this repository:

```bash
grok plugin install https://github.com/islee23520/cliproxy-api-provider.git --trust
grok plugin enable cliproxy-api-provider
```

Grok keeps installed plugins disabled by default, so the `enable` step is required in addition to
`--trust`. Start CLIProxyAPI on `http://127.0.0.1:8317/v1` and set `CLIPROXY_API_KEY`, then run
`/cliproxy-sync` or start a new Grok session.

## Commands

```bash
/cliproxy-sync
/cliproxy-sync --dry-run
/cliproxy-sync --force
/cliproxy-status
/cliproxy-status --json
```

After installation, enable the plugin with `grok plugin enable cliproxy-api-provider`; trust and
enablement are separate Grok controls. `SessionStart` then runs a quiet sync. If the proxy is
unavailable, that hook exits successfully without changing the config. Manual sync reports the
connection failure.

## Configuration

Defaults live in `config.json`. Override them without changing the installed plugin by creating
`$GROK_HOME/plugin-data/cliproxy-api-provider/config.json` (normally
`~/.grok/plugin-data/cliproxy-api-provider/config.json`). Unknown fields are rejected.

| JSON field | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://127.0.0.1:8317/v1` | OpenAI-compatible API base |
| `allowRemoteBaseUrl` | `false` | Explicitly allow a non-loopback API base |
| `envKey` | `CLIPROXY_API_KEY` | Dedicated `CLIPROXY_` environment variable for the bearer key |
| `defaultModel` | `grok-4.5` | Grok default model |
| `webSearch` | `grok-4.20-multi-agent-0309` | Backend-search model |
| `defaultReasoningEffort` | `xhigh` | Default Grok effort |
| `apiBackend` | `chat_completions` | Grok backend adapter |
| `timeoutMs` | `4000` | Model-catalog timeout |

Environment overrides: `CLIPROXY_BASE_URL`, `CLIPROXY_API_KEY`, `CLIPROXY_ENV_KEY`,
`CLIPROXY_TIMEOUT_MS`, `MODEL_CATALOG`, `GROK_HOME`, `GROK_CONFIG`, `GROK_PLUGIN_DATA`, and
`GROK_PLUGIN_ROOT`. The variable named by `envKey` must contain a non-empty value and its name must
start with `CLIPROXY_`; high-value provider variables such as `XAI_API_KEY` cannot be selected.
Non-loopback URLs require `allowRemoteBaseUrl: true`, and catalog requests refuse HTTP redirects so
the bearer credential cannot follow a redirect to another origin. No credential is stored in this
repository or written to `config.toml`.

`supports_reasoning_effort`, `reasoning_effort`, and `reasoning_efforts` are current Grok model
override fields verified through runtime `/effort` selection and the resulting sampling request.
User-guide coverage may lag the runtime behavior.

## Write safety

- Only blocks between the provider markers and known legacy `ocx-models-plugin` markers are removed.
- Provider-owned keys are replaced inside existing `[endpoints]`, `[models]`, and
  `[subagents.models]` tables; unrelated keys, nested routes, comments, and other tables survive.
- Configured default and web-search models always receive `[model.*]` entries, even if the proxy
  omits them from `/v1/models`, so Grok can still route those configured roles.
- Standard table headers are consolidated so the resulting TOML contains at most one of each.
- A changed existing config gets a timestamped backup next to the original.
- Writes use a same-directory temporary file, file sync, atomic rename, and directory sync.
- An unchanged normal sync is a no-op. `--force` intentionally creates a fresh write and backup.
- `--dry-run` prints the complete proposed config and writes nothing.

## Troubleshooting

- `proxy: unavailable`: verify CLIProxyAPI is listening and the bearer key matches its setup.
- Missing key: set `CLIPROXY_API_KEY` or the explicitly configured variable named by `envKey`.
- `HTTP 401/403`: verify that dedicated key matches the CLIProxyAPI configuration.
- Invalid JSON: fix the user override; strict parsing rejects typos instead of silently ignoring them.
- Duplicate standard TOML tables are consolidated automatically while preserving unrelated fields.

## Uninstall

```bash
grok plugin uninstall cliproxy-api-provider
```

Uninstalling does not edit user configuration. Remove the block from
`~/.grok/config.toml` between:

```text
# >>> CLIProxyAPIProvider managed begin
# >>> CLIProxyAPIProvider managed end
```

Also remove the provider-owned `models_base_url` assignment from `[endpoints]`; `default`,
`web_search`, and `default_reasoning_effort` from `[models]`; and `default` and `sisyphus` from
`[subagents.models]`. Leave every unrelated key and nested table in place.

Backups and plugin data may then be deleted manually if no longer needed.

## Development

```bash
bun install
bun test             # unit, integration, and e2e (isolated GROK_HOME)
bun run typecheck
bun run lint
bun run format:check
bun run build        # regenerate dist/cli.mjs
```

The standalone distribution `dist/cli.mjs` is committed so plugin users only need Node.js, not Bun.
Recommit it after rebuilding. Development dependencies are exactly pinned. Where the `grok` CLI is
available, run `grok plugin validate .` and an isolated local install smoke test before handoff.

## License

MIT
