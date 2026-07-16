import { fetchModelIds } from "./client"
import { ProxyRequestError } from "./errors"
import { readText, writeAtomicWithBackup } from "./files"
import type { Settings } from "./schema"
import { BEGIN_MARKER, buildManagedBlock, END_MARKER, transformConfig } from "./toml"

export type SyncOptions = {
  readonly dryRun: boolean
  readonly force: boolean
}

export type SyncResult =
  | { readonly kind: "dry_run"; readonly content: string; readonly modelCount: number }
  | { readonly kind: "unchanged"; readonly modelCount: number }
  | { readonly kind: "updated"; readonly backup: string | null; readonly modelCount: number }

export type StatusResult = {
  readonly baseUrl: string
  readonly configPath: string
  readonly managed: boolean
  readonly modelCount: number
  readonly reachable: boolean
}

export async function sync(settings: Settings, options: SyncOptions): Promise<SyncResult> {
  const modelIds = await fetchModelIds(settings.baseUrl, settings.apiKey, settings.timeoutMs)
  const current = await readText(settings.configPath)
  const next = transformConfig(current, buildManagedBlock(settings, modelIds))
  if (options.dryRun) return { kind: "dry_run", content: next, modelCount: modelIds.length }
  if (!options.force && next === current) return { kind: "unchanged", modelCount: modelIds.length }
  const backup = await writeAtomicWithBackup(settings.configPath, next, new Date())
  return { kind: "updated", backup, modelCount: modelIds.length }
}

export async function status(settings: Settings): Promise<StatusResult> {
  const current = await readText(settings.configPath)
  let modelCount = 0
  let reachable = false
  try {
    modelCount = (await fetchModelIds(settings.baseUrl, settings.apiKey, settings.timeoutMs)).length
    reachable = true
  } catch (error) {
    if (!(error instanceof ProxyRequestError)) throw error
  }
  return {
    baseUrl: settings.baseUrl,
    configPath: settings.configPath,
    managed: current.includes(BEGIN_MARKER) && current.includes(END_MARKER),
    modelCount,
    reachable,
  }
}
