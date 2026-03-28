import type { GameItem } from '../../core/types/GameItem.ts'
import type { Economy } from '../economy/Economy.ts'
import type { ItemSpawnMode } from '../items/spawnMode.ts'
import { computeChaseWordBonus } from './chaseWordConfig.ts'
import { pickRandomChaseWord } from './chaseWordList.ts'
import {
  countLetterMultiset,
  formatChaseProgressMask,
  mergeDepositIntoCumulative,
  multisetCovers,
  multisetEquals,
  multisetNeedFromWord,
} from './chaseWordMultiset.ts'

export type ChaseWordDepositResult = {
  chaseCompleted: boolean
  completedWord: string | null
  bonusCredits: number
}

/**
 * Letter-mode only: one active target word; cumulative deposits toward the multiset grant bonus + new word.
 * Letters found toward the target persist in progress until the chase is completed,
 * not only while held on the stack.
 */
export class ChaseWordSystem {
  private activeWord: string | null = null
  /** Letters collected toward the current target (capped per multiset need); survives deposits */
  private readonly bankedTowardChase = new Map<string, number>()
  /** Letters deposited toward the current target (across multiple deposit trips); capped by need */
  private readonly depositedTowardChase = new Map<string, number>()
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
      this.depositedTowardChase.clear()
      this.onStateChanged()
      return
    }
    if (!this.activeWord) {
      this.activeWord = pickRandomChaseWord()
      this.bankedTowardChase.clear()
      this.depositedTowardChase.clear()
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

  /**
   * When pellets are lost from the carry stack (e.g. ghost hit), reverse banked chase
   * counts for removed letter items — mirrors `onLetterCollected` for popped items.
   */
  onLettersRemovedFromCarry(items: readonly GameItem[]): void {
    if (this.getSpawnMode() !== 'letter' || !this.activeWord) return
    const need = multisetNeedFromWord(this.activeWord)
    for (const item of items) {
      if (item.type !== 'letter') continue
      const raw = item.letter.toUpperCase().replace(/[^A-Z]/g, '')
      const ch = raw.slice(0, 1)
      if (!ch || !need.has(ch)) continue
      const cur = this.bankedTowardChase.get(ch) ?? 0
      if (cur > 0) this.bankedTowardChase.set(ch, cur - 1)
    }
    this.onStateChanged()
  }

  /** Progress line e.g. "S _ O _ E" from letters banked toward this chase */
  getProgressLine(): string {
    const target = this.getActiveTarget()
    if (!target) return ''
    return formatChaseProgressMask(target, this.bankedTowardChase)
  }

  /** Count of "_" tokens for “close to complete” juice */
  getChaseGapCount(): number {
    const line = this.getProgressLine()
    if (!line) return 99
    return line.split(' ').filter((x) => x === '_').length
  }

  /**
   * Read-only: would this deposit batch complete the chase, and is it a perfect multiset match?
   */
  previewOverloadAfterDeposit(items: GameItem[]): {
    completesChase: boolean
    perfectChase: boolean
  } {
    if (this.getSpawnMode() !== 'letter' || !this.activeWord) {
      return { completesChase: false, perfectChase: false }
    }
    const target = this.activeWord
    const need = multisetNeedFromWord(target)
    const depositLetters = items
      .filter((i): i is Extract<GameItem, { type: 'letter' }> => i.type === 'letter')
      .map((i) => i.letter)
    if (depositLetters.length === 0) {
      return { completesChase: false, perfectChase: false }
    }
    const poolFull = countLetterMultiset(depositLetters)
    const poolRelevant = new Map<string, number>()
    for (const [ch, n] of poolFull) {
      if (need.has(ch)) poolRelevant.set(ch, n)
    }
    const remainingNeed = new Map<string, number>()
    for (const [ch, n] of need) {
      const have = this.depositedTowardChase.get(ch) ?? 0
      const r = n - have
      if (r > 0) remainingNeed.set(ch, r)
    }
    const temp = new Map(this.depositedTowardChase)
    mergeDepositIntoCumulative(need, temp, poolFull)
    const completesChase = multisetCovers(need, temp)
    const perfectChase =
      completesChase && multisetEquals(remainingNeed, poolRelevant)
    return { completesChase, perfectChase }
  }

  /**
   * After a deposit batch resolves (normal credits already applied).
   * Chase letters from this deposit merge into a running total; when that covers the multiset,
   * award bonus and roll target (works across several partial deposits).
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
    mergeDepositIntoCumulative(need, this.depositedTowardChase, pool)
    if (!multisetCovers(need, this.depositedTowardChase)) {
      return { chaseCompleted: false, completedWord: null, bonusCredits: 0 }
    }

    const bonus = computeChaseWordBonus(target.length)
    this.economy.addMoney(bonus)
    const completedWord = target
    this.bankedTowardChase.clear()
    this.depositedTowardChase.clear()
    this.activeWord = pickRandomChaseWord(target)
    this.onStateChanged()

    return {
      chaseCompleted: true,
      completedWord,
      bonusCredits: bonus,
    }
  }
}
