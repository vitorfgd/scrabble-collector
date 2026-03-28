import type { GameItem } from '../../core/types/GameItem.ts'
import {
  randomConsonantLetter,
  randomLetterUniform,
  randomVowelLetter,
} from './letterDistribution.ts'

function normalizeLetter(ch: string): string {
  const u = ch.toUpperCase().replace(/[^A-Z]/g, '')
  return u.slice(0, 1) || 'A'
}

/** Theme-only: letter tile data (value = simple tile weight for economy) */
export function createLetterItem(letter: string, value: number): GameItem {
  return {
    id: crypto.randomUUID(),
    kind: 'collectible',
    type: 'letter',
    letter: normalizeLetter(letter),
    value,
  }
}

export function createRandomLetterItem(): GameItem {
  return createLetterItem(randomLetterUniform(), 1 + Math.floor(Math.random() * 8))
}

/** Spawn only in vowel zones */
export function createVowelLetterItem(): GameItem {
  return createLetterItem(randomVowelLetter(), 1 + Math.floor(Math.random() * 8))
}

/** Spawn only in consonant zones */
export function createConsonantLetterItem(): GameItem {
  return createLetterItem(randomConsonantLetter(), 1 + Math.floor(Math.random() * 8))
}
