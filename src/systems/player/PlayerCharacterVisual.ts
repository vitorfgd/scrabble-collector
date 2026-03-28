import {
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three'

export type PlayerCharacterAnimState = {
  /** Seconds, for idle sine */
  timeSec: number
  /** Horizontal speed (world XZ) */
  speed: number
  /** Velocity X (world) for lateral lean */
  velX: number
  itemsCarried: number
  maxCarry: number
}

/**
 * Procedural hypercasual character: capsule torso, sphere head, small foot pads.
 * Top-down readable: large head, saturated colors. No external assets.
 */
export class PlayerCharacterVisual {
  readonly root: Group
  /** World-space anchor for carried stack (moves with bob/lean) */
  readonly stackAnchor: Object3D

  private readonly bobGroup: Group
  private readonly leanGroup: Group
  private readonly baseBobY: number

  constructor() {
    this.root = new Group()
    this.root.name = 'playerCharacter'

    this.bobGroup = new Group()
    this.bobGroup.name = 'bob'
    this.root.add(this.bobGroup)

    this.leanGroup = new Group()
    this.leanGroup.name = 'lean'
    this.bobGroup.add(this.leanGroup)

    const skin = new MeshStandardMaterial({
      color: new Color(0xff7a4a),
      roughness: 0.42,
      metalness: 0.08,
    })
    const shirt = new MeshStandardMaterial({
      color: new Color(0x3d9bcd),
      roughness: 0.55,
      metalness: 0.05,
    })
    const dark = new MeshStandardMaterial({
      color: new Color(0x2a2a34),
      roughness: 0.7,
      metalness: 0.1,
    })

    const torso = new Mesh(
      new CapsuleGeometry(0.34, 0.52, 6, 12),
      shirt,
    )
    torso.position.y = 0.62
    torso.castShadow = true
    torso.receiveShadow = true
    this.leanGroup.add(torso)

    const head = new Mesh(new SphereGeometry(0.36, 14, 12), skin)
    head.position.y = 1.18
    head.castShadow = true
    head.receiveShadow = true
    this.leanGroup.add(head)

    const footGeo = new SphereGeometry(0.16, 10, 8)
    const footL = new Mesh(footGeo, dark)
    footL.position.set(-0.22, 0.14, 0.08)
    footL.scale.set(1, 0.55, 1.25)
    footL.castShadow = true
    const footR = new Mesh(footGeo, dark)
    footR.position.set(0.22, 0.14, 0.08)
    footR.scale.set(1, 0.55, 1.25)
    footR.castShadow = true
    this.leanGroup.add(footL, footR)

    this.stackAnchor = new Object3D()
    this.stackAnchor.position.set(0, 1.35, -0.42)
    this.stackAnchor.name = 'stackAnchor'
    this.leanGroup.add(this.stackAnchor)

    this.baseBobY = this.bobGroup.position.y
  }

  /**
   * Lightweight procedural motion: idle breathe, move bounce/tilt, stack lean.
   */
  update(_dt: number, state: PlayerCharacterAnimState): void {
    const { timeSec, speed, velX, itemsCarried, maxCarry } = state
    const moving = speed > 0.35
    const carryT = maxCarry > 0 ? itemsCarried / maxCarry : 0

    let bob =
      Math.sin(timeSec * 2.2) * 0.018 +
      (moving ? Math.sin(timeSec * 10.5) * 0.012 : 0)

    if (moving) {
      bob += Math.sin(timeSec * 7) * 0.008
    }

    this.bobGroup.position.y = this.baseBobY + bob

    const leanBack = carryT * -0.14
    const tiltFwd = moving ? 0.07 : 0
    this.leanGroup.rotation.x = leanBack + tiltFwd

    const maxS = 12
    const steer = Math.max(-1, Math.min(1, velX / maxS))
    const sway = moving ? Math.sin(timeSec * 11) * 0.028 : 0
    this.leanGroup.rotation.z = sway + steer * -0.11
  }
}
