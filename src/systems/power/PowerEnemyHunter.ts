import { Vector3 } from 'three'
import type { ChainVisual } from '../chain/ChainVisual.ts'
import {
  CHAIN_SEGMENT_HIT_RADIUS,
  ENEMY_RADIUS,
} from '../chain/chainCutConfig.ts'
import type { Economy } from '../economy/Economy.ts'
import type { EnemySwarm } from '../enemies/EnemySwarm.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import type { ChainCutVfx } from '../chain/ChainCutVfx.ts'
import { POWER_ENEMY_KILL_CREDITS } from './powerModeConfig.ts'
import type { PowerModeState } from './PowerModeState.ts'
import type { ChainComboState } from '../chain/chainComboState.ts'

const seg = new Vector3()
const playerPos = new Vector3()

/**
 * While power mode is active: chain or player contact destroys enemies (no chain cuts — handled elsewhere).
 */
export class PowerEnemyHunter {
  private readonly powerMode: PowerModeState
  private readonly player: PlayerController
  private readonly chainVisual: ChainVisual
  private readonly enemySwarm: EnemySwarm
  private readonly economy: Economy
  private readonly vfx: ChainCutVfx
  private readonly onEnemyEaten?: () => void
  private readonly getChainMultiplier: () => number
  private readonly chainCombo?: ChainComboState

  constructor(opts: {
    powerMode: PowerModeState
    player: PlayerController
    chainVisual: ChainVisual
    enemySwarm: EnemySwarm
    economy: Economy
    vfx: ChainCutVfx
    getChainMultiplier?: () => number
    /** Combo streak only counts kills from chain segments, not player body */
    chainCombo?: ChainComboState
    onEnemyEaten?: () => void
  }) {
    this.powerMode = opts.powerMode
    this.player = opts.player
    this.chainVisual = opts.chainVisual
    this.enemySwarm = opts.enemySwarm
    this.economy = opts.economy
    this.vfx = opts.vfx
    this.getChainMultiplier = opts.getChainMultiplier ?? (() => 1)
    this.chainCombo = opts.chainCombo
    this.onEnemyEaten = opts.onEnemyEaten
  }

  update(): void {
    if (!this.powerMode.isActive) return

    const rChain = CHAIN_SEGMENT_HIT_RADIUS + ENEMY_RADIUS
    const rChain2 = rChain * rChain
    this.player.getPosition(playerPos)
    const rBody = ENEMY_RADIUS + this.player.radius
    const rBody2 = rBody * rBody

    const n = this.chainVisual.getSegmentCount()

    for (let ei = 0; ei < this.enemySwarm.getEnemyCount(); ei++) {
      if (!this.enemySwarm.isEnemyAlive(ei)) continue

      const ex = this.enemySwarm.getEnemyX(ei)
      const ez = this.enemySwarm.getEnemyZ(ei)

      let hitBody = false
      const dpx = ex - playerPos.x
      const dpz = ez - playerPos.z
      if (dpx * dpx + dpz * dpz <= rBody2) {
        hitBody = true
      }
      let hitChain = false
      if (n > 0) {
        for (let i = 0; i < n; i++) {
          this.chainVisual.copySegmentWorld(i, seg)
          const dx = seg.x - ex
          const dz = seg.z - ez
          if (dx * dx + dz * dz <= rChain2) {
            hitChain = true
            break
          }
        }
      }

      if (hitBody || hitChain) {
        this.vfx.spawnBurstAt(ex, ez)
        this.enemySwarm.killEnemy(ei)
        let comboMult = 1
        if (hitChain && this.chainCombo) {
          comboMult = this.chainCombo.registerChainKill().rewardMult
        }
        const m = Math.max(1, Math.floor(this.getChainMultiplier()))
        this.economy.addMoney(
          Math.floor(POWER_ENEMY_KILL_CREDITS * m * comboMult),
        )
        this.onEnemyEaten?.()
      }
    }
  }
}
