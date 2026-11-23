interface HttpError {
  response?: {
    status?: number
    data?: unknown
    headers?: Record<string, unknown>
  }
  message?: string
}

const MAX_DETAIL = 300

/**
 * Turns a failed source call into an error that says which source failed and
 * why, so the panel can show it. Keeps the status and the source's own
 * message; never includes request headers, which carry the user's token.
 */
export function sourceError(source: string, e: unknown): Error {
  const error = e as HttpError
  const status = error.response?.status
  const data = error.response?.data
  let detail = ''

  if (typeof data === 'string') {
    detail = data
  } else if (data && typeof data === 'object') {
    const body = data as {
      message?: unknown
      Message?: unknown
      error?: unknown
    }

    detail = String(
      body.message ?? body.Message ?? body.error ?? JSON.stringify(data)
    )
  }

  const reason = [
    status ? `HTTP ${status}` : error.message,
    detail.slice(0, MAX_DETAIL),
  ]
    .filter(Boolean)
    .join(': ')

  return new Error(`${source} failed (${reason})`)
}
