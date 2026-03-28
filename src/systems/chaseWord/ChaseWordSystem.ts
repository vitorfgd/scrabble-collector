import type { GameItem } from '../../core/types/GameItem.ts'
import type { Economy } from '../economy/Economy.ts'
import type { ItemSpawnMode } from '../items/spawnMode.ts'
import { computeChaseWordBonus } from './chaseWordConfig.ts'
import { pickRandomChaseWord } from './chaseWordList.ts'
import {
  countLetterMultiset,
  formatChaseProgressMask,
  multisetCovers,
  multisetNeedFromWord,
} from './chaseWordMultiset.ts'

export type ChaseWordDepositResult = {
  chaseCompleted: boolean
  completedWord: string | null
  bonusCredits: number
}

/**
 * Letter-mode only: one active target word; multiset match on deposit grants bonus + new word.
 */
export class ChaseWordSystem {
  private activeWord: string | null = null
  private readonly getSpawnMode: () => ItemSpawnMode
  private readonly economy: Economy
  private readonly onStateChanged: () => void

  constructor(opts: {
    getSpawnMode: () => ItemSpawnMode
    economy: Economy
    onStateChanged: () => void
  }) {
    this.getSpawnMode = opts.getSpawnMode
    this.economy = opts.economy
    this.onStateChanged = opts.onStateChanged
  }

  /** Mode switch or init: letter mode gets a word; crystal clears. */
  syncMode(): void {
    if (this.getSpawnMode() !== 'letter') {
      this.activeWord = null
      this.onStateChanged()
      return
    }
    if (!this.activeWord) {
      this.activeWord = pickRandomChaseWord()
    }
    this.onStateChanged()
  }

  getActiveTarget(): string | null {
    return this.getSpawnMode() === 'letter' ? this.activeWord : null
  }

  /** Progress line e.g. "S _ O _ E" from current held letter items */
  getProgressLine(heldItems: readonly GameItem[]): string {
    const target = this.getActiveTarget()
    if (!target) return ''
    const letters = heldItems
      .filter((i): i is Extract<GameItem, { type: 'letter' }> => i.type === 'letter')
      .map((i) => i.letter)
    const pool = countLetterMultiset(letters)
    return formatChaseProgressMask(target, pool)
  }

  /**
   * After a deposit batch resolves (normal credits already applied).
   * If letter multiset of this deposit covers the chase multiset, award bonus and roll target.
   */
  processLetterDeposit(items: GameItem[]): ChaseWordDepositResult {
    if (this.getSpawnMode() !== 'letter' || !this.activeWord) {
      return { chaseCompleted: false, completedWord: null, bonusCredits: 0 }
    }

    const target = this.activeWord
    const need = multisetNeedFromWord(target)
    const depositLetters = items
      .filter((i): i is Extract<GameItem, { type: 'letter' }> => i.type === 'letter')
      .map((i) => i.letter)
    if (depositLetters.length === 0) {
      return { chaseCompleted: false, completedWord: null, bonusCredits: 0 }
    }

    const pool = countLetterMultiset(depositLetters)
    if (!multisetCovers(need, pool)) {
      return { chaseCompleted: false, completedWord: null, bonusCredits: 0 }
    }

    const bonus = computeChaseWordBonus(target.length)
    this.economy.addMoney(bonus)
    const completedWord = target
    this.activeWord = pickRandomChaseWord(target)
    this.onStateChanged()

    return {
      chaseCompleted: true,
      completedWord,
      bonusCredits: bonus,
    }
  }
}
