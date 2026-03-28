import type { Group } from 'three'
import { Vector3 } from 'three'
import type { JoystickVector } from '../input/TouchJoystick.ts'

/** World units per second at full stick deflection; tune here */
export const DEFAULT_PLAYER_MOVE_SPEED = 9

export class PlayerController {
  private readonly velocity = new Vector3()
  /** Horizontal radius for overlap tests (XZ) */
  readonly radius = 0.55
  private readonly playerRoot: Group
  private maxSpeed: number
  private readonly drag: number
  private targetYaw = 0
  private currentYaw = 0
  private readonly turnSmooth = 14

  constructor(
    playerRoot: Group,
    maxSpeed = DEFAULT_PLAYER_MOVE_SPEED,
    drag = 12,
  ) {
    this.playerRoot = playerRoot
    this.maxSpeed = maxSpeed
    this.drag = drag
  }

  get root(): Group {
    return this.playerRoot
  }

  setMaxSpeed(speed: number): void {
    this.maxSpeed = Math.max(2.5, speed)
  }

  getMaxSpeed(): number {
    return this.maxSpeed
  }

  getPosition(out: Vector3): Vector3 {
    return out.copy(this.playerRoot.position)
  }

  /** Horizontal velocity (XZ) for lean / animation */
  getVelocity(out: Vector3): Vector3 {
    return out.set(this.velocity.x, 0, this.velocity.z)
  }

  /** Horizontal speed on XZ (for visuals / juice) */
  getHorizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z)
  }

  /**
   * Reads intent from the input system only (no pointer logic here).
   * Joystick y is screen-down; world forward on XZ is -Z for this camera setup.
   */
  update(dt: number, input: JoystickVector): void {
    if (!input.fingerDown) {
      this.velocity.x = 0
      this.velocity.z = 0
    } else {
      const ax = input.x
      const az = input.y
      const mag = Math.hypot(ax, az)
      const nx = mag > 1e-6 ? ax / mag : 0
      const nz = mag > 1e-6 ? az / mag : 0

      const targetVx = nx * this.maxSpeed
      const targetVz = nz * this.maxSpeed

      const k = 1 - Math.exp(-this.drag * dt)
      this.velocity.x += (targetVx - this.velocity.x) * k
      this.velocity.z += (targetVz - this.velocity.z) * k
    }

    this.playerRoot.position.x += this.velocity.x * dt
    this.playerRoot.position.z += this.velocity.z * dt

    const ax = input.x
    const az = input.y
    const mag = input.fingerDown ? Math.hypot(ax, az) : 0
    const hs = Math.hypot(this.velocity.x, this.velocity.z)
    if (input.fingerDown && (mag > 0.08 || hs > 0.4)) {
      this.targetYaw = Math.atan2(-this.velocity.x, -this.velocity.z)
    }

    const diff = Math.atan2(
      Math.sin(this.targetYaw - this.currentYaw),
      Math.cos(this.targetYaw - this.currentYaw),
    )
    this.currentYaw += diff * (1 - Math.exp(-this.turnSmooth * dt))
    this.playerRoot.rotation.y = this.currentYaw
  }
}
