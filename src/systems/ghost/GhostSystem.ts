import type { Group } from 'three'
import {
  Color,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { DEFAULT_DEPOSIT_ZONE_RADIUS } from '../deposit/DepositZone.ts'
import type { GhostGltfTemplate } from './ghostGltfAsset.ts'
import { createGhostVisual } from './createGhostVisual.ts'
import { MANSION_WORLD_HALF } from '../world/mansionGeometry.ts'
import type { WorldCollision } from '../world/WorldCollision.ts'
import {
  DEFAULT_GHOST_SPAWNS,
  GHOST_CHASE_SPEED,
  GHOST_COLLISION_RADIUS,
  GHOST_DEPOSIT_EXCLUSION_RADIUS,
  GHOST_DETECT_RADIUS,
  GHOST_DIRECTION_SMOOTH_CHASE,
  GHOST_DIRECTION_SMOOTH_FRIGHT,
  GHOST_DIRECTION_SMOOTH_WANDER,
  GHOST_FACING_TURN_DEFAULT,
  GHOST_FACING_TURN_FRIGHT,
  GHOST_FRIGHT_SPEED,
  GHOST_LOSE_CHASE_RADIUS,
  GHOST_MELEE_REARM_PADDING,
  GHOST_POST_HIT_CHASE_LOCKOUT_SEC,
  GHOST_POST_HIT_DISENGAGE_SPEED,
  GHOST_POST_HIT_SEPARATION,
  GHOST_RESPAWN_AFTER_EAT_SEC,
  GHOST_STEERING_ACCEL_CHASE,
  GHOST_STEERING_ACCEL_FRIGHT,
  GHOST_STEERING_ACCEL_WANDER,
  GHOST_WANDER_SPEED,
  GHOST_WANDER_TURN_MAX,
  GHOST_WANDER_TURN_MIN,
  type GhostSpawnSpec,
} from './ghostConfig.ts'

export type GhostBehaviorState = 'wander' | 'chase'

export type GhostHitResult =
  | { kind: 'none' }
  | { kind: 'hit'; ghostX: number; ghostZ: number }

export class GhostSystem {
  private readonly ghosts: Ghost[] = []
  private powerModeActive = false
  private powerModeTimeSec = 0
  private ghostAnimTime = 0

  constructor(
    ghostGroup: Group,
    worldCollision: WorldCollision,
    spawns: readonly GhostSpawnSpec[] = DEFAULT_GHOST_SPAWNS,
    ghostGltf: GhostGltfTemplate | null = null,
  ) {
    for (const s of spawns) {
      this.ghosts.push(new Ghost(ghostGroup, worldCollision, s, ghostGltf))
    }
  }

  /** While true, ghosts are vulnerable (blue), player can eat them, and they cannot deal pellet-loss hits. */
  setPowerMode(active: boolean, timeSec: number): void {
    this.powerModeActive = active
    this.powerModeTimeSec = timeSec
  }

  update(dt: number, playerPos: Vector3, playerCarryingRelic: boolean): void {
    this.ghostAnimTime += dt
    const frightened = this.powerModeActive
    const dr = DEFAULT_DEPOSIT_ZONE_RADIUS
    const playerInDepositZone =
      playerPos.x * playerPos.x + playerPos.z * playerPos.z <= dr * dr
    for (const g of this.ghosts) {
      g.update(
        dt,
        playerPos,
        frightened,
        this.ghostAnimTime,
        playerInDepositZone,
        playerCarryingRelic,
      )
      g.updateVulnerableAppearance(this.powerModeActive, this.powerModeTimeSec)
    }
    this.separateOverlappingGhosts()
  }

  /**
   * True when the player is outside “melee + padding” for every active ghost
   * (used to re-arm damage after a hit / i-frames).
   */
  isPlayerClearForGhostDamageRearm(
    playerPos: Vector3,
    playerRadius: number,
  ): boolean {
    const needR = playerRadius + GHOST_COLLISION_RADIUS + GHOST_MELEE_REARM_PADDING
    const needR2 = needR * needR
    for (const g of this.ghosts) {
      if (g.isEaten()) continue
      const gx = g.root.position.x
      const gz = g.root.position.z
      const dx = playerPos.x - gx
      const dz = playerPos.z - gz
      if (dx * dx + dz * dz < needR2) return false
    }
    return true
  }

  /**
   * First overlapping ghost is eaten; returns true if one was eaten this frame.
   * Only when `setPowerMode(true, …)` is active.
   */
  tryEatGhost(playerPos: Vector3, playerRadius: number): boolean {
    if (!this.powerModeActive) return false
    const r = playerRadius + GHOST_COLLISION_RADIUS
    const r2 = r * r
    for (const g of this.ghosts) {
      if (g.isEaten()) continue
      const gx = g.root.position.x
      const gz = g.root.position.z
      const dx = playerPos.x - gx
      const dz = playerPos.z - gz
      if (dx * dx + dz * dz <= r2) {
        g.markEaten()
        return true
      }
    }
    return false
  }

  /**
   * Circle–circle overlap on XZ: `playerRadius + GHOST_COLLISION_RADIUS`.
   * No damage while invulnerable (i-frames) or during power mode (ghosts flee harm).
   */
  tryHitPlayer(
    playerPos: Vector3,
    playerRadius: number,
    invulnerable: boolean,
  ): GhostHitResult {
    if (invulnerable || this.powerModeActive) return { kind: 'none' }
    const r = playerRadius + GHOST_COLLISION_RADIUS
    const r2 = r * r
    for (const g of this.ghosts) {
      if (g.isEaten()) continue
      const gx = g.root.position.x
      const gz = g.root.position.z
      const dx = playerPos.x - gx
      const dz = playerPos.z - gz
      if (dx * dx + dz * dz <= r2) {
        return { kind: 'hit', ghostX: gx, ghostZ: gz }
      }
    }
    return { kind: 'none' }
  }

  /**
   * After a successful damage hit: that ghost backs off and roams so it does not stay clipped on the player.
   */
  onGhostHitLandedAt(
    ghostX: number,
    ghostZ: number,
    playerPos: Vector3,
  ): void {
    const eps2 = 0.2 * 0.2
    for (const g of this.ghosts) {
      if (g.isEaten()) continue
      const dx = g.root.position.x - ghostX
      const dz = g.root.position.z - ghostZ
      if (dx * dx + dz * dz <= eps2) {
        g.disengageAfterHit(playerPos)
        return
      }
    }
  }

  dispose(): void {
    for (const g of this.ghosts) {
      g.destroy()
    }
    this.ghosts.length = 0
  }

  /** Push ghost centers apart so multiple chasers do not stack on the player. */
  private separateOverlappingGhosts(): void {
    const minD = GHOST_COLLISION_RADIUS * 2.25
    const list = this.ghosts.filter((g) => !g.isEaten())
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!
        const b = list[j]!
        let dx = b.root.position.x - a.root.position.x
        let dz = b.root.position.z - a.root.position.z
        let dist = Math.hypot(dx, dz)
        if (dist >= minD || dist < 1e-7) continue
        dx /= dist
        dz /= dist
        const push = (minD - dist) * 0.52
        a.root.position.x -= dx * push
        a.root.position.z -= dz * push
        b.root.position.x += dx * push
        b.root.position.z += dz * push
      }
    }
    for (const g of list) {
      g.resolveAgainstWalls()
    }
  }
}

