import type { Mesh } from 'three'
import type { Scene } from 'three'
import { Vector3 } from 'three'
import {
  DEPOSIT_ARC_EASE,
  DEPOSIT_ARC_HEIGHT,
  DEPOSIT_FLIGHT_DURATION_SEC,
} from '../../juice/juiceConfig.ts'
import {
  OVERLOAD_ARC_HEIGHT_MULT,
  OVERLOAD_ARC_HEIGHT_MULT_PERFECT,
  OVERLOAD_SPIRAL_AMPLITUDE,
  OVERLOAD_SPIRAL_AMPLITUDE_PERFECT,
  OVERLOAD_SPIRAL_TURNS,
} from '../overload/overloadDropConfig.ts'

export { DEPOSIT_FLIGHT_DURATION_SEC } from '../../juice/juiceConfig.ts'

const EASE_POWER = DEPOSIT_ARC_EASE

export type DepositFlightOverloadStyle = {
  spiralIndex: number
  spiralTotal: number
  perfect: boolean
}

export class DepositFlightAnimator {
  private active = false
  private scene: Scene | null = null
  private t = 0
  private mesh: Mesh | null = null
  private durationSec = DEPOSIT_FLIGHT_DURATION_SEC
  private readonly start = new Vector3()
  private readonly end = new Vector3()
  private readonly mid = new Vector3()
  private overloadStyle: DepositFlightOverloadStyle | null = null
  private onComplete: (() => void) | null = null

  get busy(): boolean {
    return this.active
  }

  cancel(): void {
    if (!this.active) return
    if (this.mesh) {
      this.disposeMesh(this.mesh)
      this.mesh = null
    }
    this.active = false
    this.scene = null
    this.overloadStyle = null
    this.onComplete = null
  }

  startOne(
    scene: Scene,
    mesh: Mesh,
    depositWorldPos: Vector3,
    onComplete: () => void,
    durationSec: number = DEPOSIT_FLIGHT_DURATION_SEC,
    overloadStyle: DepositFlightOverloadStyle | null = null,
  ): void {
    this.scene = scene
    this.mesh = mesh
    this.overloadStyle = overloadStyle
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

    const arcMult = overloadStyle
      ? overloadStyle.perfect
        ? OVERLOAD_ARC_HEIGHT_MULT_PERFECT
        : OVERLOAD_ARC_HEIGHT_MULT
      : 1
    this.mid.copy(this.start).lerp(this.end, 0.5)
    this.mid.y += DEPOSIT_ARC_HEIGHT * arcMult

    this.active = true
  }

  update(dt: number): void {
    if (!this.active || !this.scene || !this.mesh) return

    const m = this.mesh
    this.t += dt
    const alpha = Math.min(1, this.t / this.durationSec)
    const ease = 1 - Math.pow(1 - alpha, EASE_POWER)
    const u = ease
    const omu = 1 - u
    let x =
      omu * omu * this.start.x + 2 * omu * u * this.mid.x + u * u * this.end.x
    let y =
      omu * omu * this.start.y + 2 * omu * u * this.mid.y + u * u * this.end.y
    let z =
      omu * omu * this.start.z + 2 * omu * u * this.mid.z + u * u * this.end.z

    const ov = this.overloadStyle
    if (ov) {
      const dx = this.end.x - this.start.x
      const dz = this.end.z - this.start.z
      const flatLen = Math.hypot(dx, dz) || 1e-6
      const perpX = -dz / flatLen
      const perpZ = dx / flatLen
      const phase =
        (ov.spiralIndex / Math.max(1, ov.spiralTotal)) * Math.PI * 2
      const spiral = Math.sin(u * Math.PI * 2 * OVERLOAD_SPIRAL_TURNS + phase)
      const amp = ov.perfect
        ? OVERLOAD_SPIRAL_AMPLITUDE_PERFECT
        : OVERLOAD_SPIRAL_AMPLITUDE
      const wob = spiral * amp * (1 - u)
      x += perpX * wob
      z += perpZ * wob
    }

    m.position.set(x, y, z)

    if (alpha >= 1) {
      this.disposeMesh(m)
      this.mesh = null
      this.overloadStyle = null
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
