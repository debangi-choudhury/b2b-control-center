import { mapLimit, perRequest } from '../domain/concurrency'
import {
  chunk,
  DEFAULT_STALE_AFTER_HOURS,
  isSafeId,
  isStale,
  oldestFirst,
  orderProblem,
  quoteWaitingOn,
  sortOrderProblems,
  staleAfterHours,
  staleCutoff,
  waitingQuotesWhere,
} from '../domain/rules'

const NOW = new Date('2026-11-18T12:00:00.000Z')
const CUTOFF = staleCutoff(NOW, 24)

describe('staleAfterHours', () => {
  it('reads a valid setting', () => {
    expect(staleAfterHours({ staleAfterHours: 48 })).toBe(48)
    expect(staleAfterHours({ staleAfterHours: '6' })).toBe(6)
  })

  it.each([
    undefined,
    null,
    {},
    { staleAfterHours: 0 },
    { staleAfterHours: 1.5 },
    { staleAfterHours: 721 },
    { staleAfterHours: 'x' },
  ])('falls back to the default for %p', (settings) => {
    expect(staleAfterHours(settings)).toBe(DEFAULT_STALE_AFTER_HOURS)
  })
})

describe('isStale', () => {
  it('compares against the cutoff', () => {
    expect(CUTOFF.toISOString()).toBe('2026-11-17T12:00:00.000Z')
    expect(isStale('2026-11-17T11:59:59.000Z', CUTOFF)).toBe(true)
    expect(isStale('2026-11-17T12:00:01.000Z', CUTOFF)).toBe(false)
  })

  it('never flags missing or bad dates', () => {
    expect(isStale(undefined, CUTOFF)).toBe(false)
    expect(isStale('', CUTOFF)).toBe(false)
    expect(isStale('not a date', CUTOFF)).toBe(false)
  })
})

describe('oldestFirst', () => {
  it('sorts by date and puts bad dates last without mutating', () => {
    const rows = [{ d: '2026-11-10' }, { d: 'bad' }, { d: '2026-11-01' }]

    expect(oldestFirst(rows, (r) => r.d).map((r) => r.d)).toEqual([
      '2026-11-01',
      '2026-11-10',
      'bad',
    ])
    expect(rows[0].d).toBe('2026-11-10')
  })
})

describe('chunk', () => {
  it('splits into groups', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 20)).toEqual([])
  })
})

describe('orderProblem', () => {
  const recent = '2026-11-18T10:00:00.000Z'
  const old = '2026-11-15T10:00:00.000Z'

  it('puts workflow errors before retries before waiting', () => {
    expect(
      orderProblem(
        {
          status: 'handling',
          lastChange: old,
          workflowInErrorState: true,
          workflowInRetry: true,
        },
        CUTOFF
      )
    ).toBe('WORKFLOW_ERROR')
    expect(
      orderProblem(
        { status: 'handling', lastChange: recent, workflowInRetry: true },
        CUTOFF
      )
    ).toBe('WORKFLOW_RETRY')
    expect(orderProblem({ status: 'handling', lastChange: old }, CUTOFF)).toBe(
      'STALE'
    )
  })

  it('ignores healthy recent orders', () => {
    expect(
      orderProblem(
        { status: 'handling', lastChange: recent, workflowInErrorState: false },
        CUTOFF
      )
    ).toBeNull()
  })

  it('sorts errors first, then oldest first', () => {
    const sorted = sortOrderProblems([
      { id: 'a', problem: 'STALE' as const, lastChange: '2026-11-01' },
      { id: 'b', problem: 'WORKFLOW_ERROR' as const, lastChange: '2026-11-10' },
      { id: 'c', problem: 'WORKFLOW_ERROR' as const, lastChange: '2026-11-05' },
      { id: 'd', problem: 'WORKFLOW_RETRY' as const, lastChange: '2026-11-02' },
    ])

    expect(sorted.map((r) => r.id)).toEqual(['c', 'b', 'd', 'a'])
  })
})

describe('quoteWaitingOn', () => {
  it('assigns pending and revised to the seller', () => {
    expect(quoteWaitingOn('pending', null, NOW)).toBe('SELLER')
    expect(quoteWaitingOn('revised', '2026-01-01', NOW)).toBe('SELLER')
  })

  it('assigns ready quotes to the buyer until they expire', () => {
    expect(quoteWaitingOn('ready', '2026-12-01T00:00:00Z', NOW)).toBe('BUYER')
    expect(quoteWaitingOn('ready', '2026-11-01T00:00:00Z', NOW)).toBeNull()
  })

  it('ignores finished quotes', () => {
    for (const status of ['placed', 'declined', 'expired']) {
      expect(quoteWaitingOn(status, '2026-12-01', NOW)).toBeNull()
    }
  })
})

describe('waitingQuotesWhere', () => {
  it('builds the seller filter', () => {
    expect(waitingQuotesWhere({ waitingOn: 'SELLER', now: NOW })).toBe(
      '(status=pending OR status=revised)'
    )
  })

  it('builds the buyer filter with expiry, organization and staleness', () => {
    expect(
      waitingQuotesWhere({
        waitingOn: 'BUYER',
        now: NOW,
        organizationId: '93ac5670-710f-11ef-b37f-c002565a6dc5',
        updatedBefore: CUTOFF,
      })
    ).toBe(
      'status=ready AND expirationDate>2026-11-18T12:00:00.000Z AND organization=93ac5670-710f-11ef-b37f-c002565a6dc5 AND lastUpdate<2026-11-17T12:00:00.000Z'
    )
  })

  it('refuses organization IDs that could change the filter', () => {
    expect(() =>
      waitingQuotesWhere({
        waitingOn: 'SELLER',
        now: NOW,
        organizationId: 'x OR status=placed',
      })
    ).toThrow()
  })
})

describe('isSafeId', () => {
  it('accepts UUIDs and rejects everything else', () => {
    expect(isSafeId('bcffde34-217f-44ac-b7ad-95fd3ea9a526')).toBe(true)
    expect(isSafeId('a b')).toBe(false)
    expect(isSafeId('a,b')).toBe(false)
    expect(isSafeId('')).toBe(false)
    expect(isSafeId(42)).toBe(false)
    expect(isSafeId('x'.repeat(65))).toBe(false)
  })
})

describe('mapLimit', () => {
  it('keeps order and caps calls in flight', async () => {
    let inFlight = 0
    let peak = 0

    const result = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5 * (8 - n)))
      inFlight--

      return n * 10
    })

    expect(result).toEqual([10, 20, 30, 40, 50, 60, 70])
    expect(peak).toBe(3)
  })

  it('handles an empty list', async () => {
    expect(await mapLimit([], 3, async () => 1)).toEqual([])
  })
})

describe('perRequest', () => {
  it('loads once per context', async () => {
    const once = perRequest<number>()
    const load = jest.fn(async () => 7)
    const a = {}
    const b = {}

    await Promise.all([once(a, load), once(a, load), once(b, load)])

    expect(load).toHaveBeenCalledTimes(2)
  })
})