type SkinSnap = {
  color: Color
  emissive: Color
  emissiveIntensity: number
}

class Ghost {
  readonly root: Group
  private readonly worldCollision: WorldCollision
  private readonly velocity = new Vector3()
  private readonly scratch = new Vector3()
  private readonly spawnX: number
  private readonly spawnZ: number
  private readonly materials: MeshStandardMaterial[]
  private readonly skinSnap: SkinSnap[]
  private prevPowerMode = false

  private state: GhostBehaviorState = 'wander'
  private wanderAngle = Math.random() * Math.PI * 2
  private wanderTimer = 0

  private eaten = false
  private respawnRemaining = 0
  /** While > 0, cannot transition wander → chase (after scoring a hit on the player). */
  private chaseLockout = 0
  /** Smoothed desired direction (unit XZ) — reduces jittery heading changes */
  private smoothedTx = 0
  private smoothedTz = 1

  constructor(
    ghostGroup: Group,
    worldCollision: WorldCollision,
    spec: GhostSpawnSpec,
    ghostGltf: GhostGltfTemplate | null,
  ) {
    this.worldCollision = worldCollision
    this.spawnX = spec.x
    this.spawnZ = spec.z
    this.root = createGhostVisual(spec.color, ghostGltf)
    this.root.position.set(spec.x, 0, spec.z)
    ghostGroup.add(this.root)
    this.pickWanderTimer()

    this.materials = []
    this.skinSnap = []
    this.root.traverse((o) => {
      if (!(o instanceof Mesh) || o.userData.isGhostBody !== true) return
      const mat = o.material
      const mats = Array.isArray(mat) ? mat : [mat]
      for (const m of mats) {
        if (
          m instanceof MeshStandardMaterial ||
          m instanceof MeshPhysicalMaterial
        ) {
          this.materials.push(m)
          this.skinSnap.push({
            color: m.color.clone(),
            emissive: m.emissive.clone(),
            emissiveIntensity: m.emissiveIntensity,
          })
        }
      }
    })
  }

