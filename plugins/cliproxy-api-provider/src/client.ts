import { ProxyRequestError } from "./errors"
import { ModelCatalogSchema } from "./schema"

export async function fetchModelIds(
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
): Promise<readonly string[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new ProxyRequestError(url, "connection unavailable", { cause: error })
  }
  if (!response.ok) throw new ProxyRequestError(url, `HTTP ${response.status}`)
  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new ProxyRequestError(url, "response was not JSON", { cause: error })
  }
  const parsed = ModelCatalogSchema.safeParse(payload)
  if (!parsed.success) throw new ProxyRequestError(url, "response did not match /v1/models")
  const ids = [...new Set(parsed.data.data.map((model) => model.id))].sort()
  if (ids.length === 0) throw new ProxyRequestError(url, "model catalog was empty")
  return ids
}
