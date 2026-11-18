import type { OmsListOrder } from '../clients/oms'
import { OMS_PAGE_SIZE } from '../clients/oms'
import type { QuoteDocument } from '../clients/quotes'
import { mapLimit } from '../domain/concurrency'
import type { OrderProblem, QuoteWaitingOn } from '../domain/rules'
import {
  chunk,
  isStale,
  MASTER_DATA_PAGE,
  oldestFirst,
  OPEN_ORDER_STATUSES,
  orderProblem,
  PANEL_LIMIT,
  quoteWaitingOn,
  sortOrderProblems,
  staleCutoff,
  waitingQuotesWhere,
} from '../domain/rules'
import {
  organizationFilter,
  organizationNames,
  organizations,
  settings,
} from './shared'

const REQUEST_PAGE_SIZE = 100
const MAX_REQUEST_PAGES = 5
/** Organizations per OMS call. Their IDs are ORed in f_UtmCampaign. */
const ORGANIZATIONS_PER_ORDER_CALL = 20
/** Pages of open orders read per organization: 300 orders. */
const MAX_ORDER_PAGES = 3
const ORDER_CALLS_IN_FLIGHT = 6

interface OrganizationArgs {
  organizationId?: string | null
}

async function cutoff(ctx: Context) {
  const { staleAfterHours } = await settings(ctx)

  return staleCutoff(new Date(), staleAfterHours)
}

export async function organizationRequestsPanel(
  _: unknown,
  __: unknown,
  ctx: Context
) {
  const limit = await cutoff(ctx)
  const rows = []
  let total = 0

  for (let page = 1; page <= MAX_REQUEST_PAGES; page++) {
    // eslint-disable-next-line no-await-in-loop
    const result = await ctx.clients.b2bOrganizations.pendingRequests(
      page,
      REQUEST_PAGE_SIZE
    )

    rows.push(...result.data)
    total = result.total

    if (rows.length >= total || result.data.length === 0) {
      break
    }
  }

  const items = oldestFirst(
    rows.map((request) => ({
      id: request.id,
      name: request.name,
      tradeName: request.tradeName ?? null,
      created: request.created,
      isStale: isStale(request.created, limit),
    })),
    (item) => item.created
  )

  return {
    total,
    stale: items.filter((i) => i.isStale).length,
    items: items.slice(0, PANEL_LIMIT),
    truncated: rows.length < total,
  }
}

interface ProblemOrder {
  orderId: string
  organizationId: string
  organizationName: string | null
  status: string
  statusDescription: string | null
  problem: OrderProblem
  creationDate: string
  lastChange: string
  totalValue: number
  currencyCode: string | null
}

export async function problemOrdersPanel(
  _: unknown,
  args: OrganizationArgs,
  ctx: Context
) {
  const filter = organizationFilter(args.organizationId)
  const [limit, list] = await Promise.all([cutoff(ctx), organizations(ctx)])
  const names = new Map(list.organizations.map((o) => [o.id, o.name]))
  const ids = filter ? [filter] : list.organizations.map((o) => o.id)
  let truncated = list.truncated && !filter

  /** Open orders of one organization, at most MAX_ORDER_PAGES pages. */
  async function ordersOf(organizationId: string): Promise<OmsListOrder[]> {
    const orders: OmsListOrder[] = []

    for (let page = 1; page <= MAX_ORDER_PAGES; page++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await ctx.clients.oms.listOrders({
        organizationIds: [organizationId],
        statuses: OPEN_ORDER_STATUSES,
        page,
      })

      orders.push(...result.list)

      if (page >= result.paging.pages || result.list.length < OMS_PAGE_SIZE) {
        return orders
      }
    }

    truncated = true

    return orders
  }

  // The order list doesn't say which organization an order belongs to, so
  // one call per organization would be needed. Most organizations have no
  // open orders: one call per group of organizations finds the groups that
  // have any, and only those are read organization by organization.
  const groups = chunk(ids, ORGANIZATIONS_PER_ORDER_CALL)
  const probes = await mapLimit(groups, ORDER_CALLS_IN_FLIGHT, async (group) =>
    group.length === 1
      ? group
      : ctx.clients.oms
          .listOrders({
            organizationIds: group,
            statuses: OPEN_ORDER_STATUSES,
            page: 1,
          })
          .then((r) => (r.paging.total > 0 ? group : []))
  )

  const withOrders = probes.flat()
  const perOrganization = await mapLimit(
    withOrders,
    ORDER_CALLS_IN_FLIGHT,
    async (organizationId) =>
      (
        await ordersOf(organizationId)
      ).map((order) => ({
        order,
        organizationId,
      }))
  )

  const problems: ProblemOrder[] = []

  for (const { order, organizationId } of perOrganization.flat()) {
    const problem = orderProblem(order, limit)

    if (problem) {
      problems.push({
        orderId: order.orderId,
        organizationId,
        organizationName: names.get(organizationId) ?? null,
        status: order.status,
        statusDescription: order.statusDescription ?? null,
        problem,
        creationDate: order.creationDate,
        lastChange: order.lastChange,
        totalValue: order.totalValue,
        currencyCode: order.currencyCode ?? null,
      })
    }
  }

  const count = (p: OrderProblem) =>
    problems.filter((o) => o.problem === p).length

  return {
    total: problems.length,
    inError: count('WORKFLOW_ERROR'),
    inRetry: count('WORKFLOW_RETRY'),
    stale: count('STALE'),
    items: sortOrderProblems(problems).slice(0, PANEL_LIMIT),
    organizationsChecked: ids.length,
    truncated,
  }
}

