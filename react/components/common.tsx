import type { ReactNode } from 'react'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { Alert, PageBlock, Pagination, Spinner, Tag } from 'vtex.styleguide'

import { ageOf, pageOf } from '../utils/panels'
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
  /** Rows the panel holds and the full count, for "Listing the 500 oldest of 900" */
  shown?: number
  total?: number
  truncated?: boolean
  /** The pager under the table */
  footer?: ReactNode
  /** Count tags beside the title, such as "Workflow errors 0" */
  chips?: Array<{ label: string; type: 'error' | 'warning' | 'neutral' }>
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
  footer,
  chips = [],
  children,
}: PanelFrameProps) {
  const intl = useIntl()

  return (
    <section id={id} role="tabpanel" aria-labelledby={`${id}-tab`}>
      <PageBlock
        title={<span id={`${id}-title`}>{title}</span>}
        subtitle={subtitle}
        variation="full"
      >
        {chips.length > 0 && (
          <div className="flex flex-wrap mb4" style={{ gap: 8 }}>
            {chips.map((chip) => (
              <Tag
                key={chip.label}
                type={chip.type}
                variation="low"
                size="small"
              >
                {chip.label}
              </Tag>
            ))}
          </div>
        )}

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
            {footer && <div className="mt4">{footer}</div>}
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

const ROWS_OPTIONS = [10, 25, 50]

/**
 * Pages a panel's rows in the browser, 10 at a time. The server sends every
 * waiting item (up to 500 per panel), so the pager covers the whole list.
 * Goes back to the first page whenever the list changes, such as after a
 * filter or a refresh.
 */
export function usePaged<T>(items: T[]) {
  const intl = useIntl()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(ROWS_OPTIONS[0])

  useEffect(() => setPage(0), [items])

  const slice = pageOf(items.length, page, pageSize)
  const pageItems = items.slice(slice.start, slice.end)

  const pager =
    items.length > ROWS_OPTIONS[0] ? (
      <Pagination
        rowsOptions={ROWS_OPTIONS}
        selectedOption={pageSize}
        currentItemFrom={slice.start + 1}
        currentItemTo={slice.end}
        totalItems={items.length}
        textOf={intl.formatMessage(messages.paginationOf)}
        textShowRows={intl.formatMessage(messages.paginationRows)}
        onRowsChange={(_: unknown, value: string) => {
          setPageSize(Number(value))
          setPage(0)
        }}
        onNextClick={() => setPage(Math.min(slice.page + 1, slice.pages - 1))}
        onPrevClick={() => setPage(Math.max(slice.page - 1, 0))}
      />
    ) : null

  return { pageItems, pager }
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
