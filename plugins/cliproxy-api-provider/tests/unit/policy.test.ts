import { describe, expect, test } from "bun:test"
import { modelPolicy, type ModelCatalog, type CatalogEntry } from "../../src/policy"

function catalogOf(entries: Record<string, CatalogEntry>): ModelCatalog {
  return {
    path: "test-catalog.json",
    byId: new Map(Object.entries(entries)),
    ok: true,
    updated: "test",
  }
}

const REALISTIC = catalogOf({
  "grok-4.5": { reasoning: true, contextWindow: 500_000 },
  "grok-4.3": { reasoning: true, contextWindow: 1_000_000 },
  "grok-4.20-0309-non-reasoning": { reasoning: false, contextWindow: 1_000_000 },
  "grok-build-0.1": { reasoning: false, contextWindow: 256_000 },
  "glm-5.2": { reasoning: true, contextWindow: 1_000_000 },
  "z-ai/glm-5.2-ultrafast": { reasoning: true, contextWindow: 1_000_000 },
  "kimi-k3": { reasoning: true, contextWindow: 1_048_576 },
  "kimi-k2": { reasoning: false, contextWindow: 131_072 },
})

describe("modelPolicy", () => {
  test("Given grok-4.5 from catalog When policy is resolved Then 500k + xhigh reasoning", () => {
    const policy = modelPolicy("grok-4.5", REALISTIC)
    expect(policy).toEqual({
      contextWindow: 500_000,
      reasoning: { defaultEffort: "xhigh", efforts: ["low", "medium", "high", "xhigh"] },
      supportsBackendSearch: false,
      source: "catalog",
    })
  })

  test("Given a non-reasoning model When policy is resolved Then reasoning is disabled", () => {
    expect(modelPolicy("grok-4.20-0309-non-reasoning", REALISTIC).reasoning).toBeNull()
  })

  test("Given glm-5.2 from catalog When policy is resolved Then 1M context", () => {
    const policy = modelPolicy("glm-5.2", REALISTIC)
    expect(policy.contextWindow).toBe(1_000_000)
    expect(policy.reasoning?.defaultEffort).toBe("high")
    expect(policy.source).toBe("catalog")
  })

  test("Given z-ai/glm-5.2-ultrafast When policy is resolved Then catalog hit", () => {
    const policy = modelPolicy("z-ai/glm-5.2-ultrafast", REALISTIC)
    expect(policy.contextWindow).toBe(1_000_000)
    expect(policy.source).toBe("catalog")
  })

  test("Given kimi-k3 from catalog When policy is resolved Then 1M + reasoning", () => {
    const policy = modelPolicy("kimi-k3", REALISTIC)
    expect(policy.contextWindow).toBe(1_048_576)
    expect(policy.reasoning).not.toBeNull()
    expect(policy.source).toBe("catalog")
  })

  test("Given kimi-k2 catalog reasoning=false When policy is resolved Then reasoning disabled", () => {
    expect(modelPolicy("kimi-k2", REALISTIC).reasoning).toBeNull()
  })

  test("Given grok-build-0.1 When policy is resolved Then reasoning disabled even if docs say yes", () => {
    expect(modelPolicy("grok-build-0.1", REALISTIC).reasoning).toBeNull()
    expect(modelPolicy("grok-build-0.1", REALISTIC).contextWindow).toBe(256_000)
  })

  test("Given empty catalog When grok-4.5 resolves Then heuristic 500k not 2M", () => {
    const empty: ModelCatalog = { path: "none", byId: new Map(), ok: false }
    const policy = modelPolicy("grok-4.5", empty)
    expect(policy.contextWindow).toBe(500_000)
    expect(policy.source).toBe("heuristic")
  })
})
