import { Vector3 } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import type { ItemSpawnMode } from '../items/spawnMode.ts'
import type { ItemWorld } from '../items/ItemWorld.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import { randomPointInDisk } from './spawnDisk.ts'
import type { SourceNodeConfig } from './sourceTypes.ts'
import type { SourceNodeVisualHandle } from './SourceNodeVisual.ts'

const MAX_WORLD_PICKUPS = 48
const STILL_SPEED_MAX = 0.28
const STILL_TIME_FOR_ACCEL_SEC = 0.42
const BASE_SPAWN_INTERVAL_SEC = 2.75
const ACCEL_INTERVAL_FACTOR = 2.85
const DEPOSIT_CLEAR = { x: 0, z: 0, r: 3.4 }
const SPAWN_ATTEMPTS = 14

/**
 * One resource source: timed spawns inside a disk, faster when the player stands still inside.
 */
export class SourceNode {
  private readonly config: SourceNodeConfig
  private readonly itemWorld: ItemWorld
  private readonly player: PlayerController
  private readonly visual: SourceNodeVisualHandle
  private readonly getSpawnMode: () => ItemSpawnMode
  private readonly createForCrystal: () => GameItem
  private readonly createVowel: () => GameItem
  private readonly createConsonant: () => GameItem

  private cooldown: number
  private stillTimer = 0

  constructor(
    config: SourceNodeConfig,
    itemWorld: ItemWorld,
    player: PlayerController,
    visual: SourceNodeVisualHandle,
    getSpawnMode: () => ItemSpawnMode,
    createForCrystal: () => GameItem,
    createVowel: () => GameItem,
    createConsonant: () => GameItem,
    cooldownStagger: number,
  ) {
    this.config = config
    this.itemWorld = itemWorld
    this.player = player
    this.visual = visual
    this.getSpawnMode = getSpawnMode
    this.createForCrystal = createForCrystal
    this.createVowel = createVowel
    this.createConsonant = createConsonant
    this.cooldown = cooldownStagger
  }

  resetCooldown(stagger: number): void {
    this.cooldown = stagger
    this.stillTimer = 0
  }

  update(dt: number, timeSec: number): void {
    if (this.itemWorld.getPickupCount() >= MAX_WORLD_PICKUPS) {
      this.visual.setAccelerationVisual(false, timeSec)
      return
    }

    const p = new Vector3()
    this.player.getPosition(p)
    const dx = p.x - this.config.worldX
    const dz = p.z - this.config.worldZ
    const dist = Math.hypot(dx, dz)
    const inside = dist <= this.config.spawnRadius
    const still =
      inside && this.player.getHorizontalSpeed() <= STILL_SPEED_MAX

    if (inside && still) {
      this.stillTimer += dt
    } else {
      this.stillTimer = 0
    }

    const accel =
      inside && this.stillTimer >= STILL_TIME_FOR_ACCEL_SEC
    this.visual.setAccelerationVisual(accel, timeSec)

    this.cooldown -= dt
    if (this.cooldown > 0) return

    const interval = accel
      ? BASE_SPAWN_INTERVAL_SEC / ACCEL_INTERVAL_FACTOR
      : BASE_SPAWN_INTERVAL_SEC

    this.trySpawnOne()
    this.cooldown = interval
  }

  dispose(): void {
    this.visual.root.removeFromParent()
    this.visual.dispose()
  }

  private trySpawnOne(): void {
    for (let a = 0; a < SPAWN_ATTEMPTS; a++) {
      const [x, z] = randomPointInDisk(
        this.config.worldX,
        this.config.worldZ,
        this.config.spawnRadius,
      )
      if (tooCloseToDeposit(x, z)) continue
      const item = this.makeItem()
      this.itemWorld.spawn(item, x, z)
      return
    }
  }

  private makeItem(): GameItem {
    if (this.getSpawnMode() === 'crystal') {
      return this.createForCrystal()
    }
    return this.config.letterKind === 'vowel'
      ? this.createVowel()
      : this.createConsonant()
  }
}

function tooCloseToDeposit(x: number, z: number): boolean {
  return Math.hypot(x - DEPOSIT_CLEAR.x, z - DEPOSIT_CLEAR.z) < DEPOSIT_CLEAR.r
}
