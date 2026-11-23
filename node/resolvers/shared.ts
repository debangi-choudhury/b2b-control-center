import { UserInputError } from '@vtex/api'

import type { OrganizationSummary } from '../clients/b2bOrganizations'
import { perRequest } from '../domain/concurrency'
import { isSafeId, staleAfterHours } from '../domain/rules'

const ORGANIZATION_PAGE_SIZE = 100
const MAX_ORGANIZATION_PAGES = 10

export interface OrganizationList {
  organizations: OrganizationSummary[]
  truncated: boolean
}

const organizationsOnce = perRequest<OrganizationList>()
const settingsOnce = perRequest<{ staleAfterHours: number }>()

/** Every B2B organization the Admin user can see, read once per request. */
export function organizations(ctx: Context): Promise<OrganizationList> {
  return organizationsOnce(ctx, async () => {
    const all: OrganizationSummary[] = []
    let total = 0

    for (let page = 1; page <= MAX_ORGANIZATION_PAGES; page++) {
      // Sequential on purpose: each page says whether another exists.
      // eslint-disable-next-line no-await-in-loop
      const result = await ctx.clients.b2bOrganizations.organizations(
        page,
        ORGANIZATION_PAGE_SIZE
      )

      all.push(...result.data)
      total = result.total

      if (all.length >= total || result.data.length === 0) {
        break
      }
    }

    return { organizations: all, truncated: all.length < total }
  })
}

/** Organization names by ID. Empty when the list can't be read. */
export async function organizationNames(
  ctx: Context
): Promise<Map<string, string>> {
  try {
    const { organizations: list } = await organizations(ctx)

    return new Map(list.map((o) => [o.id, o.name]))
  } catch (e) {
    ctx.vtex.logger.warn({
      message: 'Organization names unavailable',
      error: (e as Error).message,
    })

    return new Map()
  }
}

export function settings(ctx: Context) {
  return settingsOnce(ctx, async () => {
    const appId = process.env.VTEX_APP_ID as string
    const raw = await ctx.clients.apps.getAppSettings(appId)

    return { staleAfterHours: staleAfterHours(raw) }
  })
}

/** Checks the optional organization filter before it reaches any query. */
export function organizationFilter(id: unknown): string | undefined {
  if (id === undefined || id === null || id === '') {
    return undefined
  }

  if (!isSafeId(id)) {
    throw new UserInputError('Invalid organization ID')
  }

  return id
}
