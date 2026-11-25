import React from 'react'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useApolloClient, useQuery } from 'react-apollo'

import {
  CreditHoldsPanel,
  OnboardingPanel,
  ProblemOrdersPanel,
  QuotesPanel,
} from '../components/Panels'
import ControlCenter from '../ControlCenter'
import { messages } from '../utils/messages'
import type { OrderProblem, PanelsQueryData } from '../utils/types'
import { renderWithIntl, text } from './support/render'

jest.mock('react-apollo', () => ({
  useQuery: jest.fn(),
  useApolloClient: jest.fn(),
}))

const useQueryMock = useQuery as jest.Mock
const useApolloClientMock = useApolloClient as jest.Mock

const HOUR = 60 * 60 * 1000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()
const NOW = new Date()

const STAGES = [
  { id: 'document-review', label: 'Document review', type: 'REVIEW' },
  { id: 'final-approval', label: 'Final approval', type: 'APPROVAL' },
]

const order = (orderId: string, problem: OrderProblem, overrides = {}) => ({
  orderId,
  organizationId: 'org-1',
  organizationName: 'TEST - Organization 1',
  status: 'payment-pending',
  statusDescription: null,
  problem,
  creationDate: ago(100),
  lastChange: ago(72),
  totalValue: 123456,
  currencyCode: 'USD',
  ...overrides,
})

const PANELS: PanelsQueryData = {
  controlCenterSettings: { staleAfterHours: 24 },
  controlCenterOrganizations: [
    { id: 'org-1', name: 'TEST - Organization 1', status: 'active' },
    { id: 'org-2', name: 'TEST - Organization 2', status: null },
  ],
  organizationRequestsPanel: {
    total: 2,
    stale: 1,
    truncated: false,
    items: [
      {
        id: 'r-1',
        name: 'TEST - Request',
        tradeName: null,
        created: ago(48),
        isStale: true,
      },
      {
        id: 'r-2',
        name: 'TEST - New request',
        tradeName: 'New',
        created: ago(0.5),
        isStale: false,
      },
    ],
  },
  problemOrdersPanel: {
    total: 3,
    inError: 1,
    inRetry: 1,
    stale: 1,
    organizationsChecked: 2,
    truncated: false,
    items: [
      order('error-1', 'WORKFLOW_ERROR'),
      order('retry-1', 'WORKFLOW_RETRY', { currencyCode: null }),
      order('stale-1', 'STALE', { organizationName: null, lastChange: 'bad' }),
    ],
  },
  quotesPanel: {
    total: 2,
    waitingOnSeller: 1,
    waitingOnBuyer: 1,
    stale: 1,
    truncated: false,
    items: [
      {
        id: 'q-1',
        referenceName: 'Quote one',
        status: 'pending',
        waitingOn: 'SELLER',
        organizationId: 'org-1',
        organizationName: 'TEST - Organization 1',
        lastUpdate: ago(30),
        expirationDate: null,
        subtotal: 5000,
        isStale: true,
      },
      {
        id: 'q-2',
        referenceName: null,
        status: 'ready',
        waitingOn: 'BUYER',
        organizationId: null,
        organizationName: null,
        lastUpdate: ago(2),
        expirationDate: '2026-12-31T00:00:00.000Z',
        subtotal: null,
        isStale: false,
      },
    ],
  },
  creditHoldsPanel: { available: false, total: 0, truncated: false, items: [] },
}

const onboardingPage = (count: number, total: number, offset = 0) => ({
  data: {
    onboardingApplications: {
      items: Array.from({ length: count }, (_, i) => ({
        id: `APP-${offset + i}`,
        reference: `APP-${offset + i}`,
        companyName: `TEST - Applicant ${offset + i}`,
        currentStageIndex: (offset + i) % 2,
        stages: STAGES,
        submittedAt: ago(i === 0 ? 72 : 1),
      })),
      pagination: { total },
    },
  },
})

let refetch: jest.Mock
let clientQuery: jest.Mock

function render(
  panels: Partial<PanelsQueryData> | null = PANELS,
  state: Record<string, unknown> = {}
) {
  refetch = jest.fn().mockResolvedValue({})
  useQueryMock.mockReturnValue({
    data: panels ?? undefined,
    loading: false,
    error: undefined,
    refetch,
    ...state,
  })
  useApolloClientMock.mockReturnValue({ query: clientQuery })

  return renderWithIntl(<ControlCenter />)
}

const tab = (label: string | { defaultMessage: string }) =>
  screen.getByRole('tab', {
    name: new RegExp(typeof label === 'string' ? label : text(label)),
  })

beforeEach(() => {
  jest.clearAllMocks()
  clientQuery = jest.fn().mockResolvedValue(onboardingPage(2, 2))
})

