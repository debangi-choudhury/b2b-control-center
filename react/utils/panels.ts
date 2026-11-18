/**
 * Pure helpers for the dashboard page, kept free of React so they can be
 * tested.
 */

export const DEFAULT_STALE_AFTER_HOURS = 24
export const PANEL_LIMIT = 50

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export interface GraphQLErrorLike {
  message: string
  path?: ReadonlyArray<string | number>
}

/**
 * The error for one panel, if its query failed. The gateway reports the path
 * with the provider's prefix, such as
 * "logixalpartnerus_b2bcontrolcenter_0_1_0_quotesPanel", so this matches the
 * end of the first path element.
 */
export function panelError(
  errors: readonly GraphQLErrorLike[] | undefined,
  field: string
): string | null {
  const error = errors?.find((e) => {
    const first = e.path?.[0]

    return (
      typeof first === 'string' &&
      (first === field || first.endsWith(`_${field}`))
    )
  })

  return error ? error.message : null
}

export type Age = { unit: 'day' | 'hour' | 'lessThanHour'; count: number }

/** How long something has been waiting, in whole days or hours. */
export function ageOf(since: string, now: Date): Age | null {
  const time = Date.parse(since)

  if (Number.isNaN(time)) {
    return null
  }

  const elapsed = Math.max(0, now.getTime() - time)

  if (elapsed >= DAY) {
    return { unit: 'day', count: Math.floor(elapsed / DAY) }
  }

  if (elapsed >= HOUR) {
    return { unit: 'hour', count: Math.floor(elapsed / HOUR) }
  }

  return { unit: 'lessThanHour', count: 0 }
}

export function isStale(
  since: string | null | undefined,
  now: Date,
  hours: number
) {
  if (!since) {
    return false
  }

  const time = Date.parse(since)

  return !Number.isNaN(time) && time < now.getTime() - hours * HOUR
}

export interface OnboardingApplication {
  id: string
  reference: string
  companyName: string
  currentStageIndex: number | null
  stages: Array<{ id: string; label: string; type: string }> | null
  submittedAt: string
  updatedAt?: string | null
}

export interface OnboardingRow {
  id: string
  reference: string
  companyName: string
  stageLabel: string | null
  stageType: string | null
  waitingSince: string
  isStale: boolean
}

/**
 * The onboarding panel, built in the page because the server can't read
 * b2b-onboarding. Same rules as the server's panels: the clock starts at the
 * last change, rows are oldest first, and the counts cover every application.
 */
export function summarizeOnboarding(
  applications: OnboardingApplication[],
  now: Date,
  staleAfterHours: number
) {
  const rows: OnboardingRow[] = applications
    .map((app) => {
      const stage =
        app.stages &&
        app.currentStageIndex !== null &&
        app.currentStageIndex >= 0
          ? app.stages[app.currentStageIndex] ?? null
          : null

      const waitingSince = app.updatedAt ?? app.submittedAt

      return {
        id: app.id,
        reference: app.reference,
        companyName: app.companyName,
        stageLabel: stage?.label ?? null,
        stageType: stage?.type ?? null,
        waitingSince,
        isStale: isStale(waitingSince, now, staleAfterHours),
      }
    })
    .sort((a, b) => Date.parse(a.waitingSince) - Date.parse(b.waitingSince))

  const byStage = new Map<string, number>()

  for (const row of rows) {
    const label = row.stageLabel ?? '—'

    byStage.set(label, (byStage.get(label) ?? 0) + 1)
  }

  return {
    stale: rows.filter((r) => r.isStale).length,
    byStage: [...byStage.entries()].map(([label, count]) => ({ label, count })),
    rows: rows.slice(0, PANEL_LIMIT),
  }
}

/**
 * An OMS status code as words: "ready-for-handling" becomes "Ready for
 * handling". OMS's own statusDescription follows the account's locale
 * (Portuguese here), so the dashboard doesn't use it.
 */
export function statusLabel(status: string): string {
  const words = status.replace(/-/g, ' ').trim()

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : status
}

/** OMS and B2B Quotes store amounts in cents. */
export function fromCents(value: number | null | undefined): number | null {
  return typeof value === 'number' ? value / 100 : null
}
