import { homedir } from "node:os"
import path from "node:path"
import { readFileSync, existsSync } from "node:fs"

export type ReasoningPolicy = {
  readonly defaultEffort: "low" | "medium" | "high" | "xhigh" | "max"
  readonly efforts: readonly ("low" | "medium" | "high" | "xhigh" | "none" | "minimal" | "max")[]
}

export type ModelPolicy = {
  readonly contextWindow: number
  readonly reasoning: ReasoningPolicy | null
  readonly supportsBackendSearch: boolean
  readonly source: "catalog" | "catalog-slug" | "heuristic"
}

export type CatalogEntry = {
  readonly reasoning?: boolean
  readonly contextWindow?: number
  readonly maxTokens?: number
  readonly input?: readonly string[]
}

export type ModelCatalog = {
  readonly path: string
  readonly byId: ReadonlyMap<string, CatalogEntry>
  readonly ok: boolean
  readonly updated?: string
}

const DEFAULT_CATALOG = path.join(homedir(), ".agents", "references", "model-catalog.json")

/** Load vendor-docs catalog SSOT (same file pi-proxy-models / agents use). */
export function loadModelCatalog(catalogPath?: string): ModelCatalog {
  const p = expandHome(catalogPath ?? process.env['MODEL_CATALOG'] ?? DEFAULT_CATALOG)
  try {
    if (!existsSync(p)) return { path: p, byId: new Map(), ok: false }
    const json = JSON.parse(readFileSync(p, "utf8")) as {
      updated?: string
      models?: Record<string, CatalogEntry>
    }
    const byId = new Map<string, CatalogEntry>()
    for (const [id, meta] of Object.entries(json.models ?? {})) {
      byId.set(id, meta)
    }
    const result: ModelCatalog = { path: p, byId, ok: true }
    if (typeof json.updated === "string" && json.updated.length > 0) {
      return { ...result, updated: json.updated }
    }
    return result
  } catch {
    return { path: p, byId: new Map(), ok: false }
  }
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2))
  return p
}

function lookup(catalog: ModelCatalog, modelId: string): { entry?: CatalogEntry; source: ModelPolicy["source"] } {
  const direct = catalog.byId.get(modelId)
  if (direct) return { entry: direct, source: "catalog" }
  if (modelId.includes("/")) {
    const slug = modelId.split("/").pop()
    if (slug) {
      const via = catalog.byId.get(slug)
      if (via) return { entry: via, source: "catalog-slug" }
    }
  }
  return { source: "heuristic" }
}

/** Heuristic fallback only when catalog has no entry. Never invent 2M for grok. */
function heuristicContextWindow(modelId: string): number {
  const slug = modelId.includes("/") ? (modelId.split("/").pop() ?? modelId) : modelId
  if (slug.startsWith("gpt-5.3-codex") || slug.startsWith("codex-")) return 256_000
  if (slug.startsWith("gpt-5.") || slug.startsWith("gpt-oss")) return 400_000
  if (slug.startsWith("gpt-image")) return 128_000
  if (slug.includes("gemini")) return 1_048_576
  if (slug.includes("grok-4.5")) return 500_000
  if (slug.includes("grok-4.20") || slug.includes("grok-4.3")) return 1_000_000
  if (slug.includes("grok-build")) return 256_000
  if (slug.includes("kimi-k3")) return 1_048_576
  if (slug.includes("kimi-k2.5") || slug.includes("kimi-k2.6") || slug.includes("kimi-k2.7") || slug.includes("kimi-k2-thinking"))
    return 262_144
  if (slug.includes("kimi-k2")) return 131_072
  if (slug.includes("glm-5.2")) return 1_000_000
  if (slug.includes("glm-4.6") || slug.includes("glm-4.7") || slug.includes("glm-5")) return 200_000
  if (slug.includes("glm-4.5")) return 131_072
  return 200_000
}

function hardDisableReasoning(modelId: string): boolean {
  const slug = modelId.includes("/") ? (modelId.split("/").pop() ?? modelId) : modelId
  if (/(?:image|imagine|video)/i.test(slug)) return true
  if (slug.endsWith("non-reasoning")) return true
  if (slug === "grok-build-0.1" || slug === "grok-composer-2.5-fast") return true
  if (slug.startsWith("codex-auto")) return true
  return false
}

