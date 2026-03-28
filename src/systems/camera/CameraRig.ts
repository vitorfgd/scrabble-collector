import type { Group, PerspectiveCamera } from 'three'
import { Vector3 } from 'three'
import {
  CAMERA_OFFSET_BASE,
  CAMERA_SMOOTH,
  CAMERA_STACK_ZOOM_MAX,
  CAMERA_STACK_ZOOM_Y,
  CAMERA_STACK_ZOOM_Z,
} from '../../juice/juiceConfig.ts'

const playerPos = new Vector3()
const desired = new Vector3()
const offsetWithZoom = new Vector3()

/** Smooth follow + subtle pull-back when stack grows */
export class CameraRig {
  private readonly camera: PerspectiveCamera
  private readonly target: Group
  private readonly smooth: number
  private readonly getStackCount: () => number
  private shakeT = 0
  private shakeMag = 0

  constructor(
    camera: PerspectiveCamera,
    target: Group,
    getStackCount: () => number,
    smooth = CAMERA_SMOOTH,
  ) {
    this.camera = camera
    this.target = target
    this.getStackCount = getStackCount
    this.smooth = smooth
  }

  /** Brief positional jitter (world units peak); stacks coarsely for bigger hits */
  impulseShake(magnitude: number, durationSec: number): void {
    if (magnitude <= 0 || durationSec <= 0) return
    this.shakeMag = Math.max(this.shakeMag, magnitude)
    this.shakeT = Math.max(this.shakeT, durationSec)
  }

  update(dt: number): void {
    this.target.getWorldPosition(playerPos)
    const n = this.getStackCount()
    const zoom = Math.min(CAMERA_STACK_ZOOM_MAX, n * 1)
    offsetWithZoom.set(
      CAMERA_OFFSET_BASE.x,
      CAMERA_OFFSET_BASE.y + zoom * CAMERA_STACK_ZOOM_Y,
      CAMERA_OFFSET_BASE.z + zoom * CAMERA_STACK_ZOOM_Z,
    )
    desired.copy(playerPos).add(offsetWithZoom)
    if (this.shakeT > 0 && this.shakeMag > 0) {
      const s = this.shakeMag
      desired.x += (Math.random() - 0.5) * 2 * s
      desired.z += (Math.random() - 0.5) * 2 * s
      this.shakeT -= dt
      if (this.shakeT <= 0) {
        this.shakeT = 0
        this.shakeMag = 0
      }
    }
    const k = 1 - Math.exp(-this.smooth * dt)
    this.camera.position.lerp(desired, k)
    this.camera.lookAt(playerPos)
  }
}
