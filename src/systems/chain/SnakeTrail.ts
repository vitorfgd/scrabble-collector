import { Vector2 } from 'three'

/**
 * Path history for placing chain segments behind the player — same model as PacManScrabble
 * (version4): one head sample per frame, segment positions from distance along the polyline.
 *
 * Vector2 stores (world X, world Z) as (x, y) components.
 */
export class SnakeTrail {
  private readonly history: Vector2[] = []
  private readonly maxPoints: number
  readonly segmentSpacing: number

  constructor(segmentSpacing: number, maxPoints: number) {
    this.segmentSpacing = segmentSpacing
    this.maxPoints = maxPoints
  }

  reset(): void {
    this.history.length = 0
  }

  /** Call each frame with the player position on the ground plane (x, z). */
  pushHead(head: Vector2): void {
    this.history.push(head.clone())
    while (this.history.length > this.maxPoints) this.history.shift()
  }

  /**
   * Position for segment `index` (0 = first behind head). Uses arc length from head along
   * the recorded path: distance = (segmentIndex + 1) * segmentSpacing.
   */
  getSegmentPosition(segmentIndex: number, headFallback: Vector2): Vector2 {
    const dist = (segmentIndex + 1) * this.segmentSpacing
    if (this.history.length < 2) return headFallback.clone()
    return this.pointAtDistanceFromHead(dist)
  }

  /** Same as `getSegmentPosition` but writes into `out` (no per-call allocation). */
  getSegmentPositionInto(
    segmentIndex: number,
    headFallback: Vector2,
    out: Vector2,
  ): void {
    const dist = (segmentIndex + 1) * this.segmentSpacing
    if (this.history.length < 2) {
      out.copy(headFallback)
      return
    }
    let remaining = dist
    for (let i = this.history.length - 1; i > 0; i--) {
      const cur = this.history[i]
      const prev = this.history[i - 1]
      const segLen = cur.distanceTo(prev)
      if (remaining <= segLen) {
        const t = remaining / Math.max(segLen, 0.0001)
        out.copy(cur).lerp(prev, t)
        return
      }
      remaining -= segLen
    }
    out.copy(this.history[0])
  }

  private pointAtDistanceFromHead(dist: number): Vector2 {
    let remaining = dist
    for (let i = this.history.length - 1; i > 0; i--) {
      const cur = this.history[i]
      const prev = this.history[i - 1]
      const segLen = cur.distanceTo(prev)
      if (remaining <= segLen) {
        const t = remaining / Math.max(segLen, 0.0001)
        return cur.clone().lerp(prev, t)
      }
      remaining -= segLen
    }
    return this.history[0].clone()
  }
}
