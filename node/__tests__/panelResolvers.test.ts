import type { OmsListOrder } from '../clients/oms'
import {
  controlCenterOrganizations,
  controlCenterSettings,
  creditHoldsPanel,
  organizationRequestsPanel,
  problemOrdersPanel,
  quotesPanel,
} from '../resolvers/panels'

const HOUR = 60 * 60 * 1000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()
const inHours = (hours: number) =>
  new Date(Date.now() + hours * HOUR).toISOString()

const organization = (n: number) => ({
  id: `org-${n}`,
  name: `TEST - Organization ${n}`,
  status: n === 1 ? 'active' : undefined,
})

const order = (
  orderId: string,
  overrides: Partial<OmsListOrder> = {}
): OmsListOrder => ({
  orderId,
  status: 'order-created',
  creationDate: ago(100),
  lastChange: ago(1),
  totalValue: 1000,
  currencyCode: 'USD',
  ...overrides,
})

const page = (list: OmsListOrder[], pages = 1) => ({
  list,
  paging: { total: list.length, pages, currentPage: 1, perPage: 100 },
})

/**
 * Stand-ins for the clients the panels read. Every one is a jest.fn, so a
 * test can replace one answer and check what was asked.
 */
function fakeContext(
  options: {
    organizations?: Array<ReturnType<typeof organization>>
    ordersByOrganization?: Record<string, OmsListOrder[]>
    settings?: unknown
  } = {}
) {
  const orgs = options.organizations ?? [1, 2, 3].map(organization)
  const orders = options.ordersByOrganization ?? {}

  const b2bOrganizations = {
    organizations: jest.fn(async (pageNumber: number, size: number) => ({
      data: orgs.slice((pageNumber - 1) * size, pageNumber * size),
      total: orgs.length,
    })),
    pendingRequests: jest.fn(),
  }

  const oms = {
    listOrders: jest.fn(
      async (query: { organizationIds: string[]; page: number }) => {
        const list = query.organizationIds.flatMap((id) => orders[id] ?? [])

        return page(query.page === 1 ? list : [])
      }
    ),
  }

  const quotes = { find: jest.fn() }
  const warn = jest.fn()

  const ctx = {
    clients: {
      b2bOrganizations,
      oms,
      quotes,
      apps: {
        getAppSettings: jest.fn().mockResolvedValue(options.settings ?? {}),
      },
    },
    vtex: { logger: { warn, error: jest.fn() } },
  }

  return { ctx: ctx as never, b2bOrganizations, oms, quotes, warn }
}

describe('organizationRequestsPanel', () => {
  it('lists pending requests oldest first and counts those waiting too long', async () => {
    const { ctx, b2bOrganizations } = fakeContext()

    b2bOrganizations.pendingRequests.mockResolvedValue({
      data: [
        { id: 'r-new', name: 'TEST - New', created: ago(2) },
        { id: 'r-old', name: 'TEST - Old', tradeName: 'Old', created: ago(72) },
      ],
      total: 2,
    })

    const result = await organizationRequestsPanel(null, null, ctx)

    expect(result).toMatchObject({ total: 2, stale: 1, truncated: false })
    expect(result.items.map((i) => [i.id, i.isStale, i.tradeName])).toEqual([
      ['r-old', true, 'Old'],
      ['r-new', false, null],
    ])
    expect(b2bOrganizations.pendingRequests).toHaveBeenCalledTimes(1)
  })

  it('reads at most five pages and says the list is cut', async () => {
    const { ctx, b2bOrganizations } = fakeContext()

    b2bOrganizations.pendingRequests.mockImplementation(
      async (pageNumber: number) => ({
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `r-${pageNumber}-${i}`,
          name: 'TEST - Request',
          created: ago(1),
        })),
        total: 1000,
      })
    )

    const result = await organizationRequestsPanel(null, null, ctx)

    expect(b2bOrganizations.pendingRequests).toHaveBeenCalledTimes(5)
    expect(result).toMatchObject({ total: 1000, stale: 0, truncated: true })
    expect(result.items).toHaveLength(500)
  })

  it('uses the waiting too long setting', async () => {
    const { ctx, b2bOrganizations } = fakeContext({
      settings: { staleAfterHours: '1' },
    })

    b2bOrganizations.pendingRequests.mockResolvedValue({
      data: [{ id: 'r-1', name: 'TEST - Request', created: ago(2) }],
      total: 1,
    })

    await expect(
      organizationRequestsPanel(null, null, ctx)
    ).resolves.toMatchObject({ stale: 1 })
  })
})

