import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  Scene,
  HemisphereLight,
  DirectionalLight,
} from 'three'
import type { Mesh as MeshType } from 'three'
import { DEFAULT_DEPOSIT_ZONE_RADIUS } from '../deposit/DepositZone.ts'
import { PlayerCharacterVisual } from '../player/PlayerCharacterVisual.ts'

export type SceneContents = {
  scene: Scene
  ground: MeshType
  /** Root for movement + rotation; character is a child */
  playerRoot: Group
  /** Stack anchor lives on the procedural character (back) */
  stackAnchor: Object3D
  /** World-space group for pickup meshes */
  pickupGroup: Group
  /** Deposit zone root (visual + logical center) */
  depositRoot: Group
  depositZoneMesh: MeshType
  /** Gold ring outlining the deposit circle */
  depositRingMesh: MeshType
  /** Procedural character (animation + stack anchor) */
  playerCharacter: PlayerCharacterVisual
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

  const ground = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({
      color: 0x3d8c6a,
      roughness: 0.95,
      metalness: 0,
    }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const playerRoot = new Group()
  const character = new PlayerCharacterVisual()
  playerRoot.add(character.root)

  playerRoot.position.set(0, 0, 0)
  scene.add(playerRoot)

  const pickupGroup = new Group()
  scene.add(pickupGroup)

  const depositRoot = new Group()
  depositRoot.position.set(7, 0, 0)
  scene.add(depositRoot)

  const depositZoneMesh = new Mesh(
    new PlaneGeometry(4, 4),
    new MeshStandardMaterial({
      color: 0xf4d35e,
      emissive: 0xaa8800,
      emissiveIntensity: 0.25,
      roughness: 0.8,
      metalness: 0,
      transparent: true,
      opacity: 0.85,
    }),
  )
  depositZoneMesh.rotation.x = -Math.PI / 2
  depositZoneMesh.position.y = 0.02
  depositZoneMesh.receiveShadow = true
  depositRoot.add(depositZoneMesh)

  const ringOuter = DEFAULT_DEPOSIT_ZONE_RADIUS + 0.12
  const ringInner = Math.max(0.1, DEFAULT_DEPOSIT_ZONE_RADIUS - 0.35)
  const depositRingMesh = new Mesh(
    new RingGeometry(ringInner, ringOuter, 48),
    new MeshStandardMaterial({
      color: 0xf5d35c,
      emissive: 0xcc8800,
      emissiveIntensity: 0.12,
      roughness: 0.65,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
      side: DoubleSide,
    }),
  )
  depositRingMesh.name = 'depositRing'
  depositRingMesh.rotation.x = -Math.PI / 2
  depositRingMesh.position.y = 0.028
  depositRingMesh.receiveShadow = true
  depositRoot.add(depositRingMesh)

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
  }
}
