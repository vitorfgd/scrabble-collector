import { Vector3 } from 'three'
import type { ChainVisual } from './ChainVisual.ts'
import {
  CHAIN_SEGMENT_HIT_RADIUS,
  ENEMY_RADIUS,
} from './chainCutConfig.ts'
import {
  WHIP_ENEMY_KILL_CREDITS,
  WHIP_HIT_INTENSITY_THRESHOLD,
  WHIP_HIT_RADIUS_EXTRA,
} from './chainWhipConfig.ts'
import type { Economy } from '../economy/Economy.ts'
import type { EnemySwarm } from '../enemies/EnemySwarm.ts'
import type { ChainCutVfx } from '../chain/ChainCutVfx.ts'
import type { PowerModeState } from '../power/PowerModeState.ts'
import type { ChainComboState } from './chainComboState.ts'

const seg = new Vector3()

export type ChainWhipHunterOptions = {
  chainVisual: ChainVisual
  enemySwarm: EnemySwarm
  economy: Economy
  vfx: ChainCutVfx
  powerMode: PowerModeState
  /** Chain length payout multiplier (×1 if omitted) */
  getChainMultiplier?: () => number
  /** Optional chain combo streak (whip kills always count as chain) */
  chainCombo?: ChainComboState
  onWhipKill?: () => void
}

/**
 * Destroys enemies touched by the chain while whip intensity is high enough.
 * Disabled while power mode is active (PowerEnemyHunter handles contact then).
 */
export class ChainWhipHunter {
  private readonly chainVisual: ChainVisual
  private readonly enemySwarm: EnemySwarm
  private readonly economy: Economy
  private readonly vfx: ChainCutVfx
  private readonly powerMode: PowerModeState
  private readonly getChainMultiplier: () => number
  private readonly chainCombo?: ChainComboState
  private readonly onWhipKill?: () => void

  constructor(opts: ChainWhipHunterOptions) {
    this.chainVisual = opts.chainVisual
    this.enemySwarm = opts.enemySwarm
    this.economy = opts.economy
    this.vfx = opts.vfx
    this.powerMode = opts.powerMode
    this.getChainMultiplier = opts.getChainMultiplier ?? (() => 1)
    this.chainCombo = opts.chainCombo
    this.onWhipKill = opts.onWhipKill
  }

  update(): void {
    if (this.powerMode.isActive) return
    if (this.chainVisual.getWhipIntensity() < WHIP_HIT_INTENSITY_THRESHOLD) {
      return
    }

    const r =
      CHAIN_SEGMENT_HIT_RADIUS + ENEMY_RADIUS + WHIP_HIT_RADIUS_EXTRA
    const r2 = r * r
    const n = this.chainVisual.getSegmentCount()
    if (n === 0) return

    for (let ei = 0; ei < this.enemySwarm.getEnemyCount(); ei++) {
      if (!this.enemySwarm.isEnemyAlive(ei)) continue

      const ex = this.enemySwarm.getEnemyX(ei)
      const ez = this.enemySwarm.getEnemyZ(ei)

      let hit = false
      for (let i = 0; i < n; i++) {
        this.chainVisual.copySegmentWorld(i, seg)
        const dx = seg.x - ex
        const dz = seg.z - ez
        if (dx * dx + dz * dz <= r2) {
          hit = true
          break
        }
      }

      if (hit) {
        this.vfx.spawnBurstAt(ex, ez)
        this.enemySwarm.killEnemy(ei)
        const comboMult =
          this.chainCombo?.registerChainKill().rewardMult ?? 1
        const m = Math.max(1, Math.floor(this.getChainMultiplier()))
        this.economy.addMoney(
          Math.floor(WHIP_ENEMY_KILL_CREDITS * m * comboMult),
        )
        this.onWhipKill?.()
      }
    }
  }
}
