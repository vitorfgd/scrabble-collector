import {
  createConsonantLetterItem,
  createVowelLetterItem,
} from '../../themes/letterTile/itemFactory.ts'
import { LetterZoneRegistry } from './LetterZoneRegistry.ts'

/** Matches split ground in SceneSetup: vowel tint on x <= 0, consonant on x > 0 */
export function createDefaultLetterZoneRegistry(): LetterZoneRegistry {
  return new LetterZoneRegistry([
    {
      id: 'vowel',
      contains: (x, _z) => x <= 0,
      spawn: () => createVowelLetterItem(),
    },
    {
      id: 'consonant',
      contains: (x, _z) => x > 0,
      spawn: () => createConsonantLetterItem(),
    },
  ])
}