  isEaten(): boolean {
    return this.eaten
  }

  markEaten(): void {
    this.eaten = true
    this.root.visible = false
    this.respawnRemaining = GHOST_RESPAWN_AFTER_EAT_SEC
    this.velocity.set(0, 0, 0)
    this.chaseLockout = 0
  }

  /**
   * Stop chasing, push away from player, brief roam before re-aggro.
   */
  disengageAfterHit(playerPos: Vector3): void {
    this.state = 'wander'
    this.chaseLockout = GHOST_POST_HIT_CHASE_LOCKOUT_SEC
    this.pickWanderTimer()
    const px = this.root.position.x
    const pz = this.root.position.z
    let ax = px - playerPos.x
    let az = pz - playerPos.z
    let d = Math.hypot(ax, az)
    if (d < 0.12) {
      ax = Math.cos(this.wanderAngle)
      az = Math.sin(this.wanderAngle)
      d = 1
    } else {
      ax /= d
      az /= d
    }
    this.wanderAngle = Math.atan2(az, ax)
    this.root.position.x += ax * GHOST_POST_HIT_SEPARATION
    this.root.position.z += az * GHOST_POST_HIT_SEPARATION
    this.resolveWallCollision()
    this.velocity.x += ax * GHOST_POST_HIT_DISENGAGE_SPEED
    this.velocity.z += az * GHOST_POST_HIT_DISENGAGE_SPEED
    const hs = Math.hypot(this.velocity.x, this.velocity.z)
    const maxSp = 12.5
    if (hs > maxSp) {
      const inv = maxSp / hs
      this.velocity.x *= inv
      this.velocity.z *= inv
    }
    this.smoothedTx = Math.cos(this.wanderAngle)
    this.smoothedTz = Math.sin(this.wanderAngle)
  }

  private pickWanderTimer(): void {
    this.wanderTimer =
      GHOST_WANDER_TURN_MIN +
      Math.random() * (GHOST_WANDER_TURN_MAX - GHOST_WANDER_TURN_MIN)
  }

  private resetSkin(): void {
    for (let i = 0; i < this.materials.length; i++) {
      const m = this.materials[i]!
      const s = this.skinSnap[i]!
      m.color.copy(s.color)
      m.emissive.copy(s.emissive)
      m.emissiveIntensity = s.emissiveIntensity
    }
  }

