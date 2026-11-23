import { JanusClient } from '@vtex/api'
import type { InstanceOptions, IOContext } from '@vtex/api'

import { adminHeaders } from './adminToken'
import { sourceError } from './errors'

export interface QuoteDocument {
  id: string
  referenceName?: string | null
  status: string
  organization?: string | null
  creationDate?: string | null
  lastUpdate: string
  expirationDate?: string | null
  subtotal?: number | null
  viewedBySales?: boolean | null
}

const FIELDS = [
  'id',
  'referenceName',
  'status',
  'organization',
  'creationDate',
  'lastUpdate',
  'expirationDate',
  'subtotal',
  'viewedBySales',
]

const ENTITY = 'quotes'
const SCHEMA = 'v1.3'

/**
 * B2B Quotes' Master Data entity, read as the Admin user.
 *
 * B2B Quotes' own getQuotes query takes its rights from the shopper's
 * storefront session, so it returns null for Admin users (both 2.9.3 and
 * 4.1.0, tested in the B2B-C15 spike). Reading the entity is the only Admin
 * path. Only this client knows the entity, so it can switch to GraphQL if
 * VTEX adds an Admin query. It never writes.
 *
 * Master Data returns 15 documents unless REST-Range is set, so every call
 * sets it and reads the total from REST-Content-Range.
 */
export class QuotesMasterData extends JanusClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(ctx, {
      ...options,
      headers: { ...options?.headers, Accept: 'application/json' },
    })
  }

  public async search(input: {
    where: string
    sort: string
    size: number
  }): Promise<{ data: QuoteDocument[]; total: number }> {
    // Master Data refuses resources=0-0, so a count-only call (size 0) still
    // asks for two rows and drops them.
    const to = Math.max(input.size, 2) - 1

    const response = await this.http
      .getRaw<QuoteDocument[]>(`/api/dataentities/${ENTITY}/search`, {
        params: {
          _fields: FIELDS.join(','),
          _where: input.where,
          _sort: input.sort,
          _schema: SCHEMA,
        },
        headers: {
          ...adminHeaders(this.context),
          'REST-Range': `resources=0-${to}`,
        },
        metric: 'quotes-md-search',
      })
      .catch((e) => {
        throw sourceError('Quotes (Master Data)', e)
      })

    // REST-Content-Range: resources 0-49/52
    const range = String(response.headers['rest-content-range'] ?? '')
    const total = range.includes('/') ? Number(range.split('/')[1]) : NaN

    return {
      data: input.size === 0 ? [] : response.data,
      total: Number.isNaN(total) ? response.data.length : total,
    }
  }
}
