import {
  CircleGeometry,
  Color,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  AmbientLight,
  HemisphereLight,
  DirectionalLight,
} from 'three'
import type { Mesh as MeshType } from 'three'
import { DEFAULT_DEPOSIT_ZONE_RADIUS } from '../deposit/DepositZone.ts'
import { PlayerCharacterVisual } from '../player/PlayerCharacterVisual.ts'
import { createUpgradePad } from '../upgrades/UpgradePadVisual.ts'
import type { PadLabelPayload } from '../upgrades/UpgradePadVisual.ts'
import { createMansionGround } from './mansionEnvironment.ts'

export type SceneContents = {
  scene: Scene
  /** Mansion floor group (hall + four wings) */
  ground: Group
  /** Root for movement + rotation; character is a child */
  playerRoot: Group
  /** Stack anchor lives on the procedural character (back) */
  stackAnchor: Object3D
  /** World-space group for pickup meshes */
  pickupGroup: Group
  /** Ghost enemies (pressure / chase) */
  ghostGroup: Group
  /** Deposit zone root (visual + logical center) */
  depositRoot: Group
  depositZoneMesh: MeshType
  /** Wide underglow under deposit disc — reacts with zone feedback */
  depositUnderglowMesh: MeshType
  /** Optional rim (unused — single disc deposit for one clear zone read) */
  depositRingMesh: MeshType | null
  /** Procedural character (animation + stack anchor) */
  playerCharacter: PlayerCharacterVisual
  /** Hub-corner upgrade pads */
  upgradeAreaRoot: Group
  /** World upgrade pads */
  upgradePads: {
    capacity: {
      root: Group
      setLabel: (p: PadLabelPayload) => void
      setOccupancy: (t: number) => void
    }
    speed: {
      root: Group
      setLabel: (p: PadLabelPayload) => void
      setOccupancy: (t: number) => void
    }
    pulseFreq: {
      root: Group
      setLabel: (p: PadLabelPayload) => void
      setOccupancy: (t: number) => void
    }
    pulseDuration: {
      root: Group
      setLabel: (p: PadLabelPayload) => void
      setOccupancy: (t: number) => void
    }
  }
}

export function createScene(): SceneContents {
  const scene = new Scene()
  /** Match floor family so door gaps never read as a different hue. */
  scene.background = new Color(0x232638)
  scene.fog = new Fog(0x2a3242, 58, 118)

  /** Base fill so floors/walls never fall to black. */
  scene.add(new AmbientLight(0x8a9ab0, 0.38))

  scene.add(
    new HemisphereLight(0x9eb0c8, 0x343c4c, 0.52),
  )

  /** Primary moon key — cool, soft, readable shadows. */
  const moon = new DirectionalLight(0xd8e8f5, 0.95)
  moon.position.set(-8, 24, 12)
  moon.castShadow = true
  moon.shadow.mapSize.setScalar(1024)
  moon.shadow.camera.near = 0.5
  moon.shadow.camera.far = 72
  moon.shadow.camera.left = -36
  moon.shadow.camera.right = 36
  moon.shadow.camera.top = 36
  moon.shadow.camera.bottom = -36
  scene.add(moon)

  /** Rim / bounce — lifts north-facing reads on portrait top-down. */
  const fill = new DirectionalLight(0x6a7c90, 0.34)
  fill.position.set(14, 16, -16)
  scene.add(fill)

  /** Soft top-down fill: evens door gaps & wall bases without harsh pools. */
  const top = new DirectionalLight(0xa8b8c8, 0.22)
  top.position.set(0, 28, 2)
  scene.add(top)

  const ground = createMansionGround()
  scene.add(ground)

  const playerRoot = new Group()
  const character = new PlayerCharacterVisual()
  playerRoot.add(character.root)

  /** Start inside hub deposit / safe circle (radius from `DEFAULT_DEPOSIT_ZONE_RADIUS`). */
  playerRoot.position.set(0.35, 0, 0.55)
  scene.add(playerRoot)

  const pickupGroup = new Group()
  scene.add(pickupGroup)

  const ghostGroup = new Group()
  ghostGroup.name = 'ghosts'
  scene.add(ghostGroup)

  const depositRoot = new Group()
  depositRoot.position.set(0, 0, 0)
  scene.add(depositRoot)

  const depR = DEFAULT_DEPOSIT_ZONE_RADIUS

  const depositUnderglow = new Mesh(
    new CircleGeometry(depR * 2.35, 56),
    new MeshStandardMaterial({
      color: 0x1a1422,
      emissive: 0x3d2848,
      emissiveIntensity: 0.22,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  )
  depositUnderglow.name = 'depositUnderglow'
  depositUnderglow.rotation.x = -Math.PI / 2
  depositUnderglow.position.y = 0.018
  depositUnderglow.receiveShadow = true
  depositRoot.add(depositUnderglow)

  const depositZoneMesh = new Mesh(
    new CircleGeometry(depR, 56),
    new MeshStandardMaterial({
      color: 0x2a2230,
      emissive: 0x4a3058,
      emissiveIntensity: 0.2,
      roughness: 0.78,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94,
    }),
  )
  depositZoneMesh.name = 'depositZone'
  depositZoneMesh.rotation.x = -Math.PI / 2
  depositZoneMesh.position.y = 0.022
  depositZoneMesh.receiveShadow = true
  depositRoot.add(depositZoneMesh)

  const depositRingMesh: MeshType | null = null

  /** Four pads around hub center (between deposit and room walls). */
  const upgradeAreaRoot = new Group()
  upgradeAreaRoot.name = 'upgradeArea'
  const hc = 3.05

  const capacityPad = createUpgradePad('CAPACITY', 0x3a2c42, 0x8b7358)
  capacityPad.root.position.set(-hc, 0.02, hc)
  upgradeAreaRoot.add(capacityPad.root)

  const speedPad = createUpgradePad('SPEED', 0x342838, 0x9a8060)
  speedPad.root.position.set(hc, 0.02, hc)
  upgradeAreaRoot.add(speedPad.root)

  const pulseFreqPad = createUpgradePad('PULSE RATE', 0x382a44, 0x7a6488)
  pulseFreqPad.root.position.set(-hc, 0.02, -hc)
  upgradeAreaRoot.add(pulseFreqPad.root)

  const pulseDurationPad = createUpgradePad('PULSE TIME', 0x362632, 0xa07058)
  pulseDurationPad.root.position.set(hc, 0.02, -hc)
  upgradeAreaRoot.add(pulseDurationPad.root)

  scene.add(upgradeAreaRoot)

  return {
    scene,
    ground,
    playerRoot,
    stackAnchor: character.stackAnchor,
    pickupGroup,
    ghostGroup,
    depositRoot,
    depositZoneMesh,
    depositUnderglowMesh: depositUnderglow,
    depositRingMesh,
    playerCharacter: character,
    upgradeAreaRoot,
    upgradePads: {
      capacity: capacityPad,
      speed: speedPad,
      pulseFreq: pulseFreqPad,
      pulseDuration: pulseDurationPad,
    },
  }
}
