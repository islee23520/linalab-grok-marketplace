import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { ConfigurationError } from "./errors"

const ReasoningEffortSchema = z.enum(["low", "medium", "high", "xhigh"])
const ApiKeySchema = z.string().refine((value) => value.trim().length > 0)
const PluginConfigSchema = z
  .object({
    apiBackend: z.string().min(1).default("chat_completions"),
    allowRemoteBaseUrl: z.boolean().default(false),
    baseUrl: z.url().optional(),
    configPath: z.string().min(1).optional(),
    defaultModel: z.string().min(1).default("grok-4.5"),
    defaultReasoningEffort: ReasoningEffortSchema.default("xhigh"),
    envKey: z
      .string()
      .regex(/^[A-Z_][A-Z0-9_]*$/)
      .default("CLIPROXY_API_KEY"),
    timeoutMs: z.number().int().min(100).max(60_000).default(4_000),
    webSearch: z.string().min(1).default("grok-4.20-multi-agent-0309"),
    catalogPath: z.string().min(1).optional(),
  })
  .strict()

const EnvironmentSchema = z
  .object({
    CLIPROXY_API_KEY: z.string().min(1).optional(),
    CLIPROXY_BASE_URL: z.url().optional(),
    CLIPROXY_ENV_KEY: z
      .string()
      .regex(/^[A-Z_][A-Z0-9_]*$/)
      .optional(),
    CLIPROXY_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).optional(),
    GROK_CONFIG: z.string().min(1).optional(),
    GROK_HOME: z.string().min(1).optional(),
    GROK_PLUGIN_DATA: z.string().min(1).optional(),
    GROK_PLUGIN_ROOT: z.string().min(1).optional(),
    MODEL_CATALOG: z.string().min(1).optional(),
  })
  .loose()

export type Settings = Omit<Readonly<z.infer<typeof PluginConfigSchema>>, "baseUrl"> & {
  readonly baseUrl: string
  readonly apiKey: string
  readonly configPath: string
  readonly dataPath: string
  readonly pluginRoot: string
}

export async function loadSettings(environment: NodeJS.ProcessEnv): Promise<Settings> {
  const parsedEnvironment = EnvironmentSchema.safeParse(environment)
  if (!parsedEnvironment.success)
    throw new ConfigurationError(z.prettifyError(parsedEnvironment.error))
  const env = parsedEnvironment.data
  const grokHome = env.GROK_HOME ?? path.join(homedir(), ".grok")
  const pluginRoot =
    env.GROK_PLUGIN_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const dataPath =
    env.GROK_PLUGIN_DATA ?? path.join(grokHome, "plugin-data", "cliproxy-api-provider")
  const candidates = [path.join(dataPath, "config.json"), path.join(pluginRoot, "config.json")]
  let fileConfig: unknown = {}
  for (const candidate of candidates) {
    try {
      fileConfig = JSON.parse(await readFile(candidate, "utf8"))
      break
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue
      throw new ConfigurationError(`cannot parse ${candidate}`, { cause: error })
    }
  }
  const parsed = PluginConfigSchema.safeParse(fileConfig)
  if (!parsed.success) throw new ConfigurationError(z.prettifyError(parsed.error))
  const config = parsed.data
  const baseUrl = env.CLIPROXY_BASE_URL ?? config.baseUrl
  if (!baseUrl) {
    throw new ConfigurationError(
      "baseUrl must be set in config.json or via CLIPROXY_BASE_URL environment variable",
    )
  }
  const hostname = new URL(baseUrl).hostname
  const loopback = hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost"
  if (!loopback && !config.allowRemoteBaseUrl)
    throw new ConfigurationError("remote baseUrl requires allowRemoteBaseUrl = true")
  const envKey = env.CLIPROXY_ENV_KEY ?? config.envKey
  if (!envKey.startsWith("CLIPROXY_"))
    throw new ConfigurationError("envKey must use a dedicated CLIPROXY_ environment variable")
  const parsedApiKey = ApiKeySchema.safeParse(environment[envKey])
  if (!parsedApiKey.success)
    throw new ConfigurationError(`environment variable ${envKey} must be set to a non-empty value`)
  return {
    ...config,
    apiKey: parsedApiKey.data,
    baseUrl,
    configPath: env.GROK_CONFIG ?? config.configPath ?? path.join(grokHome, "config.toml"),
    dataPath,
    envKey,
    pluginRoot,
    timeoutMs: env.CLIPROXY_TIMEOUT_MS ?? config.timeoutMs,
    catalogPath: env.MODEL_CATALOG ?? config.catalogPath,
  }
}

export const ModelCatalogSchema = z
  .object({ data: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9._:/-]+$/) })) })
  .loose()
