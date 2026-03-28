import type { Group, Mesh, Scene } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import { createPickupMesh } from './ItemVisuals.ts'
import {
  attachPickupIdleMotion,
  updatePickupIdleMotion,
} from './PickupMotion.ts'

type Entry = { mesh: Mesh; item: GameItem }

type CollectAnim = { mesh: Mesh; t: number }

const COLLECT_POP_SEC = 0.22

/**
 * Owns world pickups: logical `GameItem` + Three.js mesh.
 * Data lives on `item`; motion is visual-only on the mesh.
 */
export class ItemWorld {
  private readonly byId = new Map<string, Entry>()
  private readonly pickupGroup: Group
  private readonly scene: Scene
  private readonly collectAnims: CollectAnim[] = []

  constructor(pickupGroup: Group, scene: Scene) {
    this.pickupGroup = pickupGroup
    this.scene = scene
  }

  spawn(item: GameItem, x: number, z: number): void {
    if (this.byId.has(item.id)) return
    const mesh = createPickupMesh(item)
    mesh.position.set(x, 0, z)
    attachPickupIdleMotion(mesh)
    this.pickupGroup.add(mesh)
    this.byId.set(item.id, { mesh, item })
  }

  remove(id: string): void {
    const e = this.byId.get(id)
    if (!e) return
    this.pickupGroup.remove(e.mesh)
    this.disposeMesh(e.mesh)
    this.byId.delete(id)
  }

  /**
   * After a successful stack push: remove from pickup sim, keep mesh for a short pop, then dispose.
   */
  detachPickupForCollect(id: string): void {
    const e = this.byId.get(id)
    if (!e) return
    this.byId.delete(id)
    this.pickupGroup.remove(e.mesh)
    delete e.mesh.userData.pickupIdle
    this.scene.attach(e.mesh)
    this.collectAnims.push({ mesh: e.mesh, t: 0 })
  }

  updateCollectEffects(dt: number): void {
    for (let i = this.collectAnims.length - 1; i >= 0; i--) {
      const a = this.collectAnims[i]
      a.t += dt
      const p = Math.min(1, a.t / COLLECT_POP_SEC)
      // Punch up then shrink (juice)
      let s: number
      if (p < 0.45) {
        s = 1 + 0.38 * Math.sin((p / 0.45) * (Math.PI / 2))
      } else {
        s = 1.38 * (1 - (p - 0.45) / 0.55)
      }
      a.mesh.scale.setScalar(Math.max(0.001, s))
      if (p >= 1) {
        this.disposeMesh(a.mesh)
        this.collectAnims.splice(i, 1)
      }
    }
  }

  entries(): IterableIterator<[string, Entry]> {
    return this.byId.entries()
  }

  updateVisuals(timeSec: number, dt: number): void {
    for (const [, { mesh }] of this.byId) {
      updatePickupIdleMotion(mesh, timeSec, dt)
    }
  }

  private disposeMesh(mesh: Mesh): void {
    mesh.removeFromParent()
    mesh.geometry.dispose()
    const m = mesh.material
    if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
    else m.dispose()
  }
}
