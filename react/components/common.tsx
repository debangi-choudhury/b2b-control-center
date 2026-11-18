import type { ReactNode } from 'react'
import React from 'react'
import { useIntl } from 'react-intl'
import { Alert, PageBlock, Spinner, Tag } from 'vtex.styleguide'

import { ageOf } from '../utils/panels'
import { messages } from '../utils/messages'

interface PanelFrameProps {
  id: string
  title: ReactNode
  subtitle: ReactNode
  loading: boolean
  error: string | null
  isEmpty: boolean
  /** Lines under the subtitle: counts, notes */
  notes?: ReactNode[]
  /** Shown instead of "Nothing waiting" when the panel has nothing to show */
  emptyText?: ReactNode
  /** Rows shown and the full count, for "Showing the 50 oldest of 221" */
  shown?: number
  total?: number
  truncated?: boolean
  children?: ReactNode
}

/** One dashboard panel, with explicit loading, error and empty states. */
export function PanelFrame({
  id,
  title,
  subtitle,
  loading,
  error,
  isEmpty,
  notes = [],
  emptyText,
  shown,
  total,
  truncated,
  children,
}: PanelFrameProps) {
  const intl = useIntl()

  return (
    <section id={id} aria-labelledby={`${id}-title`}>
      <PageBlock
        title={<span id={`${id}-title`}>{title}</span>}
        subtitle={subtitle}
        variation="full"
      >
        {notes.filter(Boolean).map((note, i) => (
          <p key={i} className="t-small c-muted-1 mt0 mb3">
            {note}
          </p>
        ))}

        {error && (
          <Alert type="error">
            {intl.formatMessage(messages.loadError, { message: error })}
          </Alert>
        )}

        {!error && loading && (
          <div className="flex justify-center pa6">
            <Spinner />
          </div>
        )}

        {!error && !loading && isEmpty && (
          <p className="t-body c-muted-1 tc pa6 ma0">
            {emptyText ?? intl.formatMessage(messages.empty)}
          </p>
        )}

        {!error && !loading && !isEmpty && (
          <>
            <div className="overflow-x-auto">{children}</div>
            {typeof shown === 'number' &&
              typeof total === 'number' &&
              shown < total && (
                <p className="t-small c-muted-1 mt4 mb0">
                  {intl.formatMessage(messages.showing, { shown, total })}
                </p>
              )}
          </>
        )}

        {!error && truncated && (
          <p className="t-small c-warning mt3 mb0">
            {intl.formatMessage(messages.truncated)}
          </p>
        )}
      </PageBlock>
    </section>
  )
}

export function Table({
  headers,
  children,
}: {
  headers: ReactNode[]
  children: ReactNode
}) {
  return (
    <table className="w-100 t-small" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr className="tl c-muted-1 bb b--muted-4">
          {headers.map((header, i) => (
            <th key={i} scope="col" className="pa3 normal nowrap">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Cell({
  children,
  muted,
}: {
  children?: ReactNode
  muted?: boolean
}) {
  return (
    <td className={`pa3 v-mid ${muted ? 'c-muted-1' : 'c-on-base'}`}>
      {children}
    </td>
  )
}

/** "3 days", with a warning tag when it's past the threshold */
export function Waiting({
  since,
  now,
  isStale,
}: {
  since: string
  now: Date
  isStale: boolean
}) {
  const intl = useIntl()
  const age = ageOf(since, now)

  const text = !age
    ? '—'
    : age.unit === 'day'
    ? intl.formatMessage(messages.ageDays, { count: age.count })
    : age.unit === 'hour'
    ? intl.formatMessage(messages.ageHours, { count: age.count })
    : intl.formatMessage(messages.ageLessThanHour)

  return (
    <span className="flex items-center nowrap">
      <span
        className="mr3"
        title={intl.formatDate(since, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      >
        {text}
      </span>
      {isStale && (
        <Tag type="warning" size="small" variation="low">
          {intl.formatMessage(messages.tooLong)}
        </Tag>
      )}
    </span>
  )
}

/**
 * A link to where the row is handled. Admin pages outside this app open in
 * the whole window, since IO Admin pages can run in a frame; store pages open
 * in a new tab.
 */
export function RowLink({
  href,
  children,
  newTab,
}: {
  href: string
  children: ReactNode
  newTab?: boolean
}) {
  return (
    <a
      className="c-link no-underline hover-c-link-hover"
      href={href}
      target={newTab ? '_blank' : '_top'}
      rel={newTab ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  )
}
