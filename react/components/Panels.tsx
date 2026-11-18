import React from 'react'
import { useIntl } from 'react-intl'
import { Tag } from 'vtex.styleguide'

import {
  onboardingLink,
  orderLink,
  organizationRequestsLink,
  quoteLink,
} from '../utils/links'
import { messages } from '../utils/messages'
import type { OnboardingRow } from '../utils/panels'
import { fromCents, statusLabel } from '../utils/panels'
import type {
  CreditHoldsPanelData,
  OrganizationRequestsPanelData,
  ProblemOrdersPanelData,
  QuotesPanelData,
} from '../utils/types'
import { Cell, PanelFrame, RowLink, Table, Waiting } from './common'

interface State {
  loading: boolean
  error: string | null
  now: Date
}

export function OnboardingPanel({
  data,
  loading,
  error,
  now,
}: State & {
  data: {
    total: number
    stale: number
    byStage: Array<{ label: string; count: number }>
    rows: OnboardingRow[]
  } | null
}) {
  const intl = useIntl()
  const rows = data?.rows ?? []

  return (
    <PanelFrame
      id="panel-onboarding"
      title={intl.formatMessage(messages.onboardingTitle)}
      subtitle={intl.formatMessage(messages.onboardingSubtitle)}
      loading={loading}
      error={error}
      isEmpty={rows.length === 0}
      shown={rows.length}
      total={data?.total}
      notes={[
        intl.formatMessage(messages.allOrganizationsNote),
        data && data.byStage.length > 0
          ? data.byStage
              .map((s) => intl.formatMessage(messages.byStage, s))
              .join(' · ')
          : null,
      ]}
    >
      <Table
        headers={[
          intl.formatMessage(messages.colReference),
          intl.formatMessage(messages.colCompany),
          intl.formatMessage(messages.colStage),
          intl.formatMessage(messages.colWaiting),
          '',
        ]}
      >
        {rows.map((row) => (
          <tr key={row.id} className="bb b--muted-5">
            <Cell>
              <code>{row.reference}</code>
            </Cell>
            <Cell>{row.companyName}</Cell>
            <Cell muted>{row.stageLabel ?? '—'}</Cell>
            <Cell>
              <Waiting
                since={row.waitingSince}
                now={now}
                isStale={row.isStale}
              />
            </Cell>
            <Cell>
              <RowLink href={onboardingLink(row.id)}>
                {intl.formatMessage(messages.open)}
              </RowLink>
            </Cell>
          </tr>
        ))}
      </Table>
    </PanelFrame>
  )
}

