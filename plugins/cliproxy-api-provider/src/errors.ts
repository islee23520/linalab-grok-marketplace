export class ConfigurationError extends Error {
  readonly name = "ConfigurationError"

  constructor(
    readonly detail: string,
    options?: ErrorOptions,
  ) {
    super(`invalid CLIProxy configuration: ${detail}`, options)
  }
}

export class ProxyRequestError extends Error {
  readonly name = "ProxyRequestError"

  constructor(
    readonly url: string,
    readonly detail: string,
    options?: ErrorOptions,
  ) {
    super(`CLIProxy request failed for ${url}: ${detail}`, options)
  }
}

export class ConfigWriteError extends Error {
  readonly name = "ConfigWriteError"

  constructor(
    readonly path: string,
    options?: ErrorOptions,
  ) {
    super(`could not safely write ${path}`, options)
  }
}
