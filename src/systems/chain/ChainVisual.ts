import type { Group } from 'three'
import type { Mesh } from 'three'
import { Color, MeshStandardMaterial, Vector2, Vector3 } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import { createChainMesh } from '../items/ItemVisuals.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import {
  CHAIN_ADD_BOUNCE,
  CHAIN_BOUNCE_DECAY,
  CHAIN_FLOAT_Y,
  CHAIN_GRADIENT_EMISSIVE_MIX,
  CHAIN_LINK_SPACING,
  CHAIN_MESH_SCALE,
  CHAIN_POWER_EMISSIVE_HEX,
  CHAIN_POWER_EMISSIVE_INTENSITY,
  CHAIN_POWER_VISUAL_LERP,
  CHAIN_TRAIL_MAX_POINTS,
} from './chainConfig.ts'
import { SnakeTrail } from './SnakeTrail.ts'
import {
  WHIP_FOLLOW_SMOOTH,
  WHIP_INERTIA_DECAY,
  WHIP_MAX_LATERAL,
  WHIP_MIN_SPEED,
  WHIP_MULTIPLIER,
  WHIP_TURN_RATE_REF,
  WHIP_VELOCITY_FILTER,
} from './chainWhipConfig.ts'

const powerEmissiveTarget = new Color(CHAIN_POWER_EMISSIVE_HEX)

type ChainCarryItem = Exclude<GameItem, { type: 'powerPellet' }>

function shortAngleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/**
 * Tail positions follow PacManScrabble-style `SnakeTrail`: head samples each frame,
 * segments placed at fixed arc length along the path (stable spacing, natural bends).
 */
export class ChainVisual {
  private readonly chainGroup: Group
  private readonly player: PlayerController
  private readonly snakeTrail: SnakeTrail
  private meshes: Mesh[] = []
  private prevIds: string[] = []
  private readonly smoothed: Vector3[] = []
  private readonly scratchTarget = new Vector3()
  private readonly scratchVel = new Vector3()
  private readonly filteredVel = new Vector3()
  private readonly chainBehindDir = new Vector3(0, 0, 1)
  private readonly headXZ = new Vector2()
  private readonly segXZ = new Vector2()
  private chainPowerMode = false

  private whipLateralState = 0
  private prevHeading = 0
  private whipHeadingInitialized = false

  constructor(chainGroup: Group, player: PlayerController) {
    this.chainGroup = chainGroup
    this.player = player
    this.snakeTrail = new SnakeTrail(CHAIN_LINK_SPACING, CHAIN_TRAIL_MAX_POINTS)
  }

  setPowerMode(active: boolean): void {
    this.chainPowerMode = active
  }

  sync(items: readonly GameItem[]): void {
    const idsNewestFirst = [...items].reverse().map((x) => x.id)

    if (
      idsNewestFirst.length === this.prevIds.length &&
      idsNewestFirst.every((id, i) => id === this.prevIds[i])
    ) {
      return
    }

    if (idsNewestFirst.length === 0) {
      this.clearMeshes()
      this.prevIds = []
      return
    }

    const sameHeadGrow =
      idsNewestFirst.length === this.prevIds.length + 1 &&
      this.prevIds.length > 0 &&
      this.prevIds.every((id, i) => id === idsNewestFirst[i + 1])

    if (sameHeadGrow) {
      const item = items[items.length - 1]
      const mesh = createChainMesh(item as ChainCarryItem)
      mesh.userData.chainItemId = item.id
      mesh.userData.chainTargetScale = CHAIN_MESH_SCALE
      mesh.userData.chainBounce = 1
      mesh.scale.setScalar(0.16 * CHAIN_MESH_SCALE)
      this.player.getPosition(this.scratchTarget)
      this.getChainBehindDirXZ(this.chainBehindDir)
      const bx = this.chainBehindDir.x
      const bz = this.chainBehindDir.z
      const px = this.scratchTarget.x
      const pz = this.scratchTarget.z
      const hx = px + bx * CHAIN_LINK_SPACING
      const hz = pz + bz * CHAIN_LINK_SPACING
      mesh.position.set(hx, CHAIN_FLOAT_Y + CHAIN_ADD_BOUNCE * 0.2, hz)
      this.chainGroup.add(mesh)
      this.meshes.unshift(mesh)
      this.smoothed.unshift(new Vector3(hx, CHAIN_FLOAT_Y, hz))
      this.prevIds = idsNewestFirst
      return
    }

    this.fullRebuild(items, idsNewestFirst)
    this.prevIds = idsNewestFirst
  }

