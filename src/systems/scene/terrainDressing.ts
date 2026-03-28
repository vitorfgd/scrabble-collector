import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'

/** Sparse dressing — sources carry gameplay; keep this light */
const ROCK_COUNT = 8
const BUSH_COUNT = 3
const PLANT_COUNT = 4

const AVOID: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: 0, z: 0, r: 4.5 },
  { x: -2.35, z: -17, r: 3.4 },
  { x: 2.35, z: -17, r: 3.4 },
]

function randomXZ(rng: () => number): [number, number] {
  return [
    (rng() * 2 - 1) * 17.5,
    (rng() * 2 - 1) * 17.5,
  ]
}

function okSpot(x: number, z: number): boolean {
  for (const c of AVOID) {
    if (Math.hypot(x - c.x, z - c.z) < c.r) return false
  }
  return true
}

/** Deterministic PRNG for stable layout across reloads */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Decorative rocks / bushes / grass clumps — no gameplay, shared geometry + instancing.
 */
export function createTerrainDressing(seed = 0x9e3779b9): Group {
  const root = new Group()
  root.name = 'terrainDressing'

  const rng = mulberry32(seed)
  const pos = new Vector3()
  const scale = new Vector3()
  const quat = new Quaternion()
  const euler = new Euler()
  const mat = new Matrix4()

  const rockGeo = new DodecahedronGeometry(1, 0)
  const rockMat = new MeshStandardMaterial({
    color: new Color(0x6b6f78),
    roughness: 0.92,
    metalness: 0.05,
  })
  const rocks = new InstancedMesh(rockGeo, rockMat, ROCK_COUNT)
  let ri = 0
  let guard = 0
  while (ri < ROCK_COUNT && guard < 600) {
    guard += 1
    const [x, z] = randomXZ(rng)
    if (!okSpot(x, z)) continue
    const s = 0.28 + rng() * 0.45
    const py = s * 0.42
    pos.set(x, py, z)
    euler.set(
      (rng() - 0.5) * 0.35,
      rng() * Math.PI * 2,
      (rng() - 0.5) * 0.25,
    )
    quat.setFromEuler(euler)
    scale.set(s * (0.85 + rng() * 0.35), s, s * (0.85 + rng() * 0.35))
    mat.compose(pos, quat, scale)
    rocks.setMatrixAt(ri, mat)
    ri += 1
  }
  for (; ri < ROCK_COUNT; ri++) {
    mat.identity()
    rocks.setMatrixAt(ri, mat)
  }
  rocks.instanceMatrix.needsUpdate = true
  rocks.castShadow = true
  rocks.receiveShadow = true
  root.add(rocks)

  const bushGeo = new IcosahedronGeometry(1, 0)
  const bushMat = new MeshStandardMaterial({
    color: new Color(0x2d6b3a),
    emissive: new Color(0x0a2210),
    emissiveIntensity: 0.08,
    roughness: 0.88,
    metalness: 0,
  })
  const bushes = new InstancedMesh(bushGeo, bushMat, BUSH_COUNT)
  let bi = 0
  guard = 0
  while (bi < BUSH_COUNT && guard < 400) {
    guard += 1
    const [x, z] = randomXZ(rng)
    if (!okSpot(x, z)) continue
    const s = 0.22 + rng() * 0.28
    pos.set(x, s * 0.35, z)
    euler.set(0, rng() * Math.PI * 2, 0)
    quat.setFromEuler(euler)
    scale.set(s, s * 0.65, s)
    mat.compose(pos, quat, scale)
    bushes.setMatrixAt(bi, mat)
    bi += 1
  }
  for (; bi < BUSH_COUNT; bi++) {
    mat.identity()
    bushes.setMatrixAt(bi, mat)
  }
  bushes.instanceMatrix.needsUpdate = true
  bushes.castShadow = true
  bushes.receiveShadow = true
  root.add(bushes)

  const stemGeo = new CylinderGeometry(0.06, 0.1, 0.35, 5, 1)
  const leafGeo = new ConeGeometry(0.22, 0.5, 6, 1)
  const plantStemMat = new MeshStandardMaterial({
    color: new Color(0x4a3728),
    roughness: 0.9,
    metalness: 0,
  })
  const plantLeafMat = new MeshStandardMaterial({
    color: new Color(0x3d8c4a),
    emissive: new Color(0x0d2812),
    emissiveIntensity: 0.06,
    roughness: 0.85,
    metalness: 0,
  })

  const stems = new InstancedMesh(stemGeo, plantStemMat, PLANT_COUNT)
  const leaves = new InstancedMesh(leafGeo, plantLeafMat, PLANT_COUNT)
  let pi = 0
  guard = 0
  while (pi < PLANT_COUNT && guard < 500) {
    guard += 1
    const [x, z] = randomXZ(rng)
    if (!okSpot(x, z)) continue
    const sy = 0.85 + rng() * 0.45
    pos.set(x, 0.18 * sy, z)
    euler.set(0, rng() * Math.PI * 2, 0)
    quat.setFromEuler(euler)
    scale.set(sy, sy, sy)
    mat.compose(pos, quat, scale)
    stems.setMatrixAt(pi, mat)

    pos.set(x, 0.42 * sy, z)
    euler.set((rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2)
    quat.setFromEuler(euler)
    scale.set(sy * 0.9, sy, sy * 0.9)
    mat.compose(pos, quat, scale)
    leaves.setMatrixAt(pi, mat)
    pi += 1
  }
  for (; pi < PLANT_COUNT; pi++) {
    mat.identity()
    stems.setMatrixAt(pi, mat)
    leaves.setMatrixAt(pi, mat)
  }
  stems.instanceMatrix.needsUpdate = true
  leaves.instanceMatrix.needsUpdate = true
  stems.castShadow = true
  leaves.castShadow = true
  root.add(stems, leaves)

  return root
}
