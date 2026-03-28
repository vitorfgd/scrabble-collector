import type { Group, Mesh } from 'three'
import { Color, Vector3 } from 'three'
import type { PlayerController } from '../player/PlayerController.ts'
import { POWER_ENEMY_RESPAWN_SEC } from '../power/powerModeConfig.ts'
import {
  createGhostEnemy,
  disposeGhostEnemySharedGeometry,
  type GhostEnemyParts,
} from './createGhostEnemy.ts'
import {
  ENEMY_ACCEL_CLAMP,
  ENEMY_CHASE_AGGRESSION_MAX,
  ENEMY_CHASE_AGGRESSION_MIN,
  ENEMY_FEAR_COLOR_LERP,
  ENEMY_FEAR_FLEE_MULT,
  ENEMY_GHOST_BASE_Y,
  ENEMY_GHOST_VISUAL_SCALE,
  ENEMY_HOME_PULL_ACCEL,
  ENEMY_MAX_SPEED,
  ENEMY_SEPARATION_ACCEL,
  ENEMY_SEPARATION_RADIUS,
  ENEMY_SEEK_ACCEL,
  ENEMY_STEER_SMOOTH,
  ENEMY_VELOCITY_DAMP,
  ENEMY_WANDER_ACCEL,
  ENEMY_WANDER_CHASE_BLEND_NEAR,
  ENEMY_WANDER_CHASE_NEAR_DIST,
  ENEMY_WANDER_FAR_DISTANCE,
  ENEMY_WANDER_FAR_MULT,
} from './enemyGameplayConfig.ts'

export type EnemyProbe = {
  x: number
  z: number
}

type Entry = {
  parts: GhostEnemyParts
  baseColor: Color
  baseEmissive: Color
  baseEmissiveIntensity: number
  homeX: number
  homeZ: number
  phase: number
  aggression: number
  vx: number
  vz: number
  smoothAx: number
  smoothAz: number
  baseY: number
  alive: boolean
  respawnT: number
}

const AVOID: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: 0, z: 0, r: 3.2 },
  { x: -2.35, z: -17, r: 2.8 },
  { x: 2.35, z: -17, r: 2.8 },
]

const MAP_HALF = 17.5

const FEAR_COLOR = new Color(0x4a6ec4)
const FEAR_EMISSIVE = new Color(0x1a3a8c)

const GHOST_COLORS = [0xff4466, 0xff66cc, 0x44ddff, 0xffaa44] as const

function aimPupils(
  parts: GhostEnemyParts,
  mx: number,
  mz: number,
  px: number,
  pz: number,
): void {
  const dx = px - mx
  const dz = pz - mz
  const len = Math.hypot(dx, dz) || 1
  const ox = (dx / len) * 0.03
  const oz = (dz / len) * 0.02
  parts.pupilL.position.set(-0.12 + ox, 0.36, 0.34 + oz)
  parts.pupilR.position.set(0.12 + ox, 0.36, 0.34 + oz)
}

/**
 * Ghost-style enemies: soft steering, bob/wobble, pupils track player.
 */
export class EnemySwarm {
  private readonly root: Group
  private readonly entries: Entry[] = []
  private readonly scratch = new Vector3()

  constructor(root: Group) {
    this.root = root
    const spawns: [number, number][] = [
      [-7.5, 6.2],
      [7.5, 6.2],
      [-6.8, -5.5],
      [6.8, -5.5],
    ]
    let ph = 0
    for (let i = 0; i < spawns.length; i++) {
      const [hx, hz] = spawns[i]
      const parts = createGhostEnemy(GHOST_COLORS[i % GHOST_COLORS.length])
      const g = parts.group
      g.position.set(hx, ENEMY_GHOST_BASE_Y, hz)
      this.root.add(g)
      const mat = parts.bodyMat
      const aggression =
        ENEMY_CHASE_AGGRESSION_MIN +
        Math.random() * (ENEMY_CHASE_AGGRESSION_MAX - ENEMY_CHASE_AGGRESSION_MIN)
      this.entries.push({
        parts,
        baseColor: mat.color.clone(),
        baseEmissive: mat.emissive.clone(),
        baseEmissiveIntensity: mat.emissiveIntensity,
        homeX: hx,
        homeZ: hz,
        phase: ph,
        aggression,
        vx: 0,
        vz: 0,
        smoothAx: 0,
        smoothAz: 0,
        baseY: ENEMY_GHOST_BASE_Y,
        alive: true,
        respawnT: 0,
      })
      ph += 1.7
    }
  }

