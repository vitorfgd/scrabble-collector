/** Letter sources pick vowels vs consonants; ignored in crystal mode */
export type LetterSourceKind = 'vowel' | 'consonant'

export type SourceNodeConfig = {
  id: string
  worldX: number
  worldZ: number
  /** Items spawn within this radius (matches gameplay circle) */
  spawnRadius: number
  /** Visual ring uses this radius (typically slightly larger than spawn) */
  ringRadius: number
  letterKind: LetterSourceKind
}
