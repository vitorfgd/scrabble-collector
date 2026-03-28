import {
  CHAIN_COMBO_REWARD_MULT_MAX,
  CHAIN_COMBO_REWARD_PER_STEP,
  CHAIN_COMBO_WINDOW_SEC,
} from './chainComboConfig.ts'

export function getChainComboRewardMult(combo: number): number {
  if (combo <= 1) return 1
  const raw = 1 + (combo - 1) * CHAIN_COMBO_REWARD_PER_STEP
  return Math.min(CHAIN_COMBO_REWARD_MULT_MAX, raw)
}

export type ChainComboStateOptions = {
  /** Called when combo count changes after a chain kill (includes first kill of streak). */
  onComboHit?: (combo: number) => void
  /** Called when the window expires and combo resets to 0. */
  onComboReset?: () => void
}

/**
 * Tracks consecutive chain-only kills; decays the timer each frame.
 */
export class ChainComboState {
  private combo = 0
  private timeLeft = 0
  private readonly onComboHit?: (combo: number) => void
  private readonly onComboReset?: () => void

  constructor(opts: ChainComboStateOptions = {}) {
    this.onComboHit = opts.onComboHit
    this.onComboReset = opts.onComboReset
  }

  getCombo(): number {
    return this.combo
  }

  getTimeLeft(): number {
    return this.timeLeft
  }

  update(dt: number): void {
    if (this.combo <= 0) return
    this.timeLeft -= dt
    if (this.timeLeft <= 0) {
      this.combo = 0
      this.timeLeft = 0
      this.onComboReset?.()
    }
  }

  /**
   * Call once per enemy destroyed by the chain. Refreshes the combo window.
   * Returns combo count after this kill and reward multiplier for this payout.
   */
  registerChainKill(): { combo: number; rewardMult: number } {
    this.combo += 1
    this.timeLeft = CHAIN_COMBO_WINDOW_SEC
    const rewardMult = getChainComboRewardMult(this.combo)
    this.onComboHit?.(this.combo)
    return { combo: this.combo, rewardMult }
  }
}