describe('problemOrdersPanel', () => {
  const ordersByOrganization = {
    'org-1': [
      order('fresh'),
      order('stale', { lastChange: ago(48) }),
      order('retry', { workflowInRetry: true }),
    ],
    'org-3': [
      order('error', { workflowInErrorState: true, currencyCode: null }),
    ],
  }

  it('finds errors, retries and stale orders across organizations, errors first', async () => {
    const { ctx } = fakeContext({ ordersByOrganization })

    const result = await problemOrdersPanel(null, {}, ctx)

    expect(result).toMatchObject({
      total: 3,
      inError: 1,
      inRetry: 1,
      stale: 1,
      organizationsChecked: 3,
      truncated: false,
    })
    expect(
      result.items.map((o) => [o.orderId, o.problem, o.organizationName])
    ).toEqual([
      ['error', 'WORKFLOW_ERROR', 'TEST - Organization 3'],
      ['retry', 'WORKFLOW_RETRY', 'TEST - Organization 1'],
      ['stale', 'STALE', 'TEST - Organization 1'],
    ])
    expect(result.items[0].currencyCode).toBeNull()
  })

  it('probes groups of organizations first and reads only the groups that have open orders', async () => {
    const organizations = Array.from({ length: 25 }, (_, i) =>
      organization(i + 1)
    )

    const { ctx, oms } = fakeContext({
      organizations,
      ordersByOrganization: {
        'org-22': [order('late', { lastChange: ago(48) })],
      },
    })

    const result = await problemOrdersPanel(null, {}, ctx)

    const calls = oms.listOrders.mock.calls.map(([q]) => q.organizationIds)

    // One probe for organizations 1-20 (no orders), one for 21-25, then each of 21-25
    expect(calls.filter((ids) => ids.length > 1)).toHaveLength(2)
    expect(calls.filter((ids) => ids.length === 1).flat()).toEqual([
      'org-21',
      'org-22',
      'org-23',
      'org-24',
      'org-25',
    ])
    expect(result.items.map((o) => o.orderId)).toEqual(['late'])
    expect(result.organizationsChecked).toBe(25)
  })

  it('reads only the chosen organization, without a probe', async () => {
    const { ctx, oms } = fakeContext({ ordersByOrganization })

    const result = await problemOrdersPanel(
      null,
      { organizationId: 'org-3' },
      ctx
    )

    expect(oms.listOrders).toHaveBeenCalledTimes(1)
    expect(oms.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ organizationIds: ['org-3'], page: 1 })
    )
    expect(result).toMatchObject({ total: 1, organizationsChecked: 1 })
  })

  it('stops after three pages of one organization and says the list is cut', async () => {
    const { ctx, oms } = fakeContext()
    const full = Array.from({ length: 100 }, (_, i) => order(`o-${i}`))

    oms.listOrders.mockResolvedValue(page(full, 9))

    const result = await problemOrdersPanel(
      null,
      { organizationId: 'org-1' },
      ctx
    )

    expect(oms.listOrders).toHaveBeenCalledTimes(3)
    expect(result.truncated).toBe(true)
  })

  it('refuses an organization ID that could change the query', async () => {
    const { ctx, oms } = fakeContext()

    await expect(
      problemOrdersPanel(null, { organizationId: 'org-1 OR status=x' }, ctx)
    ).rejects.toThrow('Invalid organization ID')
    expect(oms.listOrders).not.toHaveBeenCalled()
  })
})

