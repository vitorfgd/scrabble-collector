/**
 * Letter multiset helpers for chase matching (order-free) and progress display.
 */

export function countLetterMultiset(letters: Iterable<string>): Map<string, number> {
  const m = new Map<string, number>()
  for (const raw of letters) {
    const ch = raw.toUpperCase().replace(/[^A-Z]/g, '')
    if (ch.length !== 1) continue
    const c = ch[0]!
    m.set(c, (m.get(c) ?? 0) + 1)
  }
  return m
}

export function multisetNeedFromWord(word: string): Map<string, number> {
  return countLetterMultiset(word.toUpperCase().split(''))
}

/** True if `pool` contains at least the counts in `need` (chase letters ⊆ deposit multiset). */
export function multisetCovers(
  need: Map<string, number>,
  pool: Map<string, number>,
): boolean {
  for (const [ch, n] of need) {
    if ((pool.get(ch) ?? 0) < n) return false
  }
  return true
}

/** Exact multiset equality (same letter counts). */
export function multisetEquals(
  need: Map<string, number>,
  pool: Map<string, number>,
): boolean {
  if (need.size !== pool.size) return false
  for (const [ch, n] of need) {
    if ((pool.get(ch) ?? 0) !== n) return false
  }
  return true
}

/**
 * Add this deposit's letter counts toward `cumulative`, capped per letter by `need`
 * (only letters in the chase word count).
 */
export function mergeDepositIntoCumulative(
  need: Map<string, number>,
  cumulative: Map<string, number>,
  depositPool: Map<string, number>,
): void {
  for (const [ch, cap] of need) {
    const add = depositPool.get(ch) ?? 0
    if (add === 0) continue
    const cur = cumulative.get(ch) ?? 0
    cumulative.set(ch, Math.min(cap, cur + add))
  }
}

/**
 * Greedy left-to-right: for each chase letter, consume from pool if available, else "_".
 * Example: STONE + pool {S,O,E} → "S _ O _ E"
 */
export function formatChaseProgressMask(
  chaseWordUpper: string,
  pool: Map<string, number>,
): string {
  const p = new Map(pool)
  const parts: string[] = []
  for (const raw of chaseWordUpper.toUpperCase()) {
    const n = p.get(raw) ?? 0
    if (n > 0) {
      p.set(raw, n - 1)
      parts.push(raw)
    } else {
      parts.push('_')
    }
  }
  return parts.join(' ')
}
