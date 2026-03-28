import type { Scene } from 'three'
import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from 'three'
import {
  CUT_BURST_RING_DURATION_SEC,
  CUT_BURST_RING_MAX_SCALE,
  CUT_SCATTER_FADE_SEC,
  CUT_SCATTER_MAX_ANIMATED,
  CUT_SCATTER_SPEED_MAX,
  CUT_SCATTER_SPEED_MIN,
  CUT_SCATTER_SPIN,
  CUT_SCATTER_UP,
} from './chainCutConfig.ts'

type Scatter = {
  mesh: Mesh
  vx: number
  vy: number
  vz: number
  spinX: number
  spinZ: number
  t: number
}

const ringScratch = new Vector3()

/** Burst ring + scatter meshes; lightweight (few materials, capped animated count) */
export class ChainCutVfx {
  private readonly scene: Scene
  private readonly bursts: { mesh: Mesh; t: number }[] = []
  private readonly scatters: Scatter[] = []

  constructor(scene: Scene) {
    this.scene = scene
  }

  /** Horizontal ring on ground at cut XZ */
  spawnBurstAt(x: number, z: number): void {
    const geo = new RingGeometry(0.18, 0.38, 24)
    const mat = new MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const mesh = new Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, 0.12, z)
    mesh.scale.setScalar(0.35)
    this.scene.add(mesh)
    this.bursts.push({ mesh, t: 0 })
  }

  /**
   * Detached chain meshes: scatter outward; extras beyond cap are disposed immediately.
   */
  spawnScatter(meshes: Mesh[]): void {
    const n = meshes.length
    if (n === 0) return
    const cap = CUT_SCATTER_MAX_ANIMATED
    for (let i = 0; i < n; i++) {
      const mesh = meshes[i]
      mesh.updateMatrixWorld(true)
      mesh.getWorldPosition(ringScratch)
      const ang = (i / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.6
      const sp =
        CUT_SCATTER_SPEED_MIN +
        Math.random() * (CUT_SCATTER_SPEED_MAX - CUT_SCATTER_SPEED_MIN)
      const vx = Math.cos(ang) * sp
      const vz = Math.sin(ang) * sp
      const vy = CUT_SCATTER_UP * (0.45 + Math.random() * 0.55)
      this.scene.add(mesh)
      mesh.position.set(ringScratch.x, ringScratch.y, ringScratch.z)
      if (i >= cap) {
        mesh.removeFromParent()
        mesh.geometry.dispose()
        const m = mesh.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
        continue
      }
      this.scatters.push({
        mesh,
        vx,
        vy,
        vz,
        spinX: (Math.random() - 0.5) * CUT_SCATTER_SPIN,
        spinZ: (Math.random() - 0.5) * CUT_SCATTER_SPIN,
        t: 0,
      })
    }
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]
      b.t += dt
      const p = b.t / CUT_BURST_RING_DURATION_SEC
      const s = 0.35 + p * CUT_BURST_RING_MAX_SCALE
      b.mesh.scale.setScalar(s)
      const mat = b.mesh.material as MeshBasicMaterial
      mat.opacity = Math.max(0, 0.95 * (1 - p))
      if (p >= 1) {
        b.mesh.removeFromParent()
        b.mesh.geometry.dispose()
        mat.dispose()
        this.bursts.splice(i, 1)
      }
    }

    for (let i = this.scatters.length - 1; i >= 0; i--) {
      const s = this.scatters[i]
      s.t += dt
      const m = s.mesh
      m.position.x += s.vx * dt
      m.position.y += s.vy * dt
      m.position.z += s.vz * dt
      s.vy -= 12 * dt
      m.rotation.x += s.spinX * dt
      m.rotation.z += s.spinZ * dt
      const life = s.t / CUT_SCATTER_FADE_SEC
      m.scale.setScalar(m.scale.x * (0.985 - 0.02 * life))
      if (life >= 1) {
        m.removeFromParent()
        m.geometry.dispose()
        const mat = m.material
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat.dispose()
        this.scatters.splice(i, 1)
      }
    }
  }

  dispose(): void {
    for (const b of this.bursts) {
      b.mesh.removeFromParent()
      b.mesh.geometry.dispose()
      ;(b.mesh.material as MeshBasicMaterial).dispose()
    }
    this.bursts.length = 0
    for (const s of this.scatters) {
      const m = s.mesh
      m.removeFromParent()
      m.geometry.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat.dispose()
    }
    this.scatters.length = 0
  }
}
