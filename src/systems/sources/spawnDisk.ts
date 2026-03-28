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