  update(dt: number, player: PlayerController, powerModeFear: boolean): void {
    const t = performance.now() * 0.001
    player.getPosition(this.scratch)
    const pxx = this.scratch.x
    const pzz = this.scratch.z
    const damp = Math.max(0, 1 - ENEMY_VELOCITY_DAMP * dt)
    const kCol = 1 - Math.exp(-ENEMY_FEAR_COLOR_LERP * dt)
    const kSteer = 1 - Math.exp(-ENEMY_STEER_SMOOTH * dt)

    for (let ei = 0; ei < this.entries.length; ei++) {
      const e = this.entries[ei]

      if (!e.alive) {
        e.respawnT -= dt
        if (e.respawnT <= 0) {
          e.alive = true
          e.parts.group.visible = true
          e.parts.group.position.set(e.homeX, e.baseY, e.homeZ)
          e.vx = 0
          e.vz = 0
          e.smoothAx = 0
          e.smoothAz = 0
          e.parts.bodyMat.color.copy(e.baseColor)
          e.parts.bodyMat.emissive.copy(e.baseEmissive)
          e.parts.bodyMat.emissiveIntensity = e.baseEmissiveIntensity
        } else {
          continue
        }
      }

      const g = e.parts.group
      const mx = g.position.x
      const mz = g.position.z

      let ax = 0
      let az = 0

      const toPx = pxx - mx
      const toPz = pzz - mz
      const dPlayer = Math.hypot(toPx, toPz) || 1e-6

      const wanderFar =
        dPlayer > ENEMY_WANDER_FAR_DISTANCE ? ENEMY_WANDER_FAR_MULT : 1
      const chaseBlend =
        dPlayer < ENEMY_WANDER_CHASE_NEAR_DIST
          ? ENEMY_WANDER_CHASE_BLEND_NEAR
          : 1

      if (powerModeFear) {
        ax -= (toPx / dPlayer) * ENEMY_SEEK_ACCEL * ENEMY_FEAR_FLEE_MULT * e.aggression
        az -= (toPz / dPlayer) * ENEMY_SEEK_ACCEL * ENEMY_FEAR_FLEE_MULT * e.aggression
        ax +=
          Math.sin(t * 0.65 + e.phase) * ENEMY_WANDER_ACCEL * 0.35 * wanderFar
        az +=
          Math.cos(t * 0.52 + e.phase * 1.1) * ENEMY_WANDER_ACCEL * 0.35 * wanderFar
      } else {
        ax += (toPx / dPlayer) * ENEMY_SEEK_ACCEL * e.aggression
        az += (toPz / dPlayer) * ENEMY_SEEK_ACCEL * e.aggression
        ax +=
          Math.sin(t * 0.65 + e.phase) *
          ENEMY_WANDER_ACCEL *
          wanderFar *
          chaseBlend
        az +=
          Math.cos(t * 0.52 + e.phase * 1.1) *
          ENEMY_WANDER_ACCEL *
          wanderFar *
          chaseBlend
      }

      ax += (e.homeX - mx) * ENEMY_HOME_PULL_ACCEL
      az += (e.homeZ - mz) * ENEMY_HOME_PULL_ACCEL

      for (let oi = 0; oi < this.entries.length; oi++) {
        if (oi === ei) continue
        const o = this.entries[oi]
        if (!o.alive) continue
        const ox = o.parts.group.position.x
        const oz = o.parts.group.position.z
        const dx = mx - ox
        const dz = mz - oz
        const d = Math.hypot(dx, dz) || 1e-6
        if (d < ENEMY_SEPARATION_RADIUS && d > 1e-4) {
          const push = (ENEMY_SEPARATION_RADIUS - d) / ENEMY_SEPARATION_RADIUS
          ax += (dx / d) * ENEMY_SEPARATION_ACCEL * push
          az += (dz / d) * ENEMY_SEPARATION_ACCEL * push
        }
      }

      for (const a of AVOID) {
        const dx = mx - a.x
        const dz = mz - a.z
        const d = Math.hypot(dx, dz) || 1e-6
        if (d < a.r) {
          const push = (a.r - d) / a.r
          ax += (dx / d) * 14 * push
          az += (dz / d) * 14 * push
        }
      }

      const aMag = Math.hypot(ax, az)
      if (aMag > ENEMY_ACCEL_CLAMP) {
        const s = ENEMY_ACCEL_CLAMP / aMag
        ax *= s
        az *= s
      }

      e.smoothAx += (ax - e.smoothAx) * kSteer
      e.smoothAz += (az - e.smoothAz) * kSteer

      e.vx += e.smoothAx * dt
      e.vz += e.smoothAz * dt
      e.vx *= damp
      e.vz *= damp

      let sp = Math.hypot(e.vx, e.vz)
      if (sp > ENEMY_MAX_SPEED) {
        const r = ENEMY_MAX_SPEED / sp
        e.vx *= r
        e.vz *= r
        sp = ENEMY_MAX_SPEED
      }

      g.position.x += e.vx * dt
      g.position.z += e.vz * dt

      let tx = g.position.x
      let tz = g.position.z
      if (tx < -MAP_HALF) {
        tx = -MAP_HALF
        e.vx *= -0.35
      } else if (tx > MAP_HALF) {
        tx = MAP_HALF
        e.vx *= -0.35
      }
      if (tz < -MAP_HALF) {
        tz = -MAP_HALF
        e.vz *= -0.35
      } else if (tz > MAP_HALF) {
        tz = MAP_HALF
        e.vz *= -0.35
      }
      g.position.x = tx
      g.position.z = tz

      const bob = Math.sin(t * 2.1 + e.phase) * 0.036
      const squash = 1 + Math.sin(t * 3.25 + e.phase * 1.15) * 0.024
      g.position.y = e.baseY + bob
      g.scale.set(
        ENEMY_GHOST_VISUAL_SCALE,
        ENEMY_GHOST_VISUAL_SCALE * squash,
        ENEMY_GHOST_VISUAL_SCALE,
      )

      aimPupils(e.parts, mx, mz, pxx, pzz)

      if (powerModeFear) {
        e.parts.bodyMat.color.lerp(FEAR_COLOR, kCol)
        e.parts.bodyMat.emissive.lerp(FEAR_EMISSIVE, kCol)
        e.parts.bodyMat.emissiveIntensity += (0.55 - e.parts.bodyMat.emissiveIntensity) * kCol
      } else {
        e.parts.bodyMat.color.lerp(e.baseColor, kCol)
        e.parts.bodyMat.emissive.lerp(e.baseEmissive, kCol)
        e.parts.bodyMat.emissiveIntensity +=
          (e.baseEmissiveIntensity - e.parts.bodyMat.emissiveIntensity) * kCol
      }
    }
  }

