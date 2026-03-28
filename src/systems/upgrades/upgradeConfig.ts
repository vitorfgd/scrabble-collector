import { DEFAULT_PLAYER_MOVE_SPEED } from '../player/PlayerController.ts'

/** Starting stack slots before any capacity pad purchase */
export const INITIAL_STACK_CAPACITY = 10

export const MAX_CAPACITY_UPGRADE_LEVELS = 12
export const MAX_SPEED_UPGRADE_LEVELS = 12

/** Slots = INITIAL_STACK_CAPACITY + purchased levels */
export function capacityUpgradeCost(currentUpgradeLevel: number): number {
  return 45 + currentUpgradeLevel * 35
}

export function speedUpgradeCost(currentUpgradeLevel: number): number {
  return 35 + currentUpgradeLevel * 28
}

export function speedForLevel(upgradeLevels: number): number {
  return DEFAULT_PLAYER_MOVE_SPEED + upgradeLevels * 0.55
}
