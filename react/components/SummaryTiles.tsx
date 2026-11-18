import React from 'react'
import { useIntl } from 'react-intl'

import { messages } from '../utils/messages'

export interface TileData {
  panelId: string
  label: string
  /** null while loading */
  total: number | null
  stale: number | null
  error: boolean
  /** The panel has no source yet (credit holds before B2B-041) */
  comingSoon?: boolean
}

/** One count per panel; each tile jumps to its panel. */
export function SummaryTiles({ tiles }: { tiles: TileData[] }) {
  const intl = useIntl()

  return (
    <nav className="flex flex-wrap nl3 nr3 mb5" aria-label="Summary">
      {tiles.map((tile) => {
        const detail = tile.error
          ? intl.formatMessage(messages.tileError)
          : tile.comingSoon
          ? intl.formatMessage(messages.tileComingSoon)
          : tile.stale === null
          ? ' '
          : tile.stale > 0
          ? intl.formatMessage(messages.tileStale, { count: tile.stale })
          : intl.formatMessage(messages.tileNoneStale)

        const detailColor = tile.error
          ? 'c-danger'
          : tile.stale
          ? 'c-warning'
          : 'c-muted-1'

        return (
          <a
            key={tile.panelId}
            href={`#${tile.panelId}`}
            className="no-underline w-100 w-50-m w-20-l ph3 mb4"
            onClick={(e) => {
              // Scroll inside the Admin frame without changing its route.
              e.preventDefault()
              document
                .getElementById(tile.panelId)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <div className="bg-base ba b--muted-4 br3 pa5 h-100 hover-b--action-primary">
              <div className="t-small c-muted-1 mb3">{tile.label}</div>
              <div className="t-heading-2 c-on-base mb2">
                {tile.error || tile.comingSoon ? '—' : tile.total ?? '…'}
              </div>
              <div className={`t-small ${detailColor}`}>{detail}</div>
            </div>
          </a>
        )
      })}
    </nav>
  )
}
