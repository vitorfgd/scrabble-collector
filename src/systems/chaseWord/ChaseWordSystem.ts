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
 * Letters found toward the target persist in progress until the chase is completed (deposit),
 * not only while held on the stack.
 */
export class ChaseWordSystem {
  private activeWord: string | null = null
  /** Letters collected toward the current target (capped per multiset need); survives deposits */
  private readonly bankedTowardChase = new Map<string, number>()
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
      this.bankedTowardChase.clear()
      this.onStateChanged()
      return
    }
    if (!this.activeWord) {
      this.activeWord = pickRandomChaseWord()
      this.bankedTowardChase.clear()
    }
    this.onStateChanged()
  }

  getActiveTarget(): string | null {
    return this.getSpawnMode() === 'letter' ? this.activeWord : null
  }

  /**
   * Call when a new item is collected (pickup). Banks letters that count toward the chase.
   */
  onLetterCollected(item: GameItem): void {
    if (this.getSpawnMode() !== 'letter' || !this.activeWord || item.type !== 'letter') {
      return
    }
    const need = multisetNeedFromWord(this.activeWord)
    const raw = item.letter.toUpperCase().replace(/[^A-Z]/g, '')
    const ch = raw.slice(0, 1)
    if (!ch) return
    const cap = need.get(ch)
    if (cap === undefined) return
    const cur = this.bankedTowardChase.get(ch) ?? 0
    if (cur >= cap) return
    this.bankedTowardChase.set(ch, cur + 1)
    this.onStateChanged()
  }

  /** Progress line e.g. "S _ O _ E" from letters banked toward this chase */
  getProgressLine(): string {
    const target = this.getActiveTarget()
    if (!target) return ''
    return formatChaseProgressMask(target, this.bankedTowardChase)
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
    this.bankedTowardChase.clear()
    this.activeWord = pickRandomChaseWord(target)
    this.onStateChanged()

    return {
      chaseCompleted: true,
      completedWord,
      bonusCredits: bonus,
    }
  }
}
