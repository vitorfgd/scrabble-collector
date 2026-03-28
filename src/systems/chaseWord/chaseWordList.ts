/**
 * Short, readable targets for hypercasual pacing (fits typical carry limits).
 * All uppercase; 3–6 letters.
 */
export const CHASE_WORD_BANK: readonly string[] = [
  'CAT',
  'DOG',
  'SUN',
  'STAR',
  'MOON',
  'GOLD',
  'TREE',
  'STONE',
  'HEART',
  'WATER',
  'LIGHT',
  'DREAM',
  'HAPPY',
  'PEACE',
  'MAGIC',
  'POWER',
  'STORM',
  'GREEN',
  'TIGER',
  'EAGLE',
  'MUSIC',
  'SMILE',
  'BRAVE',
  'OCEAN',
  'FLAME',
]

export function pickRandomChaseWord(exclude?: string): string {
  const filtered = exclude
    ? CHASE_WORD_BANK.filter((w) => w !== exclude)
    : [...CHASE_WORD_BANK]
  const pool = filtered.length > 0 ? filtered : [...CHASE_WORD_BANK]
  return pool[Math.floor(Math.random() * pool.length)]!
}
