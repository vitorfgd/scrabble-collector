import type { Group, PerspectiveCamera } from 'three'
import { Vector3 } from 'three'

const playerPos = new Vector3()
const desired = new Vector3()

/** Smooth follow: angled top-down (camera offset above and behind player) */
export class CameraRig {
  private readonly camera: PerspectiveCamera
  private readonly target: Group
  private readonly offset: Vector3
  private readonly smooth: number

  constructor(
    camera: PerspectiveCamera,
    target: Group,
    offset = new Vector3(0, 18, 12),
    smooth = 6,
  ) {
    this.camera = camera
    this.target = target
    this.offset = offset
    this.smooth = smooth
  }

  update(dt: number): void {
    this.target.getWorldPosition(playerPos)
    desired.copy(playerPos).add(this.offset)
    const k = 1 - Math.exp(-this.smooth * dt)
    this.camera.position.lerp(desired, k)
    this.camera.lookAt(playerPos)
  }
}
