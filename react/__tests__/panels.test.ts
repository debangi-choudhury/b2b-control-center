import {
  ageOf,
  fromCents,
  isStale,
  pageOf,
  panelError,
  statusLabel,
  summarizeOnboarding,
} from '../utils/panels'

const NOW = new Date('2026-11-18T12:00:00.000Z')

describe('panelError', () => {
  const errors = [
    {
      message: 'Quotes (Master Data) failed (HTTP 403)',
      path: ['logixalpartnerus_b2bcontrolcenter_0_1_0_quotesPanel'],
    },
    { message: 'Invalid organization ID', path: ['problemOrdersPanel'] },
    { message: 'no path' },
  ]

  it('matches prefixed and plain paths', () => {
    expect(panelError(errors, 'quotesPanel')).toBe(
      'Quotes (Master Data) failed (HTTP 403)'
    )
    expect(panelError(errors, 'problemOrdersPanel')).toBe(
      'Invalid organization ID'
    )
  })

  it("doesn't match other fields or partial names", () => {
    expect(panelError(errors, 'creditHoldsPanel')).toBeNull()
    expect(panelError(errors, 'Panel')).toBeNull()
    expect(panelError(undefined, 'quotesPanel')).toBeNull()
  })
})

describe('ageOf', () => {
  it('reports days, hours or under an hour', () => {
    expect(ageOf('2026-11-15T11:00:00Z', NOW)).toEqual({
      unit: 'day',
      count: 3,
    })
    expect(ageOf('2026-11-18T07:30:00Z', NOW)).toEqual({
      unit: 'hour',
      count: 4,
    })
    expect(ageOf('2026-11-18T11:30:00Z', NOW)).toEqual({
      unit: 'lessThanHour',
      count: 0,
    })
  })

  it('handles future and bad dates', () => {
    expect(ageOf('2026-11-19T00:00:00Z', NOW)).toEqual({
      unit: 'lessThanHour',
      count: 0,
    })
    expect(ageOf('nope', NOW)).toBeNull()
  })
})

describe('isStale', () => {
  it('uses the threshold in hours', () => {
    expect(isStale('2026-11-17T11:00:00Z', NOW, 24)).toBe(true)
    expect(isStale('2026-11-17T13:00:00Z', NOW, 24)).toBe(false)
    expect(isStale('2026-11-18T09:00:00Z', NOW, 2)).toBe(true)
    expect(isStale(null, NOW, 24)).toBe(false)
  })
})

describe('summarizeOnboarding', () => {
  const stages = [
    { id: 'documents', label: 'Document review', type: 'REVIEW' },
    { id: 'final', label: 'Final approval', type: 'APPROVAL' },
  ]

  const app = (
    id: string,
    stage: number,
    submittedAt: string,
    updatedAt?: string
  ) => ({
    id,
    reference: `APP-${id}`,
    companyName: `Company ${id}`,
    currentStageIndex: stage,
    stages,
    submittedAt,
    updatedAt,
  })

  it('sorts by last change, counts stages and flags stale rows', () => {
    const summary = summarizeOnboarding(
      [
        app('new', 0, '2026-11-18T10:00:00Z'),
        app('old', 1, '2026-11-01T10:00:00Z', '2026-11-16T10:00:00Z'),
        app('mid', 0, '2026-11-10T10:00:00Z', '2026-11-17T20:00:00Z'),
      ],
      NOW,
      24
    )

    expect(summary.rows.map((r) => r.id)).toEqual(['old', 'mid', 'new'])
    expect(summary.rows[0]).toMatchObject({
      stageLabel: 'Final approval',
      stageType: 'APPROVAL',
      waitingSince: '2026-11-16T10:00:00Z',
      isStale: true,
    })
    expect(summary.stale).toBe(1)
    expect(summary.byStage).toEqual([
      { label: 'Final approval', count: 1 },
      { label: 'Document review', count: 2 },
    ])
  })

  it('copes with a missing stage', () => {
    const summary = summarizeOnboarding(
      [{ ...app('x', 5, '2026-11-18T10:00:00Z'), stages: null }],
      NOW,
      24
    )

    expect(summary.rows[0].stageLabel).toBeNull()
    expect(summary.byStage).toEqual([{ label: '—', count: 1 }])
  })
})

describe('statusLabel', () => {
  it('turns OMS status codes into words', () => {
    expect(statusLabel('ready-for-handling')).toBe('Ready for handling')
    expect(statusLabel('handling')).toBe('Handling')
    expect(statusLabel('')).toBe('')
  })
})

describe('fromCents', () => {
  it('converts cents and keeps missing values missing', () => {
    expect(fromCents(123456)).toBe(1234.56)
    expect(fromCents(null)).toBeNull()
  })
})

describe('pageOf', () => {
  it('slices pages and clamps out-of-range pages', () => {
    expect(pageOf(221, 0, 10)).toEqual({
      page: 0,
      pages: 23,
      start: 0,
      end: 10,
    })
    expect(pageOf(221, 22, 10)).toEqual({
      page: 22,
      pages: 23,
      start: 220,
      end: 221,
    })
    expect(pageOf(221, 99, 10).page).toBe(22)
    expect(pageOf(23, -1, 25)).toEqual({ page: 0, pages: 1, start: 0, end: 23 })
  })

  it('handles an empty list', () => {
    expect(pageOf(0, 3, 10)).toEqual({ page: 0, pages: 1, start: 0, end: 0 })
  })
})
