# LinaLab Marketplace

A public-safe Grok Build marketplace for connecting Grok to a local
[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) OpenAI-compatible gateway.

## Install

Install from the published marketplace:

```bash
grok plugin marketplace add https://github.com/islee23520/linalab.git
grok plugin install cliproxy-api-provider --trust
grok plugin enable cliproxy-api-provider
```

For local development, replace the GitHub URL with the checkout path, such as `"$PWD"`. If multiple
marketplace sources expose that plugin name, use the source-qualified identifier shown by
`grok plugin marketplace list`. A direct repository install is also supported:

```bash
grok plugin install https://github.com/islee23520/linalab.git#plugins/cliproxy-api-provider --trust
grok plugin enable cliproxy-api-provider
```

Grok keeps installed plugins disabled by default, so the enable step is required in addition to
`--trust`. Start CLIProxyAPI on `http://127.0.0.1:8317/v1`, set the key named by `envKey`
(default `CLIPROXY_API_KEY`), then run `/cliproxy-sync` or start a new Grok session.

See [the provider README](plugins/cliproxy-api-provider/README.md) for configuration,
status, safety, troubleshooting, and uninstall instructions.

## Development

```bash
bun install
bun test
bun run typecheck
bun run lint
bun run build
grok plugin validate plugins/cliproxy-api-provider
bun run smoke:grok
```

The generated `plugins/cliproxy-api-provider/dist/cli.mjs` is committed so plugin users
only need Node.js, not Bun or a dependency install. Development dependencies are exactly pinned;
the checked-in standalone distribution is the installable artifact.

## License

MIT
