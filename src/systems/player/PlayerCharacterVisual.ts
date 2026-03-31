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
  /** Ghost pulse (auto timed) — strong shirt / skin glow */
  powerMode?: boolean
  /** Ghost hit i-frames — blink read */
  ghostInvuln?: boolean
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
  private readonly shirtMat: MeshStandardMaterial
  private readonly shirtColorSnap: Color
  private readonly skinMat: MeshStandardMaterial
  private readonly skinColorSnap: Color

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
      color: new Color(0xff8a5c),
      emissive: new Color(0x000000),
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.08,
    })
    this.skinMat = skin
    this.skinColorSnap = skin.color.clone()
    const shirt = new MeshStandardMaterial({
      color: new Color(0x4cb0e0),
      emissive: new Color(0x1a4060),
      emissiveIntensity: 0.12,
      roughness: 0.5,
      metalness: 0.05,
    })
    this.shirtMat = shirt
    this.shirtColorSnap = shirt.color.clone()
    const dark = new MeshStandardMaterial({
      color: new Color(0x3a3c48),
      roughness: 0.68,
      metalness: 0.08,
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
    const power = state.powerMode === true
    const invuln = state.ghostInvuln === true

    if (invuln) {
      const blink = 0.5 + 0.5 * Math.sin(timeSec * 14)
      const on = blink > 0.52
      this.shirtMat.color
        .copy(this.shirtColorSnap)
        .lerp(new Color(0xffffff), on ? 0.38 : 0.06)
      this.shirtMat.emissive.setHex(on ? 0xccddee : 0x223344)
      this.shirtMat.emissiveIntensity = on ? 0.42 : 0.08
      this.skinMat.color.copy(this.skinColorSnap)
      this.skinMat.emissive.setHex(0x000000)
      this.skinMat.emissiveIntensity = 0
    } else if (power) {
      this.shirtMat.color.copy(this.shirtColorSnap).lerp(new Color(0xffd080), 0.58)
      this.shirtMat.emissive.setHex(0xc9a020)
      this.shirtMat.emissiveIntensity = 0.62
      this.skinMat.color.copy(this.skinColorSnap).lerp(new Color(0xffe8c8), 0.4)
      this.skinMat.emissive.setHex(0x8a6010)
      this.skinMat.emissiveIntensity = 0.26
    } else {
      this.shirtMat.color.copy(this.shirtColorSnap)
      this.shirtMat.emissive.setHex(0x1a4060)
      this.shirtMat.emissiveIntensity = 0.12
      this.skinMat.color.copy(this.skinColorSnap)
      this.skinMat.emissive.setHex(0x000000)
      this.skinMat.emissiveIntensity = 0
    }
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
