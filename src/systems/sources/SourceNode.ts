import { Vector3 } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import type { ItemSpawnMode } from '../items/spawnMode.ts'
import type { ItemWorld } from '../items/ItemWorld.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import {
  projectPointToDisk,
  randomPointInDisk,
} from './spawnDisk.ts'
import type { SourceNodeConfig } from './sourceTypes.ts'
import type { SourceNodeVisualHandle } from './SourceNodeVisual.ts'

const MAX_WORLD_PICKUPS = 48
const STILL_SPEED_MAX = 0.28
const STILL_TIME_FOR_ACCEL_SEC = 0.42
const BASE_SPAWN_INTERVAL_SEC = 2.75
const ACCEL_INTERVAL_FACTOR = 2.85
const DEPOSIT_CLEAR = { x: 0, z: 0, r: 3.4 }
const SPAWN_ATTEMPTS = 14
/** Bias successive spawns into short trails (Pac-style paths) inside each disk */
const PATH_STEP = 0.48
const PATH_CONTINUE_CHANCE = 0.74

/**
 * One resource source: timed spawns inside a disk.
 * Spawn interval is shorter while the player is inside this disk; standing still inside
 * also turns on the acceleration pulse visual after a short delay.
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
  /** Previous spawn in this zone — used to chain pellets along a loose path */
  private trailXZ: { x: number; z: number } | null = null

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
    this.trailXZ = null
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

    const stillLongEnough =
      inside && this.stillTimer >= STILL_TIME_FOR_ACCEL_SEC
    this.visual.setAccelerationVisual(stillLongEnough, timeSec)

    this.cooldown -= dt
    if (this.cooldown > 0) return

    /** Faster spawns whenever you stand in this zone (not only when motionless). */
    const interval = inside
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
    const cx = this.config.worldX
    const cz = this.config.worldZ
    const R = this.config.spawnRadius
    for (let a = 0; a < SPAWN_ATTEMPTS; a++) {
      let x: number
      let z: number
      if (this.trailXZ && Math.random() < PATH_CONTINUE_CHANCE) {
        x =
          this.trailXZ.x + (Math.random() - 0.5) * 2 * PATH_STEP
        z =
          this.trailXZ.z + (Math.random() - 0.5) * 2 * PATH_STEP
        ;[x, z] = projectPointToDisk(cx, cz, R * 0.998, x, z)
      } else {
        ;[x, z] = randomPointInDisk(cx, cz, R)
      }
      if (tooCloseToDeposit(x, z)) continue
      this.trailXZ = { x, z }
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
