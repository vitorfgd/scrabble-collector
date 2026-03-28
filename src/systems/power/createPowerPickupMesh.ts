import {
  Color,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three'

/** Glowing gold icosahedron — readable top-down */
export function createPowerPickupMesh(): Mesh {
  const geo = new IcosahedronGeometry(0.34, 0)
  const mat = new MeshStandardMaterial({
    color: new Color(0xffe066),
    emissive: new Color(0xffaa22),
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.25,
  })
  const mesh = new Mesh(geo, mat)
  mesh.position.y = 0.38
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
