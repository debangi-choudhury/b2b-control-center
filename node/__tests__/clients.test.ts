import type { IOContext } from '@vtex/api'

import service from '..'
import { Clients } from '../clients'
import { adminHeaders } from '../clients/adminToken'
import { B2BOrganizations } from '../clients/b2bOrganizations'
import { sourceError } from '../clients/errors'
import { OMS_PAGE_SIZE, Oms } from '../clients/oms'
import { QuotesMasterData } from '../clients/quotes'
import * as panels from '../resolvers/panels'

/*
 * What each client sends, and how failures are reported. The HTTP and
 * GraphQL layers are stand-ins, so nothing leaves the test.
 */

const context = (adminUserAuthToken: string | undefined = 'ADMIN-TOKEN') =>
  ({
    account: 'acct',
    workspace: 'test',
    authToken: 'APP-TOKEN',
    adminUserAuthToken,
    region: 'aws-us-east-1',
    production: false,
    userAgent: 'test',
    operationId: 'op',
    requestId: 'req',
    platform: '',
    route: { id: '', params: {} },
    logger: { warn() {}, error() {}, info() {}, debug() {} },
  } as unknown as IOContext)

const ADMIN = {
  VtexIdclientAutCookie: 'ADMIN-TOKEN',
  cookie: 'VtexIdclientAutCookie=ADMIN-TOKEN',
}

describe('adminHeaders', () => {
  it('acts as the Admin user who opened the page, never the app', () => {
    expect(adminHeaders(context())).toEqual(ADMIN)
    expect(() => adminHeaders(context(''))).toThrow(
      'An admin session is required'
    )
  })
})

describe('sourceError', () => {
  it.each([
    [{ response: { status: 403, data: 'Forbidden' } }, 'HTTP 403: Forbidden'],
    [
      { response: { status: 400, data: { message: 'Bad filter' } } },
      'HTTP 400: Bad filter',
    ],
    [
      { response: { status: 500, data: { Message: 'Oops' } } },
      'HTTP 500: Oops',
    ],
    [
      { response: { status: 502, data: { error: 'Gateway' } } },
      'HTTP 502: Gateway',
    ],
    [
      { response: { status: 418, data: { other: 1 } } },
      'HTTP 418: {"other":1}',
    ],
    [{ message: 'timeout of 3000ms exceeded' }, 'timeout of 3000ms exceeded'],
  ])('names the source and the reason for %j', (failure, reason) => {
    expect(sourceError('OMS order list', failure).message).toBe(
      `OMS order list failed (${reason})`
    )
  })

  it('never includes the request headers, which hold the token', () => {
    const error = sourceError('OMS', {
      message: 'failed',
      config: { headers: ADMIN },
      response: { status: 401, headers: { 'set-cookie': 'x' } },
    })

    expect(error.message).not.toContain('ADMIN-TOKEN')
  })

  it('keeps long details short', () => {
    const error = sourceError('OMS', {
      response: { status: 500, data: 'x'.repeat(1000) },
    })

    expect(error.message.length).toBeLessThan(400)
  })
})

describe('Oms', () => {
  it('lists open orders of the organizations, as the Admin user', async () => {
    const get = jest.fn().mockResolvedValue({ list: [], paging: {} })
    const oms = new Oms(context())

    Object.assign(oms, { http: { get } })

    await oms.listOrders({
      organizationIds: ['org-1', 'org-2'],
      statuses: ['payment-pending', 'handling'],
      page: 2,
    })

    expect(get).toHaveBeenCalledWith('/api/oms/pvt/orders', {
      params: {
        f_UtmCampaign: 'org-1,org-2',
        f_status: 'payment-pending,handling',
        orderBy: 'creationDate,asc',
        per_page: OMS_PAGE_SIZE,
        page: 2,
      },
      headers: ADMIN,
      metric: 'oms-list-orders',
    })
  })

  it('reports a failure as the order list failing', async () => {
    const oms = new Oms(context())

    Object.assign(oms, {
      http: { get: jest.fn().mockRejectedValue({ response: { status: 403 } }) },
    })

    await expect(
      oms.listOrders({ organizationIds: ['o'], statuses: ['s'], page: 1 })
    ).rejects.toThrow('OMS order list failed (HTTP 403)')
  })
})

