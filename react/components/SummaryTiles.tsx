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
  /** The panel has no source yet (credit holds before credit checking) */
  comingSoon?: boolean
}

/**
 * One count per panel. The tiles are the page's tabs: the selected one shows
 * its panel below, so the page stays about one screen high.
 */
export function SummaryTiles({
  tiles,
  selected,
  onSelect,
}: {
  tiles: TileData[]
  selected: string
  onSelect: (panelId: string) => void
}) {
  const intl = useIntl()

  return (
    <div
      role="tablist"
      aria-label={intl.formatMessage(messages.tabsLabel)}
      className="flex flex-wrap nl3 nr3 mb5"
    >
      {tiles.map((tile, index) => {
        const isSelected = tile.panelId === selected

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
          <div key={tile.panelId} className="w-100 w-50-m w-20-l ph3 mb4">
            <button
              type="button"
              role="tab"
              id={`${tile.panelId}-tab`}
              aria-selected={isSelected}
              aria-controls={tile.panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tile.panelId)}
              onKeyDown={(e) => {
                // Arrow keys move between tabs, as in any tab list.
                const step =
                  e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0

                if (!step) return
                const next = tiles[(index + step + tiles.length) % tiles.length]

                onSelect(next.panelId)
                document.getElementById(`${next.panelId}-tab`)?.focus()
              }}
              className={`w-100 h-100 tl pointer br3 pa5 bg-base ${
                isSelected
                  ? 'ba bw1 b--action-primary'
                  : 'ba b--muted-4 hover-b--action-primary'
              }`}
              style={{ font: 'inherit' }}
            >
              <div
                className={`t-small mb3 ${
                  isSelected ? 'c-action-primary b' : 'c-muted-1'
                }`}
              >
                {tile.label}
              </div>
              <div className="t-heading-2 c-on-base mb2">
                {tile.error || tile.comingSoon ? '—' : tile.total ?? '…'}
              </div>
              <div className={`t-small ${detailColor}`}>{detail}</div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