  update(dt: number): void {
    const kScale = 1 - Math.exp(-16 * dt)
    const kY = 1 - Math.exp(-12 * dt)
    const kB = 1 - Math.exp(-CHAIN_BOUNCE_DECAY * dt)

    this.player.getPosition(this.scratchTarget)
    const px = this.scratchTarget.x
    const pz = this.scratchTarget.z

    this.updateWhipState(dt)

    this.headXZ.set(px, pz)
    this.snakeTrail.pushHead(this.headXZ)

    const n = this.meshes.length
    for (let i = 0; i < n; i++) {
      this.snakeTrail.getSegmentPositionInto(i, this.headXZ, this.segXZ)
      const sx = this.smoothed[i]
      sx.x = this.segXZ.x
      sx.z = this.segXZ.y

      const mesh = this.meshes[i]
      mesh.position.x = sx.x
      mesh.position.z = sx.z
      const bounce = (mesh.userData.chainBounce as number | undefined) ?? 0
      const targetY =
        CHAIN_FLOAT_Y + bounce * CHAIN_ADD_BOUNCE * 0.22
      mesh.position.y += (targetY - mesh.position.y) * kY
      if (bounce > 0.002) {
        mesh.userData.chainBounce = bounce * (1 - kB)
      } else {
        mesh.userData.chainBounce = 0
      }
      const target =
        (mesh.userData.chainTargetScale as number | undefined) ??
        CHAIN_MESH_SCALE
      const sc = mesh.scale.x
      const ns = sc + (target - sc) * kScale
      mesh.scale.setScalar(ns)
    }

    const kPow = 1 - Math.exp(-CHAIN_POWER_VISUAL_LERP * dt)
    const wantPow = this.chainPowerMode ? 1 : 0
    for (let i = 0; i < n; i++) {
      const mesh = this.meshes[i]
      let blend = (mesh.userData.chainPowerBlend as number | undefined) ?? 0
      blend += (wantPow - blend) * kPow
      mesh.userData.chainPowerBlend = blend
      const tGrad = n > 1 ? i / (n - 1) : 0
      const headBoost = (1 - tGrad) * CHAIN_GRADIENT_EMISSIVE_MIX
      const mats = mesh.material
      const arr = Array.isArray(mats) ? mats : [mats]
      for (const m of arr) {
        const std = m as MeshStandardMaterial
        if (!std.emissive) continue
        if (!mesh.userData.chainEmitOrig) {
          mesh.userData.chainEmitOrig = std.emissive.clone()
          mesh.userData.chainEmitIntOrig = std.emissiveIntensity
        }
        const orig = mesh.userData.chainEmitOrig as Color
        const origInt = mesh.userData.chainEmitIntOrig as number
        std.emissive.lerpColors(orig, powerEmissiveTarget, blend)
        const powered =
          origInt + (CHAIN_POWER_EMISSIVE_INTENSITY - origInt) * blend
        std.emissiveIntensity = powered * (1 + headBoost)
      }
    }
  }

  getSegmentCount(): number {
    return this.meshes.length
  }

  getWhipIntensity(): number {
    return Math.min(1, Math.abs(this.whipLateralState) / WHIP_MAX_LATERAL)
  }

  copySegmentWorld(i: number, out: Vector3): void {
    if (i < 0 || i >= this.meshes.length) {
      out.set(0, CHAIN_FLOAT_Y, 0)
      return
    }
    const m = this.meshes[i]
    const s = this.smoothed[i]
    out.set(s.x, m.position.y, s.z)
  }

  detachTailFromVisualIndex(fromIndex: number): Mesh[] {
    if (fromIndex < 0 || fromIndex >= this.meshes.length) return []
    const detached = this.meshes.splice(fromIndex)
    this.prevIds.splice(fromIndex)
    this.smoothed.splice(fromIndex)
    for (const m of detached) {
      this.chainGroup.remove(m)
    }
    return detached
  }

  extractTailMeshForDeposit(item: GameItem): Mesh {
    if (this.meshes.length === 0) {
      throw new Error('ChainVisual.extractTailMeshForDeposit: empty chain')
    }
    const tailId = this.prevIds[this.prevIds.length - 1]
    if (tailId !== item.id) {
      throw new Error('ChainVisual.extractTailMeshForDeposit: item/chain mismatch')
    }
    const mesh = this.meshes.pop()!
    this.prevIds.pop()
    this.smoothed.pop()
    this.chainGroup.updateMatrixWorld(true)
    mesh.updateMatrixWorld(true)
    const w = new Vector3()
    mesh.getWorldPosition(w)
    mesh.userData.depositWorldStart = w.clone()
    this.chainGroup.remove(mesh)
    return mesh
  }