  getEnemyCount(): number {
    return this.entries.length
  }

  isEnemyAlive(index: number): boolean {
    return this.entries[index]?.alive === true
  }

  getEnemyX(index: number): number {
    return this.entries[index]?.parts.group.position.x ?? 0
  }

  getEnemyZ(index: number): number {
    return this.entries[index]?.parts.group.position.z ?? 0
  }

  killEnemy(index: number): void {
    const e = this.entries[index]
    if (!e || !e.alive) return
    e.alive = false
    e.parts.group.visible = false
    e.respawnT = POWER_ENEMY_RESPAWN_SEC
    e.vx = 0
    e.vz = 0
  }

  getProbes(): EnemyProbe[] {
    const out: EnemyProbe[] = []
    for (const e of this.entries) {
      if (!e.alive) continue
      const p = e.parts.group.position
      out.push({ x: p.x, z: p.z })
    }
    return out
  }

  dispose(): void {
    for (const e of this.entries) {
      this.root.remove(e.parts.group)
      e.parts.bodyMat.dispose()
      disposeMeshMaterial(e.parts.eyeWhiteL)
      disposeMeshMaterial(e.parts.eyeWhiteR)
      disposeMeshMaterial(e.parts.pupilL)
      disposeMeshMaterial(e.parts.pupilR)
    }
    this.entries.length = 0
    disposeGhostEnemySharedGeometry()
  }
}

function disposeMeshMaterial(mesh: Mesh): void {
  const m = mesh.material
  if (Array.isArray(m)) m.forEach((x) => x.dispose())
  else m.dispose()
}