export async function quotesPanel(
  _: unknown,
  args: OrganizationArgs,
  ctx: Context
) {
  const organizationId = organizationFilter(args.organizationId)
  const now = new Date()
  const limit = await cutoff(ctx)

  const search = (waitingOn: QuoteWaitingOn, size: number, stale = false) =>
    ctx.clients.quotes.search({
      where: waitingQuotesWhere({
        waitingOn,
        now,
        organizationId,
        updatedBefore: stale ? limit : undefined,
      }),
      sort: 'lastUpdate ASC',
      size,
    })

  const [seller, buyer, staleSeller, staleBuyer, names] = await Promise.all([
    search('SELLER', MASTER_DATA_PAGE),
    search('BUYER', MASTER_DATA_PAGE),
    search('SELLER', 0, true),
    search('BUYER', 0, true),
    organizationNames(ctx),
  ])

  const toItem = (quote: QuoteDocument) => {
    const waitingOn = quoteWaitingOn(quote.status, quote.expirationDate, now)

    return waitingOn
      ? [
          {
            id: quote.id,
            referenceName: quote.referenceName ?? null,
            status: quote.status,
            waitingOn,
            organizationId: quote.organization ?? null,
            organizationName: quote.organization
              ? names.get(quote.organization) ?? null
              : null,
            creationDate: quote.creationDate ?? null,
            lastUpdate: quote.lastUpdate,
            expirationDate: quote.expirationDate ?? null,
            subtotal: quote.subtotal ?? null,
            viewedBySales: quote.viewedBySales ?? null,
            isStale: isStale(quote.lastUpdate, limit),
          },
        ]
      : []
  }

  const items = oldestFirst(
    [...seller.data, ...buyer.data].flatMap(toItem),
    (item) => item.lastUpdate
  )

  return {
    total: seller.total + buyer.total,
    waitingOnSeller: seller.total,
    waitingOnBuyer: buyer.total,
    stale: staleSeller.total + staleBuyer.total,
    items: items.slice(0, PANEL_LIMIT),
    // Each bucket reads one Master Data page; more than that is cut.
    truncated:
      seller.total > MASTER_DATA_PAGE || buyer.total > MASTER_DATA_PAGE,
  }
}

/**
 * Credit holds come from B2B-041, which doesn't exist yet. The panel already
 * has its final shape so the page can show it, empty and labeled.
 */
export async function creditHoldsPanel(_: unknown, args: OrganizationArgs) {
  organizationFilter(args.organizationId)

  return { available: false, total: 0, items: [], truncated: false }
}

export async function controlCenterOrganizations(
  _: unknown,
  __: unknown,
  ctx: Context
) {
  const { organizations: list } = await organizations(ctx)

  return list.map((o) => ({ id: o.id, name: o.name, status: o.status ?? null }))
}

export function controlCenterSettings(_: unknown, __: unknown, ctx: Context) {
  return settings(ctx)
}
