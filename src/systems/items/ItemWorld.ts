import {
  Mesh,
  Sprite,
  SpriteMaterial,
  type Group,
  type Object3D,
  type Scene,
} from 'three'
import type { Vector3 } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import { createPickupMesh } from './ItemVisuals.ts'
import {
  attachPickupIdleMotion,
  updatePickupIdleMotion,
} from './PickupMotion.ts'
import { COLLECT_POP_SEC } from '../../juice/juiceConfig.ts'

type Entry = { mesh: Object3D; item: GameItem }

type CollectAnim = { mesh: Object3D; t: number }

/**
 * Owns world pickups: logical `GameItem` + Three.js mesh.
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
    const y = mesh.position.y
    mesh.position.set(x, y, z)
    attachPickupIdleMotion(mesh, 'wisp')
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

  applyMagnetPull(
    playerXZ: Vector3,
    collectRadius: number,
    magnetExtra: number,
    pullSpeed: number,
    dt: number,
  ): void {
    const innerR = collectRadius
    const outerR = collectRadius + magnetExtra
    const outerR2 = outerR * outerR
    const innerR2 = innerR * innerR
    for (const [, { mesh }] of this.byId) {
      const dx = playerXZ.x - mesh.position.x
      const dz = playerXZ.z - mesh.position.z
      const d2 = dx * dx + dz * dz
      if (d2 <= innerR2 || d2 > outerR2) continue
      const d = Math.sqrt(d2) || 1e-6
      const nx = dx / d
      const nz = dz / d
      const t = Math.min(1, (Math.sqrt(d2) - innerR) / magnetExtra)
      const step = pullSpeed * dt * (0.35 + 0.65 * t * t)
      mesh.position.x += nx * step
      mesh.position.z += nz * step
    }
  }

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

  getPickupCount(): number {
    return this.byId.size
  }

  /** World wisps only (not carried). */
  countWisps(): number {
    let n = 0
    for (const [, { item }] of this.byId) {
      if (item.type === 'wisp') n += 1
    }
    return n
  }

  hasPickup(id: string): boolean {
    return this.byId.has(id)
  }

  /** Pickup root position in world (pickup group assumed at scene origin). */
  getPickupXZ(id: string): { x: number; z: number } | null {
    const e = this.byId.get(id)
    if (!e) return null
    return { x: e.mesh.position.x, z: e.mesh.position.z }
  }

  entries(): IterableIterator<[string, Entry]> {
    return this.byId.entries()
  }

  updateVisuals(timeSec: number, dt: number): void {
    for (const [, { mesh, item }] of this.byId) {
      updatePickupIdleMotion(mesh, timeSec, dt)
      if (item.type === 'wisp') {
        const body = mesh.userData.wispBody as Mesh | undefined
        const mid = mesh.userData.wispMid as Mesh | undefined
        const halo = mesh.userData.wispHalo as Mesh | undefined
        const h = item.hue * 20
        if (body) {
          const pulse = 0.95 + 0.05 * Math.sin(timeSec * 3.8 + h)
          body.scale.setScalar(pulse)
        }
        if (mid) {
          const mp = 0.97 + 0.03 * Math.sin(timeSec * 3.2 + h * 0.5)
          mid.scale.setScalar(mp)
          const mm = mid.material
          if (mm && !Array.isArray(mm) && 'emissiveIntensity' in mm) {
            mm.emissiveIntensity = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(timeSec * 4.4))
          }
        }
        if (halo) {
          const hp = 0.92 + 0.08 * Math.sin(timeSec * 2.7 + 0.7)
          halo.scale.setScalar(hp)
          const hm = halo.material
          if (hm && !Array.isArray(hm) && 'emissiveIntensity' in hm) {
            hm.emissiveIntensity = 0.42 + 0.22 * (0.5 + 0.5 * Math.sin(timeSec * 4.9))
          }
        }
      } else if (item.type === 'relic') {
        const gem = mesh.userData.relicGem as Mesh | undefined
        const rHalo = mesh.userData.relicHalo as Mesh | undefined
        const h = item.hue * 30
        if (gem) {
          gem.rotation.y += dt * 1.1
          const pulse = 0.94 + 0.06 * Math.sin(timeSec * 4.2 + h)
          gem.scale.setScalar(pulse)
        }
        if (rHalo) {
          const hp = 0.88 + 0.12 * Math.sin(timeSec * 3.1)
          rHalo.scale.setScalar(hp)
          const hm = rHalo.material
          if (hm && !Array.isArray(hm) && 'emissiveIntensity' in hm) {
            hm.emissiveIntensity = 0.5 + 0.35 * (0.5 + 0.5 * Math.sin(timeSec * 5.2))
          }
        }
      }
    }
  }

  private disposeMesh(root: Object3D): void {
    root.removeFromParent()
    root.traverse((o) => {
      if (o instanceof Sprite) {
        const m = o.material as SpriteMaterial
        m.map?.dispose()
        m.dispose()
        return
      }
      if (o instanceof Mesh) {
        o.geometry.dispose()
        const m = o.material
        if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
        else m.dispose()
      }
    })
  }
}
