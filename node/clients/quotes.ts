import { MasterData } from '@vtex/api'
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
 * Most rows one call returns. Master Data serves at most 100 per call, and
 * @vtex/api's client asks for pageSize + 1 (its REST-Range end is inclusive).
 */
export const QUOTES_PAGE_SIZE = 99

/**
 * B2B Quotes' Master Data entity, read as the Admin user through @vtex/api's
 * MasterData client (the vtex-io-masterdata skill: no direct REST calls).
 *
 * B2B Quotes' own getQuotes query takes its rights from the shopper's
 * storefront session, so it returns null for Admin users (both 2.9.3 and
 * 4.1.0, tested in the B2B-C15 spike). Reading the entity is the only Admin
 * path. Only this client knows the entity, so it can switch to GraphQL if
 * VTEX adds an Admin query. It never writes.
 *
 * The client sends the app token by default; the Admin user's token replaces
 * it here, so Master Data applies that user's own rights.
 */
export class QuotesMasterData extends MasterData {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(ctx, {
      ...options,
      headers: { ...options?.headers, ...adminHeaders(ctx) },
    })
  }

  /** A page of matching quotes and the full count. size 0 counts only. */
  public async find(input: {
    where: string
    sort: string
    size: number
  }): Promise<{ data: QuoteDocument[]; total: number }> {
    // A size of 1 asks Master Data for rows 0-1, the smallest range it takes.
    const pageSize = Math.min(Math.max(input.size, 1), QUOTES_PAGE_SIZE)

    const result = await this.searchDocumentsWithPaginationInfo<QuoteDocument>({
      dataEntity: ENTITY,
      fields: FIELDS,
      where: input.where,
      sort: input.sort,
      schema: SCHEMA,
      pagination: { page: 1, pageSize },
    }).catch((e) => {
      throw sourceError('Quotes (Master Data)', e)
    })

    return {
      data: input.size === 0 ? [] : result.data.slice(0, pageSize),
      total: Number.isNaN(result.pagination.total)
        ? result.data.length
        : result.pagination.total,
    }
  }
}