describe('quotesPanel', () => {
  const quote = (id: string, status: string, overrides = {}) => ({
    id,
    status,
    referenceName: `Quote ${id}`,
    organization: 'org-1',
    lastUpdate: ago(1),
    ...overrides,
  })

  function withQuotes(ctx: ReturnType<typeof fakeContext>) {
    ctx.quotes.find.mockImplementation(
      async (query: { where: string; size: number }) => {
        const seller = query.where.startsWith('(status=pending')
        const stale = query.where.includes('lastUpdate<')

        if (stale) {
          return { data: [], total: seller ? 1 : 0 }
        }

        return seller
          ? {
              data: [
                quote('q-pending', 'pending', { lastUpdate: ago(30) }),
                quote('q-other-org', 'revised', { organization: 'org-x' }),
              ],
              total: 2,
            }
          : {
              data: [
                quote('q-ready', 'ready', { expirationDate: inHours(48) }),
                // Expired between the search and now: left out of the list
                quote('q-expired', 'ready', { expirationDate: ago(1) }),
              ],
              total: 2,
            }
      }
    )
  }

  it('splits quotes between seller and buyer, with organization names', async () => {
    const fake = fakeContext()

    withQuotes(fake)

    const result = await quotesPanel(null, {}, fake.ctx)

    expect(result).toMatchObject({
      total: 4,
      waitingOnSeller: 2,
      waitingOnBuyer: 2,
      stale: 1,
      truncated: false,
    })
    expect(
      result.items.map((q) => [
        q.id,
        q.waitingOn,
        q.organizationName,
        q.isStale,
      ])
    ).toEqual([
      ['q-pending', 'SELLER', 'TEST - Organization 1', true],
      ['q-other-org', 'SELLER', null, false],
      ['q-ready', 'BUYER', 'TEST - Organization 1', false],
    ])
    expect(fake.quotes.find).toHaveBeenCalledTimes(4)
  })

  it('passes the organization filter into every search', async () => {
    const fake = fakeContext()

    withQuotes(fake)
    await quotesPanel(null, { organizationId: 'org-1' }, fake.ctx)

    for (const [query] of fake.quotes.find.mock.calls) {
      expect(query.where).toContain('organization=org-1')
    }
  })

  it('still answers without names when organizations cannot be read', async () => {
    const fake = fakeContext()

    withQuotes(fake)
    fake.b2bOrganizations.organizations.mockRejectedValue(
      new Error('Request failed with status code 403')
    )

    const result = await quotesPanel(null, {}, fake.ctx)

    expect(result.items.every((q) => q.organizationName === null)).toBe(true)
    expect(fake.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Organization names unavailable' })
    )
  })

  it('says the list is cut when a bucket has more than one page', async () => {
    const fake = fakeContext()

    fake.quotes.find.mockResolvedValue({ data: [], total: 150 })

    await expect(quotesPanel(null, {}, fake.ctx)).resolves.toMatchObject({
      truncated: true,
    })
  })
})

describe('creditHoldsPanel', () => {
  it('is empty and marked unavailable, but still checks the filter', async () => {
    await expect(creditHoldsPanel(null, {})).resolves.toEqual({
      available: false,
      total: 0,
      items: [],
      truncated: false,
    })
    await expect(
      creditHoldsPanel(null, { organizationId: '../x' })
    ).rejects.toThrow('Invalid organization ID')
  })
})

describe('organizations and settings', () => {
  it('lists organizations once per request, with a null status when missing', async () => {
    const { ctx, b2bOrganizations } = fakeContext()

    const first = await controlCenterOrganizations(null, null, ctx)
    const second = await controlCenterOrganizations(null, null, ctx)

    expect(first).toEqual([
      { id: 'org-1', name: 'TEST - Organization 1', status: 'active' },
      { id: 'org-2', name: 'TEST - Organization 2', status: null },
      { id: 'org-3', name: 'TEST - Organization 3', status: null },
    ])
    expect(second).toEqual(first)
    expect(b2bOrganizations.organizations).toHaveBeenCalledTimes(1)
  })

  it('pages through organizations until all are read', async () => {
    const organizations = Array.from({ length: 150 }, (_, i) =>
      organization(i + 1)
    )

    const { ctx, b2bOrganizations } = fakeContext({ organizations })

    const result = await controlCenterOrganizations(null, null, ctx)

    expect(result).toHaveLength(150)
    expect(b2bOrganizations.organizations).toHaveBeenCalledTimes(2)
  })

  it('reads the waiting too long setting, falling back to 24 hours', async () => {
    await expect(
      controlCenterSettings(
        null,
        null,
        fakeContext({ settings: { staleAfterHours: '48' } }).ctx
      )
    ).resolves.toEqual({ staleAfterHours: 48 })
    await expect(
      controlCenterSettings(
        null,
        null,
        fakeContext({ settings: { staleAfterHours: 'soon' } }).ctx
      )
    ).resolves.toEqual({ staleAfterHours: 24 })
  })
})
