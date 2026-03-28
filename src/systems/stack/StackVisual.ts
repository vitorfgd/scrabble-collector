import type { Object3D } from 'three'
import type { Mesh } from 'three'
import { Vector3 } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import { createStackMesh } from '../items/ItemVisuals.ts'
import {
  STACK_ADD_BOUNCE,
  STACK_BOUNCE_DECAY,
} from '../../juice/juiceConfig.ts'

const STEP_Y = 0.44
const SPAWN_SCALE = 0.14

/** Carried stack meshes on the anchor; data-driven, type-agnostic */
export class StackVisual {
  private meshes: Mesh[] = []
  private prevIds: string[] = []
  private readonly anchor: Object3D

  constructor(anchor: Object3D) {
    this.anchor = anchor
  }

  sync(items: readonly GameItem[]): void {
    const ids = items.map((x) => x.id)

    if (
      ids.length === this.prevIds.length &&
      ids.every((id, i) => id === this.prevIds[i])
    ) {
      return
    }

    if (ids.length === 0) {
      this.clearMeshes()
      this.prevIds = []
      return
    }

    const samePrefix =
      ids.length > this.prevIds.length &&
      this.prevIds.length > 0 &&
      this.prevIds.every((id, i) => id === ids[i])

    if (samePrefix && ids.length === this.prevIds.length + 1) {
      const item = items[items.length - 1]
      const mesh = createStackMesh(item)
      mesh.userData.stackItemId = item.id
      const i = items.length - 1
      mesh.position.y = i * STEP_Y + STACK_ADD_BOUNCE * STEP_Y
      mesh.position.x = 0
      mesh.position.z = 0
      mesh.scale.setScalar(SPAWN_SCALE)
      mesh.userData.stackTargetScale = 1
      mesh.userData.stackBounce = 1
      this.anchor.add(mesh)
      this.meshes.push(mesh)
      this.prevIds = ids
      return
    }

    this.fullRebuild(items)
    this.prevIds = ids
  }

  /** Smooth scale-in for new items and Y settle after layout changes */
  update(dt: number): void {
    const kScale = 1 - Math.exp(-16 * dt)
    const kY = 1 - Math.exp(-12 * dt)
    const kB = 1 - Math.exp(-STACK_BOUNCE_DECAY * dt)
    this.meshes.forEach((mesh, i) => {
      const bounce = (mesh.userData.stackBounce as number | undefined) ?? 0
      const targetY = i * STEP_Y + bounce * STEP_Y * STACK_ADD_BOUNCE
      mesh.position.y += (targetY - mesh.position.y) * kY
      if (bounce > 0.002) {
        mesh.userData.stackBounce = bounce * (1 - kB)
      } else {
        mesh.userData.stackBounce = 0
      }
      const target =
        (mesh.userData.stackTargetScale as number | undefined) ?? 1
      const s = mesh.scale.x
      const ns = s + (target - s) * kScale
      mesh.scale.setScalar(ns)
    })
  }

  /**
   * After `stack.popFromTop({ silent: true })`, detaches the top mesh for deposit flight.
   * Caller must `stack.notifyChange()` so HUD/sync see the new snapshot.
   */
  extractTopMeshForDeposit(item: GameItem): Mesh {
    if (this.meshes.length === 0) {
      throw new Error('StackVisual.extractTopMeshForDeposit: empty stack')
    }
    const lastId = this.prevIds[this.prevIds.length - 1]
    if (lastId !== item.id) {
      throw new Error('StackVisual.extractTopMeshForDeposit: item/stack mismatch')
    }
    const mesh = this.meshes.pop()!
    this.prevIds.pop()
    this.anchor.updateMatrixWorld(true)
    mesh.updateMatrixWorld(true)
    const w = new Vector3()
    mesh.getWorldPosition(w)
    mesh.userData.depositWorldStart = w.clone()
    this.anchor.remove(mesh)
    return mesh
  }

  private fullRebuild(items: readonly GameItem[]): void {
    this.clearMeshes()
    items.forEach((item, i) => {
      const mesh = createStackMesh(item)
      mesh.userData.stackItemId = item.id
      mesh.position.y = i * STEP_Y
      mesh.scale.setScalar(1)
      this.anchor.add(mesh)
      this.meshes.push(mesh)
    })
  }

  private clearMeshes(): void {
    for (const m of this.meshes) {
      this.anchor.remove(m)
      m.geometry.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat.dispose()
    }
    this.meshes = []
  }
}