function defaultEffortFor(slug: string): ReasoningPolicy["defaultEffort"] {
  // Product default for flagship Grok through CLIProxy.
  if (slug === "grok-4.5") return "xhigh"
  // Kimi K3 docs: supports low | high | max, default max.
  if (slug === "kimi-k3") return "max"
  if (
    slug === "grok-4.3" ||
    slug === "grok-4.20-0309-reasoning" ||
    slug === "grok-4.20-multi-agent-0309" ||
    slug.startsWith("kimi-k2") ||
    /thinking|reason/i.test(slug)
  ) {
    return "high"
  }
  if (
    slug.endsWith("-mini") ||
    slug.endsWith("-flash") ||
    slug.endsWith("-lite") ||
    slug.endsWith("-low") ||
    slug.endsWith("-air") ||
    slug.endsWith("-turbo") ||
    slug.includes("flash") ||
    slug.includes("ultrafast") ||
    slug.includes("composer")
  ) {
    return "medium"
  }
  return "high"
}

/**
 * Resolve model policy. Prefer ~/.agents/references/model-catalog.json (vendor docs).
 * Catalog reasoning is advisory; hard excludes (image/video/non-reasoning/proxy rejects) win.
 */
export function modelPolicy(modelId: string, catalog: ModelCatalog = loadModelCatalog()): ModelPolicy {
  const slug = modelId.includes("/") ? (modelId.split("/").pop() ?? modelId) : modelId
  const supportsBackendSearch = modelId === "grok-4.20-multi-agent-0309" || slug === "grok-4.20-multi-agent-0309"
  const { entry, source } = lookup(catalog, modelId)

  const contextWindow =
    entry && typeof entry.contextWindow === "number" && entry.contextWindow > 0
      ? entry.contextWindow
      : heuristicContextWindow(modelId)

  if (hardDisableReasoning(modelId)) {
    return { contextWindow, reasoning: null, supportsBackendSearch, source: entry ? source : "heuristic" }
  }

  const catSaysNo = entry?.reasoning === false
  const catSaysYes = entry?.reasoning === true

  const isGpt = slug.startsWith("gpt-5.") || slug.startsWith("gpt-oss")
  const isGrok = slug.startsWith("grok-")
  const isClaude = slug.startsWith("claude-")
  const isGemini = slug.startsWith("gemini-")
  const isGlm = slug.startsWith("glm-")
  const isKimi = slug.startsWith("kimi-") || slug.startsWith("moonshot-")
  const isThinking = /thinking|reason/i.test(slug)
  const family = isGpt || isGrok || isClaude || isGemini || isGlm || isKimi || isThinking

  if (!family && !catSaysYes) {
    return {
      contextWindow,
      reasoning: null,
      supportsBackendSearch,
      source: entry ? source : "heuristic",
    }
  }
  if (catSaysNo && !isThinking) {
    return {
      contextWindow,
      reasoning: null,
      supportsBackendSearch,
      source: entry ? source : "heuristic",
    }
  }

  // Effort vocabularies per backend:
  //   OpenAI/Codex family: none | minimal | low | medium | high | xhigh
  //   Grok reasoning:     low | medium | high | xhigh   (Grok exposes xhigh, not max)
  //   Kimi K3:            low | high | max              (default max; no medium/xhigh)
  //   Claude/Gemini/GLM:   low | medium | high | xhigh  (generic OpenAI-compatible)
  //
  // Default effort follows product policy: flagship Grok through CLIProxy -> xhigh;
  // Kimi K3 -> "max"; lightweight variants -> medium; otherwise high.
  const efforts = isKimi
    ? (["low", "high", "max"] as const)
    : isGpt
      ? (["none", "minimal", "low", "medium", "high", "xhigh"] as const)
      : (["low", "medium", "high", "xhigh"] as const)

  return {
    contextWindow,
    reasoning: { defaultEffort: defaultEffortFor(slug), efforts },
    supportsBackendSearch,
    source: entry ? source : "heuristic",
  }
}