describe('ControlCenter', () => {
  it('asks for every panel with the organization filter, keeping panels that loaded', async () => {
    render()

    await screen.findByText('TEST - Applicant 0')

    const [document, options] = useQueryMock.mock.calls[0]

    expect(document).toBe('panels.graphql')
    expect(options).toMatchObject({
      variables: { organizationId: undefined },
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    })

    fireEvent.change(screen.getByLabelText(text(messages.organization)), {
      target: { value: 'org-2' },
    })
    expect(useQueryMock.mock.calls.slice(-1)[0][1].variables).toEqual({
      organizationId: 'org-2',
    })
  })

  it('counts every tile, with the ones waiting too long', async () => {
    render()

    await waitFor(() =>
      expect(tab(messages.tileOnboarding).textContent).toContain('2')
    )

    expect(tab(messages.tileRequests).textContent).toContain(
      text(messages.tileStale, { count: 1 })
    )
    expect(tab(messages.tileCredit).textContent).toContain(
      text(messages.tileComingSoon)
    )
  })

  it('reads every onboarding page until all applications are in', async () => {
    clientQuery = jest
      .fn()
      .mockResolvedValueOnce(onboardingPage(50, 60))
      .mockResolvedValueOnce(onboardingPage(10, 60, 50))

    render()

    await waitFor(() => expect(clientQuery).toHaveBeenCalledTimes(2))
    expect(clientQuery.mock.calls[1][0]).toMatchObject({
      query: 'onboarding.graphql',
      variables: { page: 2 },
    })
    await waitFor(() =>
      expect(tab(messages.tileOnboarding).textContent).toContain('60')
    )
  })

  it('shows an onboarding error on its tile and panel only', async () => {
    clientQuery = jest.fn().mockResolvedValue({ data: {} })

    render()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'B2B onboarding returned no data'
    )
    expect(tab(messages.tileOnboarding).textContent).toContain(
      text(messages.tileError)
    )
    expect(tab(messages.tileRequests).textContent).not.toContain(
      text(messages.tileError)
    )
  })

  it('opens a panel from its tile, and moves between tiles with the arrow keys', async () => {
    render()
    await screen.findByText('TEST - Applicant 0')

    fireEvent.click(tab(messages.tileRequests))
    expect(screen.getByText('TEST - Request')).toBeTruthy()
    expect(
      screen
        .getAllByRole('link', { name: text(messages.openRequests) })[0]
        .getAttribute('href')
    ).toBe('/admin/b2b-organizations/organizations#/requests')

    fireEvent.keyDown(tab(messages.tileRequests), { key: 'ArrowRight' })
    expect(tab(messages.tileOrders).getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(tab(messages.tileOrders), { key: 'ArrowLeft' })
    fireEvent.keyDown(tab(messages.tileRequests), { key: 'ArrowLeft' })
    expect(tab(messages.tileOnboarding).getAttribute('aria-selected')).toBe(
      'true'
    )

    // Other keys do nothing
    fireEvent.keyDown(tab(messages.tileOnboarding), { key: 'Enter' })
    expect(tab(messages.tileOnboarding).getAttribute('aria-selected')).toBe(
      'true'
    )
  })

  it('shows a failed panel without hiding the others', async () => {
    render(
      { ...PANELS, problemOrdersPanel: null },
      {
        error: {
          message: 'GraphQL error',
          graphQLErrors: [
            { message: 'OMS is down', path: ['problemOrdersPanel'] },
          ],
        },
      }
    )
    await screen.findByText('TEST - Applicant 0')

    expect(tab(messages.tileOrders).textContent).toContain(
      text(messages.tileError)
    )
    fireEvent.click(tab(messages.tileOrders))
    expect(screen.getByRole('alert').textContent).toContain('OMS is down')

    fireEvent.click(tab(messages.tileQuotes))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a network failure on every server panel', async () => {
    render(null, { error: { message: 'Network error', graphQLErrors: [] } })
    await screen.findByText('TEST - Applicant 0')

    for (const label of [
      messages.tileRequests,
      messages.tileOrders,
      messages.tileQuotes,
      messages.tileCredit,
    ]) {
      fireEvent.click(tab(label))
      expect(screen.getByRole('alert').textContent).toContain('Network error')
    }
  })

  it('refreshes both sources and the updated time', async () => {
    render()
    await screen.findByText('TEST - Applicant 0')

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: text(messages.refresh) })
      )
    })

    expect(refetch).toHaveBeenCalled()
    await waitFor(() => expect(clientQuery).toHaveBeenCalledTimes(2))

    // The query's own completion also sets the time
    act(() => {
      useQueryMock.mock.calls[0][1].onCompleted()
    })
  })

  it('shows the threshold from the settings, or 24 hours by default', async () => {
    const { unmount } = render({
      ...PANELS,
      controlCenterSettings: { staleAfterHours: 48 },
    })

    await screen.findByText('TEST - Applicant 0')
    expect(
      screen.getByText(new RegExp(text(messages.thresholdNote, { hours: 48 })))
    ).toBeTruthy()
    unmount()

    render(null, { loading: true })
    await screen.findByText('TEST - Applicant 0')
    expect(
      screen.getByText(new RegExp(text(messages.thresholdNote, { hours: 24 })))
    ).toBeTruthy()
  })
})

