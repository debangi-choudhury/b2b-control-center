import { AppGraphQLClient } from '@vtex/api'
import type { InstanceOptions, IOContext } from '@vtex/api'

import { adminHeaders } from './adminToken'
import { sourceError } from './errors'

export interface Pagination {
  total: number
  page: number
  pageSize: number
}

export interface OrganizationSummary {
  id: string
  name: string
  status?: string | null
}

export interface OrganizationRequestSummary {
  id: string
  name: string
  tradeName?: string | null
  status: string
  created: string
}

const ORGANIZATIONS = `query Organizations($status: [String], $page: Int, $pageSize: Int) {
  getOrganizations(status: $status, page: $page, pageSize: $pageSize, sortOrder: "ASC", sortedBy: "name") {
    data { id name status }
    pagination { total page pageSize }
  }
}`

const REQUESTS = `query Requests($status: [String], $page: Int, $pageSize: Int) {
  getOrganizationRequests(status: $status, page: $page, pageSize: $pageSize, sortOrder: "ASC", sortedBy: "created") {
    data { id name tradeName status created }
    pagination { total page pageSize }
  }
}`

interface Page<T> {
  data: T[] | null
  pagination: Pagination | null
}

/**
 * B2B Organizations' GraphQL API (2.8.7 in b2bdev and b2btest), read as the
 * Admin user. It refuses the app token, so the dashboard can't see more than
 * the user can see in B2B Organizations.
 */
export class B2BOrganizations extends AppGraphQLClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super('vtex.b2b-organizations-graphql@2.x', ctx, options)
  }

  public async organizations(page: number, pageSize: number) {
    const result = await this.graphql
      .query<
        { getOrganizations: Page<OrganizationSummary> | null },
        { status: string[]; page: number; pageSize: number }
      >(
        {
          query: ORGANIZATIONS,
          variables: {
            status: ['active', 'on-hold', 'inactive'],
            page,
            pageSize,
          },
        },
        { headers: adminHeaders(this.context), metric: 'b2b-org-organizations' }
      )
      .catch((e) => {
        throw sourceError('B2B Organizations', e)
      })

    return pageOf(result.data?.getOrganizations)
  }

  public async pendingRequests(page: number, pageSize: number) {
    const result = await this.graphql
      .query<
        { getOrganizationRequests: Page<OrganizationRequestSummary> | null },
        { status: string[]; page: number; pageSize: number }
      >(
        {
          query: REQUESTS,
          variables: { status: ['pending'], page, pageSize },
        },
        { headers: adminHeaders(this.context), metric: 'b2b-org-requests' }
      )
      .catch((e) => {
        throw sourceError('B2B Organizations', e)
      })

    return pageOf(result.data?.getOrganizationRequests)
  }
}

function pageOf<T>(page: Page<T> | null | undefined) {
  if (!page) {
    throw new Error('B2B Organizations returned no data')
  }

  return { data: page.data ?? [], total: page.pagination?.total ?? 0 }
}
