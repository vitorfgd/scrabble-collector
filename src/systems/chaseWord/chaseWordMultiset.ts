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