describe('QuotesMasterData', () => {
  function client(search: jest.Mock) {
    const quotes = new QuotesMasterData(context())

    Object.assign(quotes, { searchDocumentsWithPaginationInfo: search })

    return quotes
  }

  it('sends the Admin user’s token instead of the app token', () => {
    const quotes = new QuotesMasterData(context())
    const { options } = quotes as unknown as {
      options: { headers: Record<string, string> }
    }

    expect(options.headers).toMatchObject(ADMIN)
    expect(() => new QuotesMasterData(context(''))).toThrow(
      'An admin session is required'
    )
  })

  it('reads one page of quotes and the full count', async () => {
    const search = jest.fn().mockResolvedValue({
      data: [{ id: 'q-1' }, { id: 'q-2' }],
      pagination: { total: 120 },
    })

    const result = await client(search).find({
      where: 'status=pending',
      sort: 'lastUpdate ASC',
      size: 500,
    })

    expect(result).toEqual({ data: [{ id: 'q-1' }, { id: 'q-2' }], total: 120 })
    expect(search.mock.calls[0][0]).toMatchObject({
      dataEntity: 'quotes',
      where: 'status=pending',
      sort: 'lastUpdate ASC',
      pagination: { page: 1, pageSize: 99 },
    })
  })

  it('only counts when asked for no rows, and counts rows without a total', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 'q-1' }],
        pagination: { total: 7 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'q-1' }],
        pagination: { total: NaN },
      })

    const quotes = client(search)

    await expect(
      quotes.find({ where: 'x', sort: 'y', size: 0 })
    ).resolves.toEqual({ data: [], total: 7 })
    expect(search.mock.calls[0][0].pagination.pageSize).toBe(1)

    await expect(
      quotes.find({ where: 'x', sort: 'y', size: 10 })
    ).resolves.toEqual({ data: [{ id: 'q-1' }], total: 1 })
  })

  it('reports a failure as Master Data failing', async () => {
    const search = jest.fn().mockRejectedValue({ response: { status: 400 } })

    await expect(
      client(search).find({ where: 'x', sort: 'y', size: 1 })
    ).rejects.toThrow('Quotes (Master Data) failed (HTTP 400)')
  })
})

describe('B2BOrganizations', () => {
  function client(query: jest.Mock) {
    const b2b = new B2BOrganizations(context())

    Object.assign(b2b, { graphql: { query } })

    return b2b
  }

  it('reads organizations of every status, as the Admin user', async () => {
    const query = jest.fn().mockResolvedValue({
      data: {
        getOrganizations: {
          data: [{ id: 'org-1', name: 'TEST' }],
          pagination: { total: 1 },
        },
      },
    })

    await expect(client(query).organizations(2, 100)).resolves.toEqual({
      data: [{ id: 'org-1', name: 'TEST' }],
      total: 1,
    })

    const [request, options] = query.mock.calls[0]

    expect(request.variables).toEqual({
      status: ['active', 'on-hold', 'inactive'],
      page: 2,
      pageSize: 100,
    })
    expect(options.headers).toEqual(ADMIN)
  })

  it('reads pending requests, with defaults for missing parts', async () => {
    const query = jest
      .fn()
      .mockResolvedValue({ data: { getOrganizationRequests: {} } })

    await expect(client(query).pendingRequests(1, 100)).resolves.toEqual({
      data: [],
      total: 0,
    })
    expect(query.mock.calls[0][0].variables.status).toEqual(['pending'])
  })

  it('fails clearly on no data or a failed call', async () => {
    await expect(
      client(jest.fn().mockResolvedValue({ data: null })).organizations(1, 1)
    ).rejects.toThrow('B2B Organizations returned no data')
    await expect(
      client(
        jest.fn().mockRejectedValue({ response: { status: 401 } })
      ).pendingRequests(1, 1)
    ).rejects.toThrow('B2B Organizations failed (HTTP 401)')
    await expect(
      client(
        jest.fn().mockRejectedValue({ response: { status: 500 } })
      ).organizations(1, 1)
    ).rejects.toThrow('B2B Organizations failed (HTTP 500)')
  })
})

describe('service', () => {
  const { config } = service as unknown as {
    config: {
      graphql: { resolvers: { Query: Record<string, unknown> } }
      clients: { options: { default: { retries: number; timeout: number } } }
    }
  }

  it('wires every panel query and nothing else', () => {
    expect(
      Object.keys(config.graphql.resolvers.Query).sort((a, b) =>
        a.localeCompare(b)
      )
    ).toEqual(Object.keys(panels).sort((a, b) => a.localeCompare(b)))
  })

  it('fails fast: 3-second timeouts and two retries for read-only calls', () => {
    expect(config.clients.options.default).toEqual({
      retries: 2,
      timeout: 3000,
    })
  })

  it('builds each client once per request', () => {
    // The VTEX IO runtime defines this global; IOClients passes it to every client
    Object.assign(global, { metrics: {} })

    const clients = new Clients({}, context())

    expect(clients.oms).toBeInstanceOf(Oms)
    expect(clients.quotes).toBeInstanceOf(QuotesMasterData)
    expect(clients.b2bOrganizations).toBeInstanceOf(B2BOrganizations)
    expect(clients.oms).toBe(clients.oms)
  })
})