describe('panels', () => {
  it('lists problem orders with their problem, total and link', () => {
    renderWithIntl(
      <ProblemOrdersPanel
        data={PANELS.problemOrdersPanel}
        loading={false}
        error={null}
        now={NOW}
      />
    )

    expect(
      screen.getByText(text(messages.chipErrors, { count: 1 }))
    ).toBeTruthy()
    expect(
      screen.getByText(text(messages.ordersChecked, { count: 2 }))
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'error-1' }).getAttribute('href')
    ).toBe('/admin/orders/error-1')
    expect(
      screen.getByRole('link', { name: 'error-1' }).getAttribute('target')
    ).toBe('_top')
    expect(screen.getAllByText('Payment pending')).toHaveLength(3)
    // In dollars when the order has a currency, as a plain number when not
    expect(screen.getAllByText('$1,234.56')).toHaveLength(2)
    expect(screen.getByText('1,234.56')).toBeTruthy()
    expect(screen.getByText(text(messages.problemWorkflowError))).toBeTruthy()
    // An unreadable date shows a dash
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('lists quotes with who they wait on, opening each in the store', () => {
    renderWithIntl(
      <QuotesPanel
        data={PANELS.quotesPanel}
        loading={false}
        error={null}
        now={NOW}
      />
    )

    expect(screen.getByText(text(messages.waitingOnSeller))).toBeTruthy()
    expect(screen.getByText(text(messages.waitingOnBuyer))).toBeTruthy()
    // Quotes have no currency of their own
    expect(screen.getByText('50.00')).toBeTruthy()
    expect(screen.getByText(text(messages.tooLong))).toBeTruthy()

    const [link] = screen.getAllByRole('link', {
      name: text(messages.openInStore),
    })

    expect(link.getAttribute('href')).toBe('/b2b-quotes/q-1')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('explains an empty credit holds panel, and lists holds once there are some', () => {
    const { unmount } = renderWithIntl(
      <CreditHoldsPanel
        data={PANELS.creditHoldsPanel}
        loading={false}
        error={null}
        now={NOW}
      />
    )

    expect(screen.getByText(text(messages.creditUnavailable))).toBeTruthy()
    unmount()

    renderWithIntl(
      <CreditHoldsPanel
        data={{
          available: true,
          total: 1,
          truncated: true,
          items: [
            {
              orderId: 'held-1',
              organizationId: 'org-1',
              organizationName: null,
              amount: 99900,
              heldSince: ago(30),
              reason: 'Over credit limit',
              isStale: true,
            },
          ],
        }}
        loading={false}
        error={null}
        now={NOW}
      />
    )

    expect(screen.getByRole('link', { name: 'held-1' })).toBeTruthy()
    expect(screen.getByText(text(messages.truncated))).toBeTruthy()
  })

  it('shows loading and empty states', () => {
    const { unmount } = renderWithIntl(
      <QuotesPanel data={null} loading error={null} now={NOW} />
    )

    expect(screen.getByRole('progressbar')).toBeTruthy()
    unmount()

    renderWithIntl(
      <ProblemOrdersPanel
        data={{ ...PANELS.problemOrdersPanel!, items: [], total: 0 }}
        loading={false}
        error={null}
        now={NOW}
      />
    )
    expect(screen.getByText(text(messages.empty))).toBeTruthy()
  })

  it('pages through more than 10 rows, and changes the page size', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `APP-${i}`,
      reference: `APP-${i}`,
      companyName: `TEST - Applicant ${i}`,
      stageLabel: 'Document review',
      stageType: 'REVIEW',
      waitingSince: ago(i),
      isStale: false,
    }))

    renderWithIntl(
      <OnboardingPanel
        data={{
          rows,
          total: 25,
          stale: 0,
          byStage: [{ label: 'Document review', count: 25 }],
        }}
        loading={false}
        error={null}
        now={NOW}
      />
    )

    const pager = screen.getByRole('navigation')

    expect(within(pager).getByText(/^1 - 10/)).toBeTruthy()
    fireEvent.click(within(pager).getByText('Next page'))
    expect(within(pager).getByText(/^11 - 20/)).toBeTruthy()
    fireEvent.click(within(pager).getByText('Previous page'))
    expect(within(pager).getByText(/^1 - 10/)).toBeTruthy()

    fireEvent.change(within(pager).getByRole('combobox'), {
      target: { value: '25' },
    })
    expect(within(pager).getByText(/^1 - 25/)).toBeTruthy()
    expect(
      screen.getAllByRole('link', { name: text(messages.open) })
    ).toHaveLength(25)
    expect(
      screen
        .getAllByRole('link', { name: text(messages.open) })[0]
        .getAttribute('href')
    ).toBe('/admin/b2b-onboarding/APP-0')
  })
})
