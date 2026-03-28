import { Vector3 } from 'three'
import type { ChainSystem } from './ChainSystem.ts'
import type { ChainVisual } from './ChainVisual.ts'
import {
  CHAIN_CUT_COOLDOWN_SEC,
  CHAIN_SEGMENT_HIT_RADIUS,
  ENEMY_RADIUS,
  PLAYER_CONTACT_STRIKE_INDEX,
} from './chainCutConfig.ts'
import type { ChainCutVfx } from './ChainCutVfx.ts'
import type { PlayerController } from '../player/PlayerController.ts'

export type EnemyXZ = { x: number; z: number }

export type ChainCutSystemOptions = {
  chain: ChainSystem
  chainVisual: ChainVisual
  vfx: ChainCutVfx
  player: PlayerController
  getEnemies: () => readonly EnemyXZ[]
  isCutBlocked: () => boolean
  /** Chain is lethal to enemies — no cuts */
  isPowerModeActive: () => boolean
  onCut?: (lostCount: number, cutVisualIndex: number) => void
}

const seg = new Vector3()
const cutPt = new Vector3()
const playerPos = new Vector3()

/**
 * Cut sources:
 * - Chain: first link from the player (smallest visual index) overlapping an enemy.
 * - Player body: any enemy overlapping the player tight circle worsens the cut to at most
 *   `PLAYER_CONTACT_STRIKE_INDEX` (front-heavy vs a mild tail-only hit). Single link → full loss.
 * Blocked during deposit peel / flight.
 */
export class ChainCutSystem {
  private readonly chain: ChainSystem
  private readonly chainVisual: ChainVisual
  private readonly vfx: ChainCutVfx
  private readonly player: PlayerController
  private readonly getEnemies: () => readonly EnemyXZ[]
  private readonly isCutBlocked: () => boolean
  private readonly isPowerModeActive: () => boolean
  private readonly onCut?: (lostCount: number, cutVisualIndex: number) => void
  private cooldown = 0

  constructor(opts: ChainCutSystemOptions) {
    this.chain = opts.chain
    this.chainVisual = opts.chainVisual
    this.vfx = opts.vfx
    this.player = opts.player
    this.getEnemies = opts.getEnemies
    this.isCutBlocked = opts.isCutBlocked
    this.isPowerModeActive = opts.isPowerModeActive
    this.onCut = opts.onCut
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt)
    if (this.isPowerModeActive()) return
    if (this.isCutBlocked()) return
    if (this.cooldown > 0) return

    const n = this.chainVisual.getSegmentCount()
    if (n === 0) return

    const enemies = this.getEnemies()
    if (enemies.length === 0) return

    const rChain = CHAIN_SEGMENT_HIT_RADIUS + ENEMY_RADIUS
    const rChain2 = rChain * rChain

    let chainCut = Infinity
    for (const e of enemies) {
      for (let i = 0; i < n; i++) {
        this.chainVisual.copySegmentWorld(i, seg)
        const dx = seg.x - e.x
        const dz = seg.z - e.z
        if (dx * dx + dz * dz <= rChain2) {
          chainCut = Math.min(chainCut, i)
          break
        }
      }
    }

    this.player.getPosition(playerPos)
    const rBody = ENEMY_RADIUS + this.player.radius
    const rBody2 = rBody * rBody
    let playerBodyHit = false
    for (const e of enemies) {
      const dx = e.x - playerPos.x
      const dz = e.z - playerPos.z
      if (dx * dx + dz * dz <= rBody2) {
        playerBodyHit = true
        break
      }
    }

    let cutIndex = chainCut
    if (playerBodyHit) {
      if (n === 1) {
        cutIndex = 0
      } else {
        const strike = PLAYER_CONTACT_STRIKE_INDEX
        cutIndex = Math.min(
          chainCut === Infinity ? Infinity : chainCut,
          strike,
        )
      }
    }

    if (!Number.isFinite(cutIndex) || cutIndex === Infinity) return
    if (cutIndex >= n) return

    this.chainVisual.copySegmentWorld(cutIndex, cutPt)
    const detached = this.chainVisual.detachTailFromVisualIndex(cutIndex)
    const lost = this.chain.truncateKeepNewest(cutIndex)

    this.vfx.spawnBurstAt(cutPt.x, cutPt.z)
    this.vfx.spawnScatter(detached)

    this.cooldown = CHAIN_CUT_COOLDOWN_SEC
    this.onCut?.(lost.length, cutIndex)
  }
}
