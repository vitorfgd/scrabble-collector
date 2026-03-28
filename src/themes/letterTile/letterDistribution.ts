const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const VOWELS = 'AEIOU'
/** B…Z excluding vowels */
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'

/** Uniform random A–Z; swap for Scrabble-style weights later without changing callers */
export function randomLetterUniform(): string {
  return ALPHABET[Math.floor(Math.random() * 26)]!
}

export function randomVowelLetter(): string {
  return VOWELS[Math.floor(Math.random() * VOWELS.length)]!
}

export function randomConsonantLetter(): string {
  return CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]!
}