  updateVulnerableAppearance(powerMode: boolean, timeSec: number): void {
    if (this.eaten) return
    if (powerMode) {
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 2.75)
      const blink = 0.62 + 0.38 * Math.sin(timeSec * 7.2)
      for (const m of this.materials) {
        m.color.setHex(0x2a5590)
        m.emissive.setHex(0x4488dd)
        m.emissiveIntensity = (0.38 + pulse * 0.48) * blink
      }
    } else if (this.prevPowerMode) {
      this.resetSkin()
    }
    this.prevPowerMode = powerMode
  }

  update(
    dt: number,
    playerPos: Vector3,
    frightened: boolean,
    timeSec: number,
    playerInDepositZone: boolean,
    relicCarried: boolean,
  ): void {
    if (this.eaten) {
      this.respawnRemaining -= dt
      if (this.respawnRemaining <= 0) {
        this.eaten = false
        this.root.visible = true
        this.root.position.set(this.spawnX, 0, this.spawnZ)
        this.velocity.set(0, 0, 0)
        this.state = 'wander'
        this.chaseLockout = 0
        this.pickWanderTimer()
        this.resetSkin()
        this.smoothedTx = 0
        this.smoothedTz = 1
      }
      return
    }

    const px = this.root.position.x
    const pz = this.root.position.z
    const dx = playerPos.x - px
    const dz = playerPos.z - pz
    const dist = Math.hypot(dx, dz)

    if (this.chaseLockout > 0) {
      this.chaseLockout -= dt
    }

    let tx = 0
    let tz = 0
    let targetSpeed = GHOST_WANDER_SPEED

    if (frightened) {
      let ax = px - playerPos.x
      let az = pz - playerPos.z
      let ad = Math.hypot(ax, az)
      if (ad < 0.22) {
        ax = Math.cos(this.wanderAngle)
        az = Math.sin(this.wanderAngle)
        ad = 1
      }
      const inv = 1 / ad
      tx = ax * inv
      tz = az * inv
      targetSpeed = GHOST_FRIGHT_SPEED
    } else if (playerInDepositZone && !relicCarried) {
      if (this.state === 'chase') {
        this.state = 'wander'
        this.pickWanderTimer()
        this.wanderAngle = Math.random() * Math.PI * 2
      }
      this.wanderTimer -= dt
      if (this.wanderTimer <= 0) {
        this.wanderAngle = Math.random() * Math.PI * 2
        this.pickWanderTimer()
      }
      tx = Math.cos(this.wanderAngle)
      tz = Math.sin(this.wanderAngle)
      targetSpeed = GHOST_WANDER_SPEED
    } else if (relicCarried) {
      this.state = 'chase'
      if (dist > 1e-4) {
        const inv = 1 / dist
        tx = dx * inv
        tz = dz * inv
        targetSpeed = GHOST_CHASE_SPEED
      } else {
        tx = 0
        tz = 0
        targetSpeed = 0
      }
    } else {
      const detectR2 = GHOST_DETECT_RADIUS * GHOST_DETECT_RADIUS
      const loseR2 = GHOST_LOSE_CHASE_RADIUS * GHOST_LOSE_CHASE_RADIUS

      if (this.state === 'wander') {
        if (
          this.chaseLockout <= 0 &&
          dist * dist <= detectR2
        ) {
          this.state = 'chase'
        }
      } else {
        if (dist * dist > loseR2) {
          this.state = 'wander'
          this.pickWanderTimer()
          this.wanderAngle = Math.random() * Math.PI * 2
        }
      }

      if (this.state === 'chase') {
        if (dist > 1e-4) {
          const inv = 1 / dist
          tx = dx * inv
          tz = dz * inv
          targetSpeed = GHOST_CHASE_SPEED
        } else {
          tx = 0
          tz = 0
          targetSpeed = 0
        }
      } else {
        this.wanderTimer -= dt
        if (this.wanderTimer <= 0) {
          this.wanderAngle = Math.random() * Math.PI * 2
          this.pickWanderTimer()
        }
        tx = Math.cos(this.wanderAngle)
        tz = Math.sin(this.wanderAngle)
        targetSpeed = GHOST_WANDER_SPEED
      }
    }

    const rawLen = Math.hypot(tx, tz)
    if (rawLen > 1e-5) {
      tx /= rawLen
      tz /= rawLen
    }

    let dirSmooth = GHOST_DIRECTION_SMOOTH_WANDER
    if (frightened) {
      dirSmooth = GHOST_DIRECTION_SMOOTH_FRIGHT
    } else if (
      this.state === 'chase' &&
      (relicCarried || !playerInDepositZone)
    ) {
      dirSmooth = GHOST_DIRECTION_SMOOTH_CHASE
    }
    const dirK = 1 - Math.exp(-dirSmooth * dt)
    this.smoothedTx += (tx - this.smoothedTx) * dirK
    this.smoothedTz += (tz - this.smoothedTz) * dirK
    const sl = Math.hypot(this.smoothedTx, this.smoothedTz)
    if (sl > 1e-5) {
      this.smoothedTx /= sl
      this.smoothedTz /= sl
    }

    const desiredVx = this.smoothedTx * targetSpeed
    const desiredVz = this.smoothedTz * targetSpeed

    let steerAccel = GHOST_STEERING_ACCEL_WANDER
    if (frightened) {
      steerAccel = GHOST_STEERING_ACCEL_FRIGHT
    } else if (
      this.state === 'chase' &&
      (relicCarried || !playerInDepositZone)
    ) {
      steerAccel = GHOST_STEERING_ACCEL_CHASE
    }
    const k = 1 - Math.exp(-steerAccel * dt)
    this.velocity.x += (desiredVx - this.velocity.x) * k
    this.velocity.z += (desiredVz - this.velocity.z) * k

    this.scratch.set(this.velocity.x * dt, 0, this.velocity.z * dt)
    this.root.position.add(this.scratch)

    this.resolveWallCollision()

    /**
     * Face toward smoothed intent (not raw velocity). Wall resolution only moves position;
     * velocity can oscillate along barriers while fleeing, which made `atan2(vx,vz)` spin.
     */
    const faceSl = Math.hypot(this.smoothedTx, this.smoothedTz)
    if (faceSl > 0.06) {
      const targetYaw = Math.atan2(this.smoothedTx, this.smoothedTz)
      const cur = this.root.rotation.y
      let delta = targetYaw - cur
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      const turn =
        frightened ? GHOST_FACING_TURN_FRIGHT : GHOST_FACING_TURN_DEFAULT
      this.root.rotation.y = cur + delta * (1 - Math.exp(-turn * dt))
    }

    /** Run clip during pulse flee and during chase; idle only for calm wander. */
    const chaseAnim =
      frightened ||
      (this.state === 'chase' && (relicCarried || !playerInDepositZone))
    const anim = this.root.userData.updateGhostAnimation as
      | ((
          dt: number,
          timeSec: number,
          vx: number,
          vz: number,
          chaseAnim?: boolean,
        ) => void)
      | undefined
    anim?.(dt, timeSec, this.velocity.x, this.velocity.z, chaseAnim)

    this.applyEdgeNudge(targetSpeed)
    this.excludeFromDepositZone()
    this.resolveWallCollision()
  }

  /** Deposit circle at world origin — ghosts cannot overlap the player drop zone. */
  private excludeFromDepositZone(): void {
    const cx = 0
    const cz = 0
    const px = this.root.position.x
    const pz = this.root.position.z
    let dx = px - cx
    let dz = pz - cz
    let dist = Math.hypot(dx, dz)
    const minR = GHOST_DEPOSIT_EXCLUSION_RADIUS
    if (dist >= minR) return

    if (dist < 1e-5) {
      dx = Math.cos(this.wanderAngle)
      dz = Math.sin(this.wanderAngle)
      dist = 1
    }
    const nx = dx / dist
    const nz = dz / dist
    this.root.position.x = cx + nx * minR
    this.root.position.z = cz + nz * minR
    const vn = this.velocity.x * nx + this.velocity.z * nz
    if (vn < 0) {
      this.velocity.x -= vn * nx
      this.velocity.z -= vn * nz
    }
  }

  private resolveWallCollision(): void {
    const r = this.worldCollision.resolveCircleXZ(
      this.root.position.x,
      this.root.position.z,
      GHOST_COLLISION_RADIUS,
    )
    this.root.position.x = r.x
    this.root.position.z = r.z
  }

  /** After inter-ghost separation pushes — keep inside walkable area. */
  resolveAgainstWalls(): void {
    this.resolveWallCollision()
  }

  private applyEdgeNudge(moveSpeed: number): void {
    const m = 2.8
    const px = this.root.position.x
    const pz = this.root.position.z
    let nx = 0
    let nz = 0
    const H = MANSION_WORLD_HALF
    if (px > H - m) nx -= 1
    if (px < -H + m) nx += 1
    if (pz > H - m) nz -= 1
    if (pz < -H + m) nz += 1
    if (nx !== 0 || nz !== 0) {
      const len = Math.hypot(nx, nz) || 1
      const push = moveSpeed * 0.35
      this.velocity.x += (nx / len) * push
      this.velocity.z += (nz / len) * push
    }
  }

  destroy(): void {
    const disposeAnim = this.root.userData.disposeGhostAnim as
      | (() => void)
      | undefined
    disposeAnim?.()
    this.root.position.set(0, 0, 0)
    this.root.traverse((o) => {
      if (o instanceof Mesh) {
        if (!o.userData.sharedGhostGeometry) {
          o.geometry.dispose()
        }
        const mat = o.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat.dispose()
      }
    })
    this.root.removeFromParent()
  }
}
