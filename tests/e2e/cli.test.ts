import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

let server: ReturnType<typeof Bun.serve> | undefined
let home: string | undefined

afterEach(async () => {
  server?.stop(true)
  if (home !== undefined) await rm(home, { force: true, recursive: true })
})

describe("cliproxy CLI", () => {
  test("Given a symlinked installed CLI When help runs Then the entrypoint executes", async () => {
    // Given
    home = await mkdtemp(path.join(tmpdir(), "cliproxy-installed-"))
    const installedCli = path.join(home, "cliproxy-provider.mjs")
    await symlink(path.resolve("plugins/cliproxy-api-provider/dist/cli.mjs"), installedCli)

    // When
    const result = Bun.spawnSync(["node", installedCli, "--help"])

    // Then
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toStartWith("Usage: cliproxy-provider")
  })

  test("Given isolated GROK_HOME When sync runs twice Then config changes once and backup is not duplicated", async () => {
    home = await mkdtemp(path.join(tmpdir(), "cliproxy-e2e-"))
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 41_322,
      fetch: () => Response.json({ data: [{ id: "grok-4.5" }] }),
    })
    const env = {
      ...process.env,
      CLIPROXY_API_KEY: "test-key",
      CLIPROXY_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
      GROK_HOME: home,
    }
    const first = Bun.spawn(["bun", "run", "plugins/cliproxy-api-provider/src/cli.ts", "sync"], {
      env,
      stderr: "pipe",
    })
    expect(await first.exited).toBe(0)
    const configPath = path.join(home, "config.toml")
    const firstText = await readFile(configPath, "utf8")
    const second = Bun.spawn(["bun", "run", "plugins/cliproxy-api-provider/src/cli.ts", "sync"], {
      env,
      stderr: "pipe",
    })
    expect(await second.exited).toBe(0)
    expect(await readFile(configPath, "utf8")).toBe(firstText)
    expect(await new Response(second.stderr).text()).toContain("unchanged")
  })

  test("Given unavailable proxy When SessionStart sync runs Then it exits successfully without config", async () => {
    home = await mkdtemp(path.join(tmpdir(), "cliproxy-hook-"))
    const result = Bun.spawnSync(
      ["bun", "run", "plugins/cliproxy-api-provider/src/cli.ts", "sync", "--hook"],
      {
        env: {
          ...process.env,
          CLIPROXY_API_KEY: "test-key",
          CLIPROXY_BASE_URL: "http://127.0.0.1:1/v1",
          GROK_HOME: home,
        },
      },
    )
    expect(result.exitCode).toBe(0)
    expect(await Bun.file(path.join(home, "config.toml")).exists()).toBe(false)
  })

  test("Given only XAI_API_KEY When sync runs Then no credential is forwarded", async () => {
    // Given
    home = await mkdtemp(path.join(tmpdir(), "cliproxy-xai-key-"))
    let requestCount = 0
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 41_323,
      fetch: () => {
        requestCount += 1
        return Response.json({ data: [{ id: "grok-4.5" }] })
      },
    })
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key !== "CLIPROXY_API_KEY" && key !== "CLIPROXY_ENV_KEY",
      ),
    )

    // When
    const result = Bun.spawn(["bun", "run", "plugins/cliproxy-api-provider/src/cli.ts", "sync"], {
      env: {
        ...environment,
        CLIPROXY_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
        GROK_HOME: home,
        XAI_API_KEY: "must-not-forward",
      },
      stderr: "pipe",
    })

    // Then
    expect(await result.exited).toBe(1)
    expect(requestCount).toBe(0)
    expect(await new Response(result.stderr).text()).toContain("CLIPROXY_API_KEY")
  })

  test("Given CLIPROXY_API_KEY When sync runs Then the dedicated credential is forwarded", async () => {
    // Given
    home = await mkdtemp(path.join(tmpdir(), "cliproxy-dedicated-key-"))
    let authorization: string | null = null
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 41_324,
      fetch: (request) => {
        authorization = request.headers.get("authorization")
        return Response.json({ data: [{ id: "grok-4.5" }] })
      },
    })

    // When
    const result = Bun.spawn(["bun", "run", "plugins/cliproxy-api-provider/src/cli.ts", "sync"], {
      env: {
        ...process.env,
        CLIPROXY_API_KEY: "dedicated-key",
        CLIPROXY_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
        GROK_HOME: home,
        XAI_API_KEY: "high-value-key",
      },
    })

    // Then
    expect(await result.exited).toBe(0)
    expect(authorization).toBe("Bearer dedicated-key")
  })
})
