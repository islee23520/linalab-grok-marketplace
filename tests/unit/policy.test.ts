import { describe, expect, test } from "bun:test"
import { modelPolicy } from "../../plugins/cliproxy-api-provider/src/policy"

describe("modelPolicy", () => {
  test("Given grok-4.5 When policy is resolved Then xhigh reasoning is explicit", () => {
    const policy = modelPolicy("grok-4.5")
    expect(policy).toEqual({
      contextWindow: 2_000_000,
      reasoning: { defaultEffort: "xhigh", efforts: ["low", "medium", "high", "xhigh"] },
      supportsBackendSearch: false,
    })
  })

  test("Given a non-reasoning model When policy is resolved Then reasoning is disabled", () => {
    expect(modelPolicy("grok-4.20-0309-non-reasoning").reasoning).toBeNull()
  })
})
