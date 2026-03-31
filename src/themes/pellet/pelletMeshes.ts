import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  type Object3D,
} from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import {
  cloneWispPickupFromGltf,
  getWispPickupPrototype,
  WISP_STACK_TARGET_MAX_DIM,
} from '../../systems/wisp/wispGltfAsset.ts'

const SOUL_BODY_R = 0.1
const SOUL_STACK_R = 0.06
const RELIC_STACK_R = 0.27

/** `hue` is Three.js HSL hue in the cyan–teal band (stored on `GameItem`). */
function soulColors(hue: number): {
  core: Color
  mid: Color
  emissive: Color
  outer: Color
} {
  const t = hue
  return {
    core: new Color().setHSL(t, 0.46, 0.74),
    mid: new Color().setHSL(t + 0.015, 0.58, 0.56),
    emissive: new Color().setHSL(t + 0.03, 0.52, 0.64),
    outer: new Color().setHSL(t - 0.025, 0.38, 0.54),
  }
}

/**
 * Small soul / wisp: bright core + soft mid + outer glow — distinct from ghosts.
 */
/** Larger gold relic — distinct from wisps. */
export function createRelicPickupMesh(hue: number): Group {
  const root = new Group()
  root.name = 'relicPickup'
  const core = new Color().setHSL(hue, 0.72, 0.52)
  const emissive = new Color().setHSL(hue + 0.02, 0.88, 0.48)

  const gem = new Mesh(
    new OctahedronGeometry(0.2, 0),
    new MeshStandardMaterial({
      color: core,
      emissive,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.35,
    }),
  )
  gem.position.y = 0.22
  gem.castShadow = true
  root.add(gem)

  const haloMat = new MeshStandardMaterial({
    color: new Color().setHSL(hue, 0.5, 0.62),
    emissive,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.45,
    roughness: 0.4,
    depthWrite: false,
  })
  const halo = new Mesh(new SphereGeometry(0.38, 16, 14), haloMat)
  halo.position.y = 0.22
  root.add(halo)

  root.userData.relicGem = gem
  root.userData.relicHalo = halo
  return root
}

export function createWispPickupMesh(hue: number): Group {
  if (getWispPickupPrototype()) {
    return cloneWispPickupFromGltf(hue)
  }
  const root = new Group()
  root.name = 'wispSoulPickup'
  const { core, mid, emissive, outer } = soulColors(hue)

  const coreMat = new MeshStandardMaterial({
    color: core,
    emissive,
    emissiveIntensity: 1.55,
    roughness: 0.16,
    metalness: 0.02,
  })
  const body = new Mesh(
    new SphereGeometry(SOUL_BODY_R * 0.72, 16, 14),
    coreMat,
  )
  body.castShadow = false
  body.receiveShadow = false
  body.position.y = SOUL_BODY_R
  root.add(body)

  const midMat = new MeshStandardMaterial({
    color: mid,
    emissive,
    emissiveIntensity: 0.88,
    transparent: true,
    opacity: 0.9,
    roughness: 0.22,
    depthWrite: false,
  })
  const midSphere = new Mesh(
    new SphereGeometry(SOUL_BODY_R * 1.15, 18, 16),
    midMat,
  )
  midSphere.position.y = SOUL_BODY_R
  root.add(midSphere)

  const haloMat = new MeshStandardMaterial({
    color: outer,
    emissive: new Color().copy(emissive).multiplyScalar(0.9),
    emissiveIntensity: 0.52,
    transparent: true,
    opacity: 0.36,
    roughness: 0.48,
    depthWrite: false,
  })
  const halo = new Mesh(
    new SphereGeometry(SOUL_BODY_R * 2.05, 14, 12),
    haloMat,
  )
  halo.position.y = SOUL_BODY_R
  root.add(halo)

  root.userData.wispBody = body
  root.userData.wispMid = midSphere
  root.userData.wispHalo = halo
  return root
}

function createWispStackMesh(hue: number): Object3D {
  if (getWispPickupPrototype()) {
    return cloneWispPickupFromGltf(hue, {
      targetMaxDim: WISP_STACK_TARGET_MAX_DIM,
    })
  }
  const { core, emissive } = soulColors(hue)
  const mat = new MeshStandardMaterial({
    color: core,
    emissive,
    emissiveIntensity: 1.05,
    roughness: 0.2,
    metalness: 0.03,
  })
  const mesh = new Mesh(
    new SphereGeometry(SOUL_STACK_R, 16, 14),
    mat,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = SOUL_STACK_R
  return mesh
}

function createRelicStackMesh(hue: number): Mesh {
  const core = new Color().setHSL(hue, 0.7, 0.5)
  const emissive = new Color().setHSL(hue + 0.02, 0.85, 0.45)
  const mat = new MeshStandardMaterial({
    color: core,
    emissive,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.32,
  })
  const mesh = new Mesh(new OctahedronGeometry(RELIC_STACK_R, 0), mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = RELIC_STACK_R
  return mesh
}

export function createPelletStackMesh(item: GameItem): Object3D {
  if (item.type === 'relic') {
    return createRelicStackMesh(item.hue)
  }
  return createWispStackMesh(item.hue)
}
