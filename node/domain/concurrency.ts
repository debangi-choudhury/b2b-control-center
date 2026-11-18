/** Maps over items with at most `limit` calls in flight, keeping order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++

      // eslint-disable-next-line no-await-in-loop
      results[index] = await fn(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )

  return results
}

/**
 * Memoizes one value per request. GraphQL resolves the panels with the same
 * context object, so the organization list and settings load once even when
 * several panels need them.
 */
export function perRequest<V>() {
  const cache = new WeakMap<object, Promise<V>>()

  return (ctx: object, load: () => Promise<V>): Promise<V> => {
    let value = cache.get(ctx)

    if (!value) {
      value = load()
      cache.set(ctx, value)
    }

    return value
  }
}
