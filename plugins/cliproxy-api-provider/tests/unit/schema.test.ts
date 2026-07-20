import { describe, expect, test } from "bun:test"
import path from "node:path"
import { ConfigurationError } from "../../src/errors"
import { loadSettings } from "../../src/schema"

const pluginRoot = path.resolve(".")

describe("loadSettings", () => {
  test("Given only XAI_API_KEY When settings load Then the dedicated key is reported missing", async () => {
    // Given
    const environment = {
      CLIPROXY_BASE_URL: "http://127.0.0.1:8317/v1",
      GROK_HOME: "/private/tmp/cliproxy-schema-xai",
      GROK_PLUGIN_ROOT: pluginRoot,
      XAI_API_KEY: "must-not-forward",
    }

    // When
    const operation = loadSettings(environment)

    // Then
    expect(operation).rejects.toBeInstanceOf(ConfigurationError)
    expect(operation).rejects.toThrow("CLIPROXY_API_KEY")
  })

  test("Given CLIPROXY_API_KEY When settings load Then the dedicated key is selected", async () => {
    // Given
    const environment = {
      CLIPROXY_API_KEY: "dedicated-key",
      CLIPROXY_BASE_URL: "http://127.0.0.1:8317/v1",
      GROK_HOME: "/private/tmp/cliproxy-schema-dedicated",
      GROK_PLUGIN_ROOT: pluginRoot,
      XAI_API_KEY: "high-value-key",
    }

    // When
    const settings = await loadSettings(environment)

    // Then
    expect(settings.apiKey).toBe("dedicated-key")
    expect(settings.envKey).toBe("CLIPROXY_API_KEY")
  })

  test("Given remote base URL without opt-in When settings load Then configuration is rejected", async () => {
    // Given
    const environment = {
      CLIPROXY_API_KEY: "dedicated-key",
      CLIPROXY_BASE_URL: "https://proxy.example/v1",
      GROK_HOME: "/private/tmp/cliproxy-schema-remote",
      GROK_PLUGIN_ROOT: pluginRoot,
    }

    // When
    const operation = loadSettings(environment)

    // Then
    expect(operation).rejects.toBeInstanceOf(ConfigurationError)
    expect(operation).rejects.toThrow("allowRemoteBaseUrl")
  })

  test("Given high-value env name When settings load Then configuration is rejected", async () => {
    // Given
    const environment = {
      CLIPROXY_ENV_KEY: "XAI_API_KEY",
      GROK_HOME: "/private/tmp/cliproxy-schema-sensitive",
      GROK_PLUGIN_ROOT: pluginRoot,
      XAI_API_KEY: "must-not-forward",
    }

    // When
    const operation = loadSettings(environment)

    // Then
    expect(operation).rejects.toBeInstanceOf(ConfigurationError)
    expect(operation).rejects.toThrow("CLIPROXY_")
  })
})
