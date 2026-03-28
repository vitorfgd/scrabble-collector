import {
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  HemisphereLight,
  DirectionalLight,
} from 'three'
import type { Mesh as MeshType } from 'three'
import { DEFAULT_DEPOSIT_ZONE_RADIUS } from '../deposit/DepositZone.ts'
import { PlayerCharacterVisual } from '../player/PlayerCharacterVisual.ts'
import { createLetterZoneBoundaryDebug } from '../letterZones/letterZoneDebug.ts'
import { createTerrainDressing } from './terrainDressing.ts'
import { createUpgradePad } from '../upgrades/UpgradePadVisual.ts'
import type { PadLabelPayload } from '../upgrades/UpgradePadVisual.ts'

export type SceneContents = {
  scene: Scene
  /** Two tinted halves: vowels (left), consonants (right) */
  ground: Group
  /** Root for movement + rotation; character is a child */
  playerRoot: Group
  /** Stack anchor lives on the procedural character (back) */
  stackAnchor: Object3D
  /** World-space group for pickup meshes */
  pickupGroup: Group
  /** Deposit zone root (visual + logical center) */
  depositRoot: Group
  depositZoneMesh: MeshType
  /** Optional rim (unused — single disc deposit for one clear zone read) */
  depositRingMesh: MeshType | null
  /** Procedural character (animation + stack anchor) */
  playerCharacter: PlayerCharacterVisual
  /** Dedicated upgrade plaza (pads + subtle floor) — kept outside resource spawn disks */
  upgradeAreaRoot: Group
  /** World upgrade pads (capacity + speed) */
  upgradePads: {
    capacity: { root: Group; setLabel: (p: PadLabelPayload) => void }
    speed: { root: Group; setLabel: (p: PadLabelPayload) => void }
  }
  /** Toggle visibility for optional letter-zone boundary debug */
  letterZoneDebugRoot: Group
}

export function createScene(): SceneContents {
  const scene = new Scene()
  scene.background = new Color(0x87b8ff)

  scene.add(new HemisphereLight(0xffffff, 0x223344, 0.55))

  const sun = new DirectionalLight(0xffffff, 1.1)
  sun.position.set(8, 18, 6)
  sun.castShadow = true
  sun.shadow.mapSize.setScalar(2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 60
  sun.shadow.camera.left = -20
  sun.shadow.camera.right = 20
  sun.shadow.camera.top = 20
  sun.shadow.camera.bottom = -20
  scene.add(sun)

  const ground = new Group()
  ground.name = 'ground'
  const halfW = 20
  const halfD = 40
  const vowelGround = new Mesh(
    new PlaneGeometry(halfW, halfD),
    new MeshStandardMaterial({
      color: 0xc9a66b,
      emissive: 0x6b4420,
      emissiveIntensity: 0.1,
      roughness: 0.94,
      metalness: 0,
    }),
  )
  vowelGround.rotation.x = -Math.PI / 2
  vowelGround.position.set(-halfW * 0.5, 0, 0)
  vowelGround.receiveShadow = true
  ground.add(vowelGround)

  const consonantGround = new Mesh(
    new PlaneGeometry(halfW, halfD),
    new MeshStandardMaterial({
      color: 0x2f6f5c,
      emissive: 0x0d3d32,
      emissiveIntensity: 0.12,
      roughness: 0.94,
      metalness: 0,
    }),
  )
  consonantGround.rotation.x = -Math.PI / 2
  consonantGround.position.set(halfW * 0.5, 0, 0)
  consonantGround.receiveShadow = true
  ground.add(consonantGround)

  const seam = new Mesh(
    new PlaneGeometry(0.35, halfD),
    new MeshStandardMaterial({
      color: 0xfff8e8,
      emissive: 0xffe8c8,
      emissiveIntensity: 0.45,
      roughness: 0.55,
      metalness: 0,
      transparent: true,
      opacity: 0.88,
    }),
  )
  seam.rotation.x = -Math.PI / 2
  seam.position.set(0, 0.024, 0)
  seam.receiveShadow = true
  ground.add(seam)

  scene.add(ground)

  scene.add(createTerrainDressing())

  const letterZoneDebugRoot = createLetterZoneBoundaryDebug()
  scene.add(letterZoneDebugRoot)

  const playerRoot = new Group()
  const character = new PlayerCharacterVisual()
  playerRoot.add(character.root)

  /** Off-center so spawn is not inside the deposit circle at map center */
  playerRoot.position.set(0, 0, 4.25)
  scene.add(playerRoot)

  const pickupGroup = new Group()
  scene.add(pickupGroup)

  const depositRoot = new Group()
  depositRoot.position.set(0, 0, 0)
  scene.add(depositRoot)

  const depR = DEFAULT_DEPOSIT_ZONE_RADIUS
  const depositZoneMesh = new Mesh(
    new CircleGeometry(depR, 56),
    new MeshStandardMaterial({
      color: 0xffd060,
      emissive: 0xb87810,
      emissiveIntensity: 0.28,
      roughness: 0.72,
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

  /** South edge: clear of sources and central deposit (0,0) */
  const upgradePlazaZ = -17
  const upgradeAreaRoot = new Group()
  upgradeAreaRoot.name = 'upgradeArea'

  const plazaFloor = new Mesh(
    new PlaneGeometry(9.5, 4.2),
    new MeshStandardMaterial({
      color: 0x2e2848,
      emissive: 0x1a1530,
      emissiveIntensity: 0.12,
      roughness: 0.94,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94,
    }),
  )
  plazaFloor.rotation.x = -Math.PI / 2
  plazaFloor.position.set(0, 0.012, upgradePlazaZ)
  plazaFloor.receiveShadow = true
  upgradeAreaRoot.add(plazaFloor)

  const capacityPad = createUpgradePad('CAPACITY', 0x6d28d9, 0xc4b5fd)
  capacityPad.root.position.set(-2.35, 0, upgradePlazaZ)
  upgradeAreaRoot.add(capacityPad.root)

  const speedPad = createUpgradePad('SPEED', 0x0891b2, 0x67e8f9)
  speedPad.root.position.set(2.35, 0, upgradePlazaZ)
  upgradeAreaRoot.add(speedPad.root)

  scene.add(upgradeAreaRoot)

  return {
    scene,
    ground,
    playerRoot,
    stackAnchor: character.stackAnchor,
    pickupGroup,
    depositRoot,
    depositZoneMesh,
    depositRingMesh,
    playerCharacter: character,
    upgradeAreaRoot,
    upgradePads: {
      capacity: capacityPad,
      speed: speedPad,
    },
    letterZoneDebugRoot,
  }
}
