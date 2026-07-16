import { describe, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import { z } from "zod"

const ComponentSchema = z
  .object({ name: z.string().min(1), description: z.string().optional() })
  .strict()
const PluginIndexSchema = z
  .object({
    version: z.literal(1),
    plugins: z.record(
      z.string(),
      z
        .object({
          components: z
            .object({
              commands: z.array(ComponentSchema),
              hooks: z.array(ComponentSchema),
            })
            .strict(),
        })
        .strict(),
    ),
  })
  .strict()

describe("plugin index", () => {
  test("Given both marketplace indexes When parsed Then they match Grok component inventory", async () => {
    // Given
    const rootText = await readFile("plugin-index.json", "utf8")
    const hiddenText = await readFile(".grok-plugin/plugin-index.json", "utf8")

    // When
    const index = PluginIndexSchema.parse(JSON.parse(rootText))

    // Then
    expect(hiddenText).toBe(rootText)
    expect(index.plugins["cliproxy-api-provider"]?.components).toEqual({
      commands: [
        {
          name: "cliproxy-status",
          description: "Show CLIProxyAPI connectivity and Grok managed-config status",
        },
        {
          name: "cliproxy-sync",
          description: "Sync CLIProxyAPI models and Grok reasoning policies",
        },
      ],
      hooks: [{ name: "SessionStart" }],
    })
  })
})