export function OrganizationRequestsPanel({
  data,
  loading,
  error,
  now,
}: State & { data: OrganizationRequestsPanelData | null }) {
  const intl = useIntl()
  const items = data?.items ?? []

  return (
    <PanelFrame
      id="panel-requests"
      title={intl.formatMessage(messages.requestsTitle)}
      subtitle={intl.formatMessage(messages.requestsSubtitle)}
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
      shown={items.length}
      total={data?.total}
      truncated={data?.truncated}
      notes={[intl.formatMessage(messages.allOrganizationsNote)]}
    >
      <Table
        headers={[
          intl.formatMessage(messages.colCompany),
          intl.formatMessage(messages.colRequested),
          intl.formatMessage(messages.colWaiting),
          '',
        ]}
      >
        {items.map((item) => (
          <tr key={item.id} className="bb b--muted-5">
            <Cell>
              {item.name}
              {item.tradeName && item.tradeName !== item.name && (
                <span className="c-muted-1"> ({item.tradeName})</span>
              )}
            </Cell>
            <Cell muted>
              {intl.formatDate(item.created, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Cell>
            <Cell>
              <Waiting since={item.created} now={now} isStale={item.isStale} />
            </Cell>
            <Cell>
              <RowLink href={organizationRequestsLink()}>
                {intl.formatMessage(messages.openRequests)}
              </RowLink>
            </Cell>
          </tr>
        ))}
      </Table>
    </PanelFrame>
  )
}

const PROBLEM_TAG = {
  WORKFLOW_ERROR: { type: 'error', message: messages.problemWorkflowError },
  WORKFLOW_RETRY: { type: 'warning', message: messages.problemWorkflowRetry },
  STALE: { type: 'neutral', message: messages.problemStale },
} as const

export function ProblemOrdersPanel({
  data,
  loading,
  error,
  now,
}: State & { data: ProblemOrdersPanelData | null }) {
  const intl = useIntl()
  const items = data?.items ?? []

  return (
    <PanelFrame
      id="panel-orders"
      title={intl.formatMessage(messages.ordersTitle)}
      subtitle={intl.formatMessage(messages.ordersSubtitle)}
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
      shown={items.length}
      total={data?.total}
      truncated={data?.truncated}
      notes={[
        data
          ? intl.formatMessage(messages.ordersChecked, {
              count: data.organizationsChecked,
              inError: data.inError,
              inRetry: data.inRetry,
              stale: data.stale,
            })
          : null,
      ]}
    >
      <Table
        headers={[
          intl.formatMessage(messages.colOrder),
          intl.formatMessage(messages.colOrganization),
          intl.formatMessage(messages.colStatus),
          intl.formatMessage(messages.colProblem),
          intl.formatMessage(messages.colWaiting),
          intl.formatMessage(messages.colTotal),
        ]}
      >
        {items.map((order) => {
          const tag = PROBLEM_TAG[order.problem]
          const total = fromCents(order.totalValue)

          return (
            <tr key={order.orderId} className="bb b--muted-5">
              <Cell>
                <RowLink href={orderLink(order.orderId)}>
                  <code>{order.orderId}</code>
                </RowLink>
              </Cell>
              <Cell>{order.organizationName ?? order.organizationId}</Cell>
              <Cell muted>{statusLabel(order.status)}</Cell>
              <Cell>
                <Tag type={tag.type} size="small">
                  {intl.formatMessage(tag.message)}
                </Tag>
              </Cell>
              <Cell>
                <Waiting
                  since={order.lastChange}
                  now={now}
                  isStale={order.problem === 'STALE'}
                />
              </Cell>
              <Cell>
                {total === null
                  ? '—'
                  : order.currencyCode
                  ? intl.formatNumber(total, {
                      style: 'currency',
                      currency: order.currencyCode,
                    })
                  : intl.formatNumber(total, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </Cell>
            </tr>
          )
        })}
      </Table>
    </PanelFrame>
  )
}

export function QuotesPanel({
  data,
  loading,
  error,
  now,
}: State & { data: QuotesPanelData | null }) {
  const intl = useIntl()
  const items = data?.items ?? []

  return (
    <PanelFrame
      id="panel-quotes"
      title={intl.formatMessage(messages.quotesTitle)}
      subtitle={intl.formatMessage(messages.quotesSubtitle)}
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
      shown={items.length}
      total={data?.total}
      truncated={data?.truncated}
      notes={[
        data
          ? intl.formatMessage(messages.quotesSplit, {
              seller: data.waitingOnSeller,
              buyer: data.waitingOnBuyer,
            })
          : null,
        intl.formatMessage(messages.quotesStoreNote),
      ]}
    >
      <Table
        headers={[
          intl.formatMessage(messages.colQuote),
          intl.formatMessage(messages.colOrganization),
          intl.formatMessage(messages.colWaitingOn),
          intl.formatMessage(messages.colWaiting),
          intl.formatMessage(messages.colExpires),
          intl.formatMessage(messages.colSubtotal),
          '',
        ]}
      >
        {items.map((quote) => {
          const subtotal = fromCents(quote.subtotal)

          return (
            <tr key={quote.id} className="bb b--muted-5">
              <Cell>
                {/* || on purpose: some quotes have an empty name */}
                {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
                {quote.referenceName || quote.id}
              </Cell>
              <Cell>
                {quote.organizationName ?? quote.organizationId ?? '—'}
              </Cell>
              <Cell>
                <Tag
                  type={quote.waitingOn === 'SELLER' ? 'warning' : 'neutral'}
                  size="small"
                >
                  {intl.formatMessage(
                    quote.waitingOn === 'SELLER'
                      ? messages.waitingOnSeller
                      : messages.waitingOnBuyer
                  )}
                </Tag>
              </Cell>
              <Cell>
                <Waiting
                  since={quote.lastUpdate}
                  now={now}
                  isStale={quote.isStale}
                />
              </Cell>
              <Cell muted>
                {quote.expirationDate
                  ? intl.formatDate(quote.expirationDate, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </Cell>
              <Cell>
                {subtotal === null
                  ? '—'
                  : intl.formatNumber(subtotal, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </Cell>
              <Cell>
                <RowLink href={quoteLink(quote.id)} newTab>
                  {intl.formatMessage(messages.openInStore)}
                </RowLink>
              </Cell>
            </tr>
          )
        })}
      </Table>
    </PanelFrame>
  )
}

export function CreditHoldsPanel({
  data,
  loading,
  error,
  now,
}: State & { data: CreditHoldsPanelData | null }) {
  const intl = useIntl()
  const items = data?.items ?? []

  return (
    <PanelFrame
      id="panel-credit"
      title={intl.formatMessage(messages.creditTitle)}
      subtitle={intl.formatMessage(messages.creditSubtitle)}
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
      emptyText={
        data && !data.available
          ? intl.formatMessage(messages.creditUnavailable)
          : undefined
      }
      shown={items.length}
      total={data?.total}
      truncated={data?.truncated}
    >
      <Table
        headers={[
          intl.formatMessage(messages.colOrder),
          intl.formatMessage(messages.colOrganization),
          intl.formatMessage(messages.colWaiting),
          intl.formatMessage(messages.colTotal),
        ]}
      >
        {items.map((hold) => (
          <tr key={hold.orderId} className="bb b--muted-5">
            <Cell>
              <RowLink href={orderLink(hold.orderId)}>
                <code>{hold.orderId}</code>
              </RowLink>
            </Cell>
            <Cell>{hold.organizationName ?? hold.organizationId}</Cell>
            <Cell>
              <Waiting
                since={hold.heldSince}
                now={now}
                isStale={hold.isStale}
              />
            </Cell>
            <Cell>
              {intl.formatNumber(fromCents(hold.amount) ?? 0, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Cell>
          </tr>
        ))}
      </Table>
    </PanelFrame>
  )
}
