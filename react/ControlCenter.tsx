import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useApolloClient, useQuery } from 'react-apollo'
import { useIntl } from 'react-intl'
import { Button, Dropdown, Layout, PageHeader } from 'vtex.styleguide'

import {
  CreditHoldsPanel,
  OnboardingPanel,
  OrganizationRequestsPanel,
  ProblemOrdersPanel,
  QuotesPanel,
} from './components/Panels'
import { SummaryTiles } from './components/SummaryTiles'
import ONBOARDING from './graphql/onboarding.graphql'
import PANELS from './graphql/panels.graphql'
import { messages } from './utils/messages'
import type { OnboardingApplication } from './utils/panels'
import {
  DEFAULT_STALE_AFTER_HOURS,
  panelError,
  summarizeOnboarding,
} from './utils/panels'
import type { PanelsQueryData } from './utils/types'

/** b2b-onboarding's largest page, and how many pages the panel reads */
const ONBOARDING_PAGE_SIZE = 50
const MAX_ONBOARDING_PAGES = 5

interface OnboardingQueryData {
  onboardingApplications: {
    items: OnboardingApplication[]
    pagination: { total: number }
  } | null
}

interface OnboardingState {
  loading: boolean
  error: string | null
  total: number
  applications: OnboardingApplication[]
}

/**
 * Reads every application in review from b2b-onboarding with the admin's
 * session. It returns newest first, so all pages are read to find the oldest.
 */
function useOnboarding(refreshKey: number): OnboardingState {
  const client = useApolloClient()
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    error: null,
    total: 0,
    applications: [],
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }))

      try {
        const applications: OnboardingApplication[] = []
        let total = 0

        for (let page = 1; page <= MAX_ONBOARDING_PAGES; page++) {
          // Sequential on purpose: each page says whether another exists.
          // eslint-disable-next-line no-await-in-loop
          const { data } = await client.query<OnboardingQueryData>({
            query: ONBOARDING,
            variables: { page },
            fetchPolicy: 'network-only',
          })

          const result = data?.onboardingApplications

          if (!result) {
            throw new Error('B2B onboarding returned no data')
          }

          applications.push(...result.items)
          total = result.pagination.total

          if (
            applications.length >= total ||
            result.items.length < ONBOARDING_PAGE_SIZE
          ) {
            break
          }
        }

        if (!cancelled) {
          setState({ loading: false, error: null, total, applications })
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            loading: false,
            error: (e as Error).message,
            total: 0,
            applications: [],
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [client, refreshKey])

  return state
}

