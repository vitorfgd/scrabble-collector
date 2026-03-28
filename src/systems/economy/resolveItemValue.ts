import type { GameItem } from '../../core/types/GameItem.ts'

/**
 * Maps a deposited batch to a money amount. Swap implementations for:
 * - letter words / dictionary checks
 * - combo multipliers
 * without changing DepositSystem or ChainSystem.
 */
export type ItemValueResolver = (items: GameItem[]) => number

/** Baseline: sum of each item's `value` (works for any `GameItem.type`) */
export function defaultResolveItemValue(items: GameItem[]): number {
  let sum = 0
  for (const it of items) {
    sum += it.value
  }
  return sum
}
