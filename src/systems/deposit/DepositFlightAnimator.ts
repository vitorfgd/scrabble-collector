import type { Mesh } from 'three'
import type { Scene } from 'three'
import { Vector3 } from 'three'

/** Same duration for letters and crystals */
export const DEPOSIT_FLIGHT_DURATION_SEC = 0.11
const EASE_POWER = 2.2

/**
 * Single-mesh arc from carried world start into the deposit point, then dispose.
 * DepositController chains one flight after another for a full unload.
 */
export class DepositFlightAnimator {
  private active = false
  private scene: Scene | null = null
  private t = 0
  private mesh: Mesh | null = null
  private durationSec = DEPOSIT_FLIGHT_DURATION_SEC
  private readonly start = new Vector3()
  private readonly end = new Vector3()
  private onComplete: (() => void) | null = null

  get busy(): boolean {
    return this.active
  }

  /** Drop current flight without calling onComplete (e.g. player left deposit zone). */
  cancel(): void {
    if (!this.active) return
    if (this.mesh) {
      this.disposeMesh(this.mesh)
      this.mesh = null
    }
    this.active = false
    this.scene = null
    this.onComplete = null
  }

  startOne(
    scene: Scene,
    mesh: Mesh,
    depositWorldPos: Vector3,
    onComplete: () => void,
    durationSec: number = DEPOSIT_FLIGHT_DURATION_SEC,
  ): void {
    this.scene = scene
    this.mesh = mesh
    this.t = 0
    this.durationSec = durationSec
    this.end.copy(depositWorldPos)
    this.end.y += 0.48
    this.onComplete = onComplete

    const w = mesh.userData.depositWorldStart as Vector3 | undefined
    scene.add(mesh)
    if (w) {
      mesh.position.copy(w)
      this.start.copy(w)
      delete mesh.userData.depositWorldStart
    } else {
      mesh.updateMatrixWorld(true)
      const fb = new Vector3()
      mesh.getWorldPosition(fb)
      mesh.position.copy(fb)
      this.start.copy(fb)
    }
    this.active = true
  }

  update(dt: number): void {
    if (!this.active || !this.scene || !this.mesh) return

    const m = this.mesh
    this.t += dt
    const alpha = Math.min(1, this.t / this.durationSec)
    const ease = 1 - Math.pow(1 - alpha, EASE_POWER)
    m.position.lerpVectors(this.start, this.end, ease)

    if (alpha >= 1) {
      this.disposeMesh(m)
      this.mesh = null
      this.finish()
    }
  }

  private disposeMesh(mesh: Mesh): void {
    this.scene?.remove(mesh)
    mesh.geometry.dispose()
    const mat = mesh.material
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat.dispose()
  }

  private finish(): void {
    this.active = false
    this.scene = null
    const cb = this.onComplete
    this.onComplete = null
    cb?.()
  }
}
