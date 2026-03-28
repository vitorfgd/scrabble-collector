import type { GameItem } from '../../core/types/GameItem.ts'

/**
 * Carried item list (order = collection order: oldest → newest).
 * Same semantics as the former stack for deposit / HUD / upgrades.
 */
export class ChainSystem {
  private readonly items: GameItem[] = []
  private max: number
  private readonly onChange?: () => void

  constructor(max: number, onChange?: () => void) {
    this.max = max
    this.onChange = onChange
  }

  get maxCapacity(): number {
    return this.max
  }

  /** Raises cap; never below current carried count */
  setMaxCapacity(max: number): void {
    const n = Math.max(this.items.length, Math.max(1, Math.floor(max)))
    if (n === this.max) return
    this.max = n
    this.onChange?.()
  }

  canPush(): boolean {
    return this.items.length < this.max
  }

  push(item: GameItem): boolean {
    if (!this.canPush()) return false
    this.items.push(item)
    this.onChange?.()
    return true
  }

  /** Remove and return all carried items (deposit). */
  drain(): GameItem[] {
    if (this.items.length === 0) return []
    const out = this.items.slice()
    this.items.length = 0
    this.onChange?.()
    return out
  }

  /** Remove most recently collected item (newest / chain head). Use silent + notifyChange for coordinated visuals. */
  popFromTop(opts?: { silent?: boolean }): GameItem | undefined {
    const it = this.items.pop()
    if (!it) return undefined
    if (!opts?.silent) this.onChange?.()
    return it
  }

  /** Remove oldest collected item (chain tail). Used for deposit peel order. */
  popFromTail(opts?: { silent?: boolean }): GameItem | undefined {
    const it = this.items.shift()
    if (!it) return undefined
    if (!opts?.silent) this.onChange?.()
    return it
  }

  /** Fire onChange after silent pop + ChainVisual handoff (HUD + sync). */
  notifyChange(): void {
    this.onChange?.()
  }

  /** Replace carried items (e.g. after aborting deposit mid-session). */
  replaceItems(items: readonly GameItem[]): void {
    this.items.length = 0
    for (const it of items) {
      this.items.push(it)
    }
    this.onChange?.()
  }

  get count(): number {
    return this.items.length
  }

  getSnapshot(): readonly GameItem[] {
    return this.items
  }

  /**
   * Drop oldest items; keep the `keepCount` newest (still in collection order oldest→newest).
   * Returns removed items (oldest first).
   */
  truncateKeepNewest(keepCount: number): GameItem[] {
    const n = this.items.length
    if (keepCount < 0) return []
    if (keepCount >= n) return []
    if (keepCount === 0) {
      const lost = this.items.slice()
      this.items.length = 0
      this.onChange?.()
      return lost
    }
    const lost = this.items.slice(0, n - keepCount)
    this.items.splice(0, n - keepCount)
    this.onChange?.()
    return lost
  }
}
