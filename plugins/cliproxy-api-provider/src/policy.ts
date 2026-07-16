export type ReasoningPolicy = {
  readonly defaultEffort: "low" | "medium" | "high" | "xhigh"
  readonly efforts: readonly ("low" | "medium" | "high" | "xhigh" | "none" | "minimal")[]
}

export type ModelPolicy = {
  readonly contextWindow: number
  readonly reasoning: ReasoningPolicy | null
  readonly supportsBackendSearch: boolean
}

const GROK_LARGE = new Set([
  "grok-4.3",
  "grok-4.5",
  "grok-4.20-0309-reasoning",
  "grok-4.20-0309-non-reasoning",
  "grok-4.20-multi-agent-0309",
])

export function modelPolicy(modelId: string): ModelPolicy {
  const contextWindow = contextWindowFor(modelId)
  const supportsBackendSearch = modelId === "grok-4.20-multi-agent-0309"
  if (/(?:image|imagine|video)/i.test(modelId) || modelId.endsWith("non-reasoning")) {
    return { contextWindow, reasoning: null, supportsBackendSearch }
  }
  if (modelId === "grok-build-0.1" || modelId === "grok-composer-2.5-fast") {
    return { contextWindow, reasoning: null, supportsBackendSearch }
  }
  const reasoningFamily = /^(?:gpt-5\.|gpt-oss|grok-|claude-|gemini-|glm-)/.test(modelId)
  if (!reasoningFamily) return { contextWindow, reasoning: null, supportsBackendSearch }
  const efforts = modelId.startsWith("gpt-")
    ? (["none", "minimal", "low", "medium", "high", "xhigh"] as const)
    : (["low", "medium", "high", "xhigh"] as const)
  const lightweight = /(?:mini|flash|lite|low|air|turbo)/.test(modelId)
  const defaultEffort = modelId === "grok-4.5" ? "xhigh" : lightweight ? "medium" : "high"
  return { contextWindow, reasoning: { defaultEffort, efforts }, supportsBackendSearch }
}

function contextWindowFor(modelId: string): number {
  if (modelId.startsWith("gpt-5.3-codex") || modelId.startsWith("codex-")) return 256_000
  if (modelId.startsWith("gpt-5.") || modelId.startsWith("gpt-oss")) return 400_000
  if (modelId.startsWith("gpt-image")) return 128_000
  if (GROK_LARGE.has(modelId)) return 2_000_000
  if (modelId.includes("gemini")) return 1_048_576
  return 200_000
}
