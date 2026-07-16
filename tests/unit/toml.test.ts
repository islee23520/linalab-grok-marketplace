import { describe, expect, test } from "bun:test"
import { buildManagedBlock, transformConfig } from "../../plugins/cliproxy-api-provider/src/toml"

const settings = {
  apiBackend: "chat_completions",
  baseUrl: "http://127.0.0.1:8317/v1",
  defaultModel: "grok-4.5",
  defaultReasoningEffort: "xhigh",
  envKey: "CLIPROXY_API_KEY",
  webSearch: "grok-4.20-multi-agent-0309",
} as const

describe("transformConfig", () => {
  test("Given user config and legacy blocks When transformed Then user content survives and legacy is removed", () => {
    const current = [
      "[ui]",
      'screen_mode = "minimal"',
      "# >>> ocx-models-plugin managed begin",
      "discard = true",
      "# >>> ocx-models-plugin managed end",
      "",
    ].join("\n")
    const result = transformConfig(current, buildManagedBlock(settings, ["grok-4.5"]))
    expect(result).toContain('[ui]\nscreen_mode = "minimal"')
    expect(result).not.toContain("ocx-models-plugin")
  })

  test("Given an existing current block When transformed again Then the text is unchanged", () => {
    const block = buildManagedBlock(settings, ["grok-4.5"])
    const once = transformConfig("", block)
    expect(transformConfig(once, block)).toBe(once)
  })

  test("Given provider-owned standalone tables When transformed Then only identified tables are removed", () => {
    const current = [
      "[endpoints]",
      'models_base_url = "http://127.0.0.1:8317/v1"',
      "",
      "[models]",
      'default = "grok-4.5"',
      'default_reasoning_effort = "xhigh"',
      "",
      "[subagents.models]",
      'default = "grok-4.5"',
      'sisyphus = "grok-4.5"',
      "",
      "[theme]",
      'name = "midnight"',
      "",
      "[endpoints.custom]",
      'models_base_url = "https://example.invalid/v1"',
      "",
    ].join("\n")
    const result = transformConfig(current, buildManagedBlock(settings, ["grok-4.5"]))
    expect(result.match(/^\[endpoints\]$/gm)).toHaveLength(1)
    expect(result.match(/^\[models\]$/gm)).toHaveLength(1)
    expect(result.match(/^\[subagents\.models\]$/gm)).toHaveLength(1)
    expect(result).toContain('[theme]\nname = "midnight"')
    expect(result).toContain('[endpoints.custom]\nmodels_base_url = "https://example.invalid/v1"')
  })

  test("Given standard tables with unrelated keys When transformed Then keys survive without duplicate headers", () => {
    // Given
    const current = [
      "[endpoints]",
      'models_base_url = "https://old.invalid/v1"',
      'telemetry_url = "https://telemetry.example/v1"',
      "",
      "[models]",
      'default = "user-model"',
      "temperature = 0.25",
      "",
      "[subagents.models]",
      'default = "user-agent-model"',
      'reviewer = "review-model"',
      "",
      "[[models.routes]]",
      'match = "special-*"',
      'model = "special-model"',
      "",
    ].join("\n")

    // When
    const result = transformConfig(current, buildManagedBlock(settings, ["grok-4.5"]))

    // Then
    expect(result.match(/^\[endpoints\]$/gm)).toHaveLength(1)
    expect(result.match(/^\[models\]$/gm)).toHaveLength(1)
    expect(result.match(/^\[subagents\.models\]$/gm)).toHaveLength(1)
    expect(result).toContain('telemetry_url = "https://telemetry.example/v1"')
    expect(result).toContain("temperature = 0.25")
    expect(result).toContain('reviewer = "review-model"')
    expect(result).toContain('[[models.routes]]\nmatch = "special-*"\nmodel = "special-model"')
  })

  test("Given reasoning model When block is built Then Grok override fields are emitted", () => {
    const block = buildManagedBlock(settings, ["grok-4.5"])

    // Then
    expect(block).toContain("supports_reasoning_effort = true")
    expect(block).toContain('reasoning_effort = "xhigh"')
    expect(block).toContain('reasoning_efforts = ["low", "medium", "high", "xhigh"]')
  })

  test("Given catalog omits configured models When block is built Then defaults remain reachable", () => {
    // When
    const block = buildManagedBlock(settings, ["alpha-model"])

    // Then
    expect(block).toContain('[model."grok-4.5"]')
    expect(block).toContain('[model."grok-4.20-multi-agent-0309"]')
    expect(block).toContain("supports_backend_search = true")
  })
})
