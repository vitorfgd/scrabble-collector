import { Vector3 } from 'three'
import type { Group } from 'three'
import type { Economy } from '../economy/Economy.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import type { CarryStack } from '../stack/CarryStack.ts'
import {
  INITIAL_STACK_CAPACITY,
  MAX_CAPACITY_UPGRADE_LEVELS,
  MAX_SPEED_UPGRADE_LEVELS,
  capacityUpgradeCost,
  speedForLevel,
  speedUpgradeCost,
} from './upgradeConfig.ts'
import type { PadLabelPayload } from './UpgradePadVisual.ts'
import { UPGRADE_PAD_ZONE_RADIUS } from './UpgradePadVisual.ts'

const p = new Vector3()
const center = new Vector3()

export type UpgradeZoneSystemOptions = {
  economy: Economy
  player: PlayerController
  stack: CarryStack
  capacityPad: {
    root: Group
    setLabel: (p: PadLabelPayload) => void
  }
  speedPad: {
    root: Group
    setLabel: (p: PadLabelPayload) => void
  }
  /** Optional: coin-like particles from HUD money toward the pad */
  onSpendVfx?: (
    kind: 'capacity' | 'speed',
    cost: number,
    padWorld: Vector3,
  ) => void
}

/**
 * World pads: enter edge → auto-purchase if affordable (same pattern as DepositSystem).
 */
export class UpgradeZoneSystem {
  private readonly economy: Economy
  private readonly player: PlayerController
  private readonly stack: CarryStack
  private readonly capacityPad: UpgradeZoneSystemOptions['capacityPad']
  private readonly speedPad: UpgradeZoneSystemOptions['speedPad']
  private readonly onSpendVfx?: UpgradeZoneSystemOptions['onSpendVfx']

  private capacityUpgradeLevel = 0
  private speedUpgradeLevel = 0
  private wasInsideCapacity = false
  private wasInsideSpeed = false

  constructor(opts: UpgradeZoneSystemOptions) {
    this.economy = opts.economy
    this.player = opts.player
    this.stack = opts.stack
    this.capacityPad = opts.capacityPad
    this.speedPad = opts.speedPad
    this.onSpendVfx = opts.onSpendVfx
  }

  update(): void {
    this.player.getPosition(p)

    this.capacityPad.root.getWorldPosition(center)
    const inCap =
      Math.hypot(p.x - center.x, p.z - center.z) <= UPGRADE_PAD_ZONE_RADIUS
    if (inCap && !this.wasInsideCapacity) {
      if (this.capacityUpgradeLevel < MAX_CAPACITY_UPGRADE_LEVELS) {
        const cost = capacityUpgradeCost(this.capacityUpgradeLevel)
        if (this.economy.trySpend(cost)) {
          this.capacityUpgradeLevel += 1
          this.stack.setMaxCapacity(
            INITIAL_STACK_CAPACITY + this.capacityUpgradeLevel,
          )
          this.capacityPad.root.getWorldPosition(center)
          this.onSpendVfx?.('capacity', cost, center.clone())
        }
      }
    }
    this.wasInsideCapacity = inCap

    this.speedPad.root.getWorldPosition(center)
    const inSpd =
      Math.hypot(p.x - center.x, p.z - center.z) <= UPGRADE_PAD_ZONE_RADIUS
    if (inSpd && !this.wasInsideSpeed) {
      if (this.speedUpgradeLevel < MAX_SPEED_UPGRADE_LEVELS) {
        const cost = speedUpgradeCost(this.speedUpgradeLevel)
        if (this.economy.trySpend(cost)) {
          this.speedUpgradeLevel += 1
          this.player.setMaxSpeed(speedForLevel(this.speedUpgradeLevel))
          this.speedPad.root.getWorldPosition(center)
          this.onSpendVfx?.('speed', cost, center.clone())
        }
      }
    }
    this.wasInsideSpeed = inSpd

    this.refreshCapacityLabel()
    this.refreshSpeedLabel()
  }

  private refreshCapacityLabel(): void {
    const maxed = this.capacityUpgradeLevel >= MAX_CAPACITY_UPGRADE_LEVELS
    const cost = maxed
      ? 0
      : capacityUpgradeCost(this.capacityUpgradeLevel)
    const costLine = maxed ? 'MAX' : `$${cost}`

    this.capacityPad.setLabel({
      title: 'CAPACITY',
      costLine,
      levelLine: `Lv ${this.capacityUpgradeLevel}`,
    })
  }

  private refreshSpeedLabel(): void {
    const maxed = this.speedUpgradeLevel >= MAX_SPEED_UPGRADE_LEVELS
    const cost = maxed ? 0 : speedUpgradeCost(this.speedUpgradeLevel)
    const costLine = maxed ? 'MAX' : `$${cost}`

    this.speedPad.setLabel({
      title: 'SPEED',
      costLine,
      levelLine: `Lv ${this.speedUpgradeLevel}`,
    })
  }
}
