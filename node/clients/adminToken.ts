import { AuthenticationError } from '@vtex/api'
import type { IOContext } from '@vtex/api'

/**
 * Headers that make a VTEX API act as the Admin user who opened the
 * dashboard, so each source applies that user's own permissions. The app
 * never falls back to its own token. The token stays on the server.
 */
export function adminHeaders(context: IOContext): Record<string, string> {
  const token = context.adminUserAuthToken

  if (!token) {
    throw new AuthenticationError('An admin session is required')
  }

  return {
    VtexIdclientAutCookie: token,
    cookie: `VtexIdclientAutCookie=${token}`,
  }
}
