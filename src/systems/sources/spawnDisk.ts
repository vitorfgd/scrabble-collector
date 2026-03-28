/** Uniform random point on a disk in XZ (for spawning around a source node). */
export function randomPointInDisk(
  cx: number,
  cz: number,
  radius: number,
): [number, number] {
  const t = Math.random() * Math.PI * 2
  const r = radius * Math.sqrt(Math.random())
  return [cx + Math.cos(t) * r, cz + Math.sin(t) * r]
}

/** Clamp a point to the disk boundary (for path spawns that step outside). */
export function projectPointToDisk(
  cx: number,
  cz: number,
  radius: number,
  x: number,
  z: number,
): [number, number] {
  const dx = x - cx
  const dz = z - cz
  const d2 = dx * dx + dz * dz
  const r2 = radius * radius
  if (d2 <= r2) return [x, z]
  const d = Math.sqrt(d2) || 1e-6
  const t = radius / d
  return [cx + dx * t, cz + dz * t]
}