function ControlCenter() {
  const intl = useIntl()
  const [organizationId, setOrganizationId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selected, setSelected] = useState('panel-onboarding')
  const [loadedAt, setLoadedAt] = useState(() => new Date())

  const { data, loading, error, refetch } = useQuery<PanelsQueryData>(PANELS, {
    variables: { organizationId: organizationId || undefined },
    fetchPolicy: 'network-only',
    // Keep the panels that loaded when another one fails.
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    onCompleted: () => setLoadedAt(new Date()),
  })

  const onboarding = useOnboarding(refreshKey)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    refetch().then(() => setLoadedAt(new Date()))
  }, [refetch])

  const errors = error?.graphQLErrors
  // A network failure takes every server panel down; show it on each.
  const networkError = error && !errors?.length ? error.message : null
  const errorFor = (field: string) => networkError ?? panelError(errors, field)

  const staleAfterHours =
    data?.controlCenterSettings?.staleAfterHours ?? DEFAULT_STALE_AFTER_HOURS

  const onboardingSummary = useMemo(
    () =>
      summarizeOnboarding(onboarding.applications, loadedAt, staleAfterHours),
    [onboarding.applications, loadedAt, staleAfterHours]
  )

  const organizations = data?.controlCenterOrganizations ?? []
  const organizationOptions = [
    { value: '', label: intl.formatMessage(messages.allOrganizations) },
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ]

  const requests = data?.organizationRequestsPanel ?? null
  const orders = data?.problemOrdersPanel ?? null
  const quotes = data?.quotesPanel ?? null
  const credit = data?.creditHoldsPanel ?? null

  const requestsError = errorFor('organizationRequestsPanel')
  const ordersError = errorFor('problemOrdersPanel')
  const quotesError = errorFor('quotesPanel')
  const creditError = errorFor('creditHoldsPanel')

  const tiles = [
    {
      panelId: 'panel-onboarding',
      label: intl.formatMessage(messages.tileOnboarding),
      total: onboarding.loading ? null : onboarding.total,
      stale: onboarding.loading ? null : onboardingSummary.stale,
      error: Boolean(onboarding.error),
    },
    {
      panelId: 'panel-requests',
      label: intl.formatMessage(messages.tileRequests),
      total: requests?.total ?? null,
      stale: requests?.stale ?? null,
      error: Boolean(requestsError),
    },
    {
      panelId: 'panel-orders',
      label: intl.formatMessage(messages.tileOrders),
      total: orders?.total ?? null,
      stale: orders?.stale ?? null,
      error: Boolean(ordersError),
    },
    {
      panelId: 'panel-quotes',
      label: intl.formatMessage(messages.tileQuotes),
      total: quotes?.total ?? null,
      stale: quotes?.stale ?? null,
      error: Boolean(quotesError),
    },
    {
      panelId: 'panel-credit',
      label: intl.formatMessage(messages.tileCredit),
      total: credit?.total ?? null,
      stale: credit ? 0 : null,
      error: Boolean(creditError),
      comingSoon: credit ? !credit.available : false,
    },
  ]

  const panelsLoading = loading
  const now = loadedAt

  return (
    <Layout
      fullWidth
      pageHeader={
        <PageHeader
          title={intl.formatMessage(messages.title)}
          subtitle={intl.formatMessage(messages.subtitle)}
        />
      }
    >
      <div className="flex flex-wrap items-end justify-between mb5">
        <div className="w-100 w-40-l mb3">
          <Dropdown
            label={intl.formatMessage(messages.organization)}
            size="small"
            options={organizationOptions}
            value={organizationId}
            onChange={(_: unknown, value: string) => setOrganizationId(value)}
          />
        </div>
        <div className="flex items-center mb3">
          <span className="t-small c-muted-1 mr4">
            {intl.formatMessage(messages.updatedAt, {
              time: intl.formatTime(loadedAt),
            })}
          </span>
          <Button
            variation="secondary"
            size="small"
            isLoading={panelsLoading || onboarding.loading}
            onClick={refresh}
          >
            {intl.formatMessage(messages.refresh)}
          </Button>
        </div>
      </div>

      <SummaryTiles tiles={tiles} selected={selected} onSelect={setSelected} />

      {selected === 'panel-onboarding' && (
        <OnboardingPanel
          data={
            onboarding.loading || onboarding.error
              ? null
              : { ...onboardingSummary, total: onboarding.total }
          }
          loading={onboarding.loading}
          error={onboarding.error}
          now={now}
        />
      )}
      {selected === 'panel-requests' && (
        <OrganizationRequestsPanel
          data={requests}
          loading={panelsLoading && !requests}
          error={requestsError}
          now={now}
        />
      )}
      {selected === 'panel-orders' && (
        <ProblemOrdersPanel
          data={orders}
          loading={panelsLoading}
          error={ordersError}
          now={now}
        />
      )}
      {selected === 'panel-quotes' && (
        <QuotesPanel
          data={quotes}
          loading={panelsLoading}
          error={quotesError}
          now={now}
        />
      )}
      {selected === 'panel-credit' && (
        <CreditHoldsPanel
          data={credit}
          loading={panelsLoading && !credit}
          error={creditError}
          now={now}
        />
      )}

      <p className="t-small c-muted-1 mt5 mb0">
        {intl.formatMessage(messages.readOnlyNote)}{' '}
        {intl.formatMessage(messages.thresholdNote, { hours: staleAfterHours })}
      </p>
    </Layout>
  )
}

export default ControlCenter
