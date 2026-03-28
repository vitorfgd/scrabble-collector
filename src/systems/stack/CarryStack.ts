import type { GameItem } from '../../core/types/GameItem.ts'

export class CarryStack {
  private readonly items: GameItem[] = []
  private readonly max: number
  private readonly onChange?: () => void

  constructor(max: number, onChange?: () => void) {
    this.max = max
    this.onChange = onChange
  }

  get maxCapacity(): number {
    return this.max
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

  get count(): number {
    return this.items.length
  }

  getSnapshot(): readonly GameItem[] {
    return this.items
  }
}
