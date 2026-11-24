import { JanusClient } from '@vtex/api'
import type { InstanceOptions, IOContext } from '@vtex/api'

import { adminHeaders } from './adminToken'
import { sourceError } from './errors'

export interface OmsListOrder {
  orderId: string
  status: string
  statusDescription?: string | null
  creationDate: string
  lastChange: string
  totalValue: number
  currencyCode?: string | null
  workflowInErrorState?: boolean | null
  workflowInRetry?: boolean | null
}

export interface OmsListResponse {
  list: OmsListOrder[]
  paging: { total: number; pages: number; currentPage: number; perPage: number }
}

/** OMS allows at most 100 orders per page. */
export const OMS_PAGE_SIZE = 100

/**
 * The OMS order list (GET /api/oms/pvt/orders), read as the Admin user.
 *
 * Tested on 2026-11-18: f_UtmCampaign matches the organization ID that
 * B2B orders carry in marketingData.utmCampaign, and comma-separated values in
 * f_UtmCampaign and f_status are ORed. There's no filter for workflow errors;
 * each row carries workflowInErrorState and workflowInRetry instead.
 */
export class Oms extends JanusClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(ctx, {
      ...options,
      headers: { ...options?.headers, Accept: 'application/json' },
    })
  }

  public listOrders(input: {
    organizationIds: string[]
    statuses: string[]
    page: number
  }) {
    return this.http
      .get<OmsListResponse>('/api/oms/pvt/orders', {
        params: {
          f_UtmCampaign: input.organizationIds.join(','),
          f_status: input.statuses.join(','),
          orderBy: 'creationDate,asc',
          per_page: OMS_PAGE_SIZE,
          page: input.page,
        },
        headers: adminHeaders(this.context),
        metric: 'oms-list-orders',
      })
      .catch((e) => {
        throw sourceError('OMS order list', e)
      })
  }
}
