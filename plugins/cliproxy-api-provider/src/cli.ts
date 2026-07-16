import path from "node:path"
import { realpath } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { ConfigurationError, ProxyRequestError } from "./errors"
import { loadSettings } from "./schema"
import { type SyncResult, status, sync } from "./service"

const CommandSchema = z.enum(["sync", "status", "help"])
type CliOptions = {
  readonly command: z.infer<typeof CommandSchema>
  readonly dryRun: boolean
  readonly force: boolean
  readonly hook: boolean
  readonly json: boolean
}

export async function run(
  argv: readonly string[],
  environment: NodeJS.ProcessEnv,
): Promise<number> {
  const options = parseArguments(argv)
  if (options.command === "help") {
    process.stdout.write(usage())
    return 0
  }
  const settings = await loadSettings(environment)
  if (options.command === "status") {
    const result = await status(settings)
    process.stdout.write(
      options.json
        ? `${JSON.stringify(result, null, 2)}\n`
        : `${[
            `proxy: ${result.reachable ? "reachable" : "unavailable"} (${result.baseUrl})`,
            `models: ${result.modelCount}`,
            `config: ${result.managed ? "managed" : "not managed"} (${result.configPath})`,
          ].join("\n")}\n`,
    )
    return result.reachable ? 0 : 1
  }
  const result = await sync(settings, { dryRun: options.dryRun, force: options.force })
  printSyncResult(result, settings.configPath, options.hook)
  return 0
}

function parseArguments(argv: readonly string[]): CliOptions {
  const commandCandidate = argv[0]?.startsWith("-") === false ? argv[0] : "sync"
  const parsedCommand = CommandSchema.safeParse(
    commandCandidate === "--help" ? "help" : commandCandidate,
  )
  if (!parsedCommand.success) throw new ConfigurationError(`unknown command: ${commandCandidate}`)
  const flags = new Set(argv.filter((value) => value.startsWith("--")))
  const allowed = new Set(["--dry-run", "--force", "--help", "--hook", "--json"])
  const invalid = [...flags].find((flag) => !allowed.has(flag))
  if (invalid !== undefined) throw new ConfigurationError(`unknown option: ${invalid}`)
  return {
    command: flags.has("--help") ? "help" : parsedCommand.data,
    dryRun: flags.has("--dry-run"),
    force: flags.has("--force"),
    hook: flags.has("--hook"),
    json: flags.has("--json"),
  }
}

function printSyncResult(result: SyncResult, configPath: string, hook: boolean): void {
  if (hook) return
  switch (result.kind) {
    case "dry_run":
      process.stdout.write(result.content)
      return
    case "unchanged":
      process.stderr.write(`cliproxy: unchanged (${result.modelCount} models)\n`)
      return
    case "updated":
      process.stderr.write(`cliproxy: synced ${result.modelCount} models to ${configPath}\n`)
      if (result.backup !== null) process.stderr.write(`cliproxy: backup ${result.backup}\n`)
      return
  }
}

function usage(): string {
  return "Usage: cliproxy-provider <sync|status> [--dry-run] [--force] [--hook] [--json]\n"
}

const entrypoint = process.argv[1]
const isMain =
  entrypoint !== undefined &&
  (await realpath(path.resolve(entrypoint))) === (await realpath(fileURLToPath(import.meta.url)))

if (isMain) {
  try {
    process.exitCode = await run(process.argv.slice(2), process.env)
  } catch (error) {
    if (process.argv.includes("--hook") && error instanceof ProxyRequestError) process.exitCode = 0
    else if (error instanceof Error) {
      process.stderr.write(`cliproxy: ${error.message}\n`)
      process.exitCode = 1
    } else throw error
  }
}