  private updateWhipState(dt: number): void {
    this.player.getVelocity(this.scratchVel)
    const kV = 1 - Math.exp(-WHIP_VELOCITY_FILTER * dt)
    this.filteredVel.x += (this.scratchVel.x - this.filteredVel.x) * kV
    this.filteredVel.z += (this.scratchVel.z - this.filteredVel.z) * kV
    const vx = this.filteredVel.x
    const vz = this.filteredVel.z
    const speed = Math.hypot(vx, vz)

    let heading = this.prevHeading
    if (speed > 1e-5) {
      heading = Math.atan2(vx, vz)
    }

    let deltaHeading = 0
    if (
      this.whipHeadingInitialized &&
      speed >= WHIP_MIN_SPEED &&
      dt > 1e-8
    ) {
      deltaHeading = shortAngleDiff(heading, this.prevHeading)
    }
    if (speed > 1e-5) {
      this.prevHeading = heading
      this.whipHeadingInitialized = true
    }

    const turnRate = Math.abs(deltaHeading) / dt
    const turnSign = Math.abs(deltaHeading) > 1e-7 ? Math.sign(deltaHeading) : 0

    let targetWhip = 0
    if (speed >= WHIP_MIN_SPEED && turnSign !== 0) {
      const saturation = 1 / (1 + turnRate / WHIP_TURN_RATE_REF)
      const raw =
        turnSign * turnRate * speed * WHIP_MULTIPLIER * saturation
      targetWhip = Math.max(
        -WHIP_MAX_LATERAL,
        Math.min(WHIP_MAX_LATERAL, raw),
      )
    }

    const kFollow = 1 - Math.exp(-WHIP_FOLLOW_SMOOTH * dt)
    this.whipLateralState += (targetWhip - this.whipLateralState) * kFollow
    if (Math.abs(targetWhip) < 0.02) {
      this.whipLateralState *= Math.exp(-WHIP_INERTIA_DECAY * dt)
    }
    this.whipLateralState = Math.max(
      -WHIP_MAX_LATERAL,
      Math.min(WHIP_MAX_LATERAL, this.whipLateralState),
    )
  }

  private getChainBehindDirXZ(out: Vector3): void {
    this.player.getVelocity(this.scratchVel)
    const hs = Math.hypot(this.scratchVel.x, this.scratchVel.z)
    if (hs > 0.12) {
      out.set(-this.scratchVel.x / hs, 0, -this.scratchVel.z / hs)
    } else {
      out.set(0, 0, 1)
    }
  }

  private fullRebuild(
    items: readonly GameItem[],
    idsNewestFirst: string[],
  ): void {
    this.clearMeshes()
    this.player.getPosition(this.scratchTarget)
    const px0 = this.scratchTarget.x
    const pz0 = this.scratchTarget.z
    this.getChainBehindDirXZ(this.chainBehindDir)
    const bx = this.chainBehindDir.x
    const bz = this.chainBehindDir.z

    for (let idx = items.length - 1; idx >= 0; idx--) {
      const item = items[idx]
      const mesh = createChainMesh(item as ChainCarryItem)
      mesh.userData.chainItemId = item.id
      mesh.userData.chainTargetScale = CHAIN_MESH_SCALE
      mesh.userData.chainBounce = 0
      const meshIdx = items.length - 1 - idx
      const dist = (meshIdx + 1) * CHAIN_LINK_SPACING
      const px = px0 + bx * dist
      const pz = pz0 + bz * dist
      mesh.position.set(px, CHAIN_FLOAT_Y, pz)
      this.chainGroup.add(mesh)
      this.meshes.push(mesh)
      this.smoothed.push(new Vector3(px, CHAIN_FLOAT_Y, pz))
    }
    this.prevIds = idsNewestFirst
  }

  private clearMeshes(): void {
    for (const m of this.meshes) {
      delete m.userData.chainPowerBlend
      delete m.userData.chainEmitOrig
      delete m.userData.chainEmitIntOrig
      this.chainGroup.remove(m)
      m.geometry.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat.dispose()
    }
    this.meshes = []
    this.smoothed.length = 0
    this.snakeTrail.reset()
    this.filteredVel.set(0, 0, 0)
    this.whipLateralState = 0
    this.whipHeadingInitialized = false
    this.prevHeading = 0
  }
}
