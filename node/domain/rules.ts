/**
 * Business rules for the panels, kept free of clients so they can be tested.
 */

export const DEFAULT_STALE_AFTER_HOURS = 24
const MAX_STALE_AFTER_HOURS = 720
const HOUR = 60 * 60 * 1000

/**
 * Rows a panel returns; the totals always count everything at the source.
 * The Admin page pages them 10 at a time in the browser.
 */
export const PANEL_LIMIT = 500

/** Master Data returns at most 100 documents per call. */
export const MASTER_DATA_PAGE = 100

/**
 * Orders that are still being worked on. Finished states (invoiced, canceled)
 * are left out: a workflow error there no longer blocks the customer.
 */
export const OPEN_ORDER_STATUSES = [
  'order-created',
  'order-accepted',
  'payment-pending',
  'payment-approved',
  'approve-payment',
  'waiting-for-seller-confirmation',
  'waiting-for-authorization',
  'waiting-ffmt-authorization',
  'authorize-fulfillment',
  'window-to-cancel',
  'ready-for-handling',
  'start-handling',
  'handling',
  'request-cancel',
  'cancellation-requested',
]

export const QUOTE_STATUSES_WAITING_ON_SELLER = ['pending', 'revised']
export const QUOTE_STATUS_WAITING_ON_BUYER = 'ready'

/** Reads the threshold from app settings, falling back to the default. */
export function staleAfterHours(settings: unknown): number {
  const value = (settings as { staleAfterHours?: unknown } | null)
    ?.staleAfterHours

  const hours = typeof value === 'string' ? Number(value) : value

  if (
    typeof hours !== 'number' ||
    !Number.isInteger(hours) ||
    hours < 1 ||
    hours > MAX_STALE_AFTER_HOURS
  ) {
    return DEFAULT_STALE_AFTER_HOURS
  }

  return hours
}

export function staleCutoff(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * HOUR)
}

/** True when the date is older than the cutoff. Unparseable dates aren't stale. */
export function isStale(since: string | null | undefined, cutoff: Date) {
  if (!since) {
    return false
  }

  const time = Date.parse(since)

  return !Number.isNaN(time) && time < cutoff.getTime()
}

/** Oldest first; rows without a parseable date go last. */
export function oldestFirst<T>(rows: T[], dateOf: (row: T) => string) {
  const time = (row: T) => {
    const t = Date.parse(dateOf(row))

    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
  }

  return [...rows].sort((a, b) => time(a) - time(b))
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}

export type OrderProblem = 'WORKFLOW_ERROR' | 'WORKFLOW_RETRY' | 'STALE'

export interface OrderRow {
  status: string
  lastChange: string
  workflowInErrorState?: boolean | null
  workflowInRetry?: boolean | null
}

/** Why an open order is on the panel, or null when it's fine. */
export function orderProblem(
  order: OrderRow,
  cutoff: Date
): OrderProblem | null {
  if (order.workflowInErrorState) {
    return 'WORKFLOW_ERROR'
  }

  if (order.workflowInRetry) {
    return 'WORKFLOW_RETRY'
  }

  return isStale(order.lastChange, cutoff) ? 'STALE' : null
}

/** Errors first, then retries, then waiting; oldest first within each. */
export function sortOrderProblems<
  T extends { problem: OrderProblem; lastChange: string }
>(rows: T[]): T[] {
  const rank: Record<OrderProblem, number> = {
    WORKFLOW_ERROR: 0,
    WORKFLOW_RETRY: 1,
    STALE: 2,
  }

  return oldestFirst(rows, (r) => r.lastChange).sort(
    (a, b) => rank[a.problem] - rank[b.problem]
  )
}

export type QuoteWaitingOn = 'SELLER' | 'BUYER'

/** Who has to act on a quote, or null when nobody does. */
export function quoteWaitingOn(
  status: string,
  expirationDate: string | null | undefined,
  now: Date
): QuoteWaitingOn | null {
  if (QUOTE_STATUSES_WAITING_ON_SELLER.includes(status)) {
    return 'SELLER'
  }

  if (status === QUOTE_STATUS_WAITING_ON_BUYER) {
    const expires = expirationDate ? Date.parse(expirationDate) : NaN

    // A ready quote without an expiry date never expires.
    return Number.isNaN(expires) || expires > now.getTime() ? 'BUYER' : null
  }

  return null
}

/**
 * IDs from B2B Organizations and Master Data are UUIDs or similar. Anything
 * else is refused before it reaches a query string or a Master Data filter.
 */
const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/

export function isSafeId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_ID.test(id)
}

/**
 * The Master Data filter for quotes someone has to act on. Dates come from
 * the server clock; the organization ID must already be checked with isSafeId.
 */
export function waitingQuotesWhere(input: {
  waitingOn: QuoteWaitingOn
  now: Date
  organizationId?: string
  updatedBefore?: Date
}): string {
  const parts = [
    input.waitingOn === 'SELLER'
      ? `(${QUOTE_STATUSES_WAITING_ON_SELLER.map((s) => `status=${s}`).join(
          ' OR '
        )})`
      : `status=${QUOTE_STATUS_WAITING_ON_BUYER} AND expirationDate>${input.now.toISOString()}`,
  ]

  if (input.organizationId) {
    if (!isSafeId(input.organizationId)) {
      throw new Error('Unsafe organization ID')
    }

    parts.push(`organization=${input.organizationId}`)
  }

  if (input.updatedBefore) {
    parts.push(`lastUpdate<${input.updatedBefore.toISOString()}`)
  }

  return parts.join(' AND ')
}
