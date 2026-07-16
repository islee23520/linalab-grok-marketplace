import { afterEach, describe, expect, test } from "bun:test"
import { fetchModelIds } from "../../plugins/cliproxy-api-provider/src/client"

let server: ReturnType<typeof Bun.serve> | undefined

afterEach(() => server?.stop(true))

describe("fetchModelIds", () => {
  test("Given an OpenAI models endpoint When fetched Then ids are parsed, unique, and sorted", async () => {
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 41_321,
      fetch: () => Response.json({ data: [{ id: "grok-4.5" }, { id: "alpha" }, { id: "alpha" }] }),
    })
    const ids = await fetchModelIds(`http://127.0.0.1:${server.port}/v1`, "secret", 1_000)
    expect(ids).toEqual(["alpha", "grok-4.5"])
  })

  test("Given a redirecting endpoint When fetched Then authorization is not redirected", async () => {
    // Given
    let redirectedAuthorization: string | null = null
    const target = Bun.serve({
      hostname: "127.0.0.1",
      port: 41_320,
      fetch: (request) => {
        redirectedAuthorization = request.headers.get("authorization")
        return Response.json({ data: [{ id: "grok-4.5" }] })
      },
    })
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: 41_321,
      fetch: () => Response.redirect(`http://127.0.0.1:${target.port}/v1/models`),
    })

    // When
    const operation = fetchModelIds(`http://127.0.0.1:${server.port}/v1`, "secret", 1_000)

    // Then
    await expect(operation).rejects.toThrow("HTTP 302")
    expect(redirectedAuthorization).toBeNull()
    target.stop(true)
  })
})
