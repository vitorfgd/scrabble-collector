/**
 * Floating virtual joystick: first pointer on the surface sets the center;
 * drag defines direction; release stops. Pointer Events (touch + mouse).
 */
export type JoystickVector = { x: number; y: number; active: boolean }

export type TouchJoystickOptions = {
  /** Max stick deflection in CSS pixels (scales output to ~[-1, 1]) */
  maxRadiusPx?: number
}

export class TouchJoystick {
  private readonly host: HTMLElement
  private readonly maxRadiusPx: number
  private readonly feedback: HTMLDivElement
  private readonly ring: HTMLDivElement
  private readonly knob: HTMLDivElement

  private pointerId: number | null = null
  /** Center relative to host top-left */
  private originX = 0
  private originY = 0

  private vector: JoystickVector = { x: 0, y: 0, active: false }

  constructor(host: HTMLElement, options: TouchJoystickOptions = {}) {
    this.host = host
    this.maxRadiusPx = options.maxRadiusPx ?? 56

    this.feedback = document.createElement('div')
    this.ring = document.createElement('div')
    this.knob = document.createElement('div')
    this.feedback.className = 'vj-feedback'
    this.ring.className = 'vj-ring'
    this.knob.className = 'vj-knob'
    this.feedback.appendChild(this.ring)
    this.feedback.appendChild(this.knob)
    this.host.appendChild(this.feedback)
    this.hideFeedback()

    this.host.addEventListener('pointerdown', this.onDown)
    this.host.addEventListener('pointermove', this.onMove)
    this.host.addEventListener('pointerup', this.onUp)
    this.host.addEventListener('pointercancel', this.onUp)
  }

  /** y is screen-down positive; map to world XZ in PlayerController */
  getVector(): JoystickVector {
    return this.vector
  }

  dispose(): void {
    this.host.removeEventListener('pointerdown', this.onDown)
    this.host.removeEventListener('pointermove', this.onMove)
    this.host.removeEventListener('pointerup', this.onUp)
    this.host.removeEventListener('pointercancel', this.onUp)
    this.feedback.remove()
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return
    if (e.button !== 0 && e.pointerType === 'mouse') return

    this.pointerId = e.pointerId
    this.host.setPointerCapture(e.pointerId)

    const r = this.host.getBoundingClientRect()
    this.originX = e.clientX - r.left
    this.originY = e.clientY - r.top

    this.placeFeedback(this.originX, this.originY)
    this.updateFromClient(e.clientX, e.clientY, r)
  }

  private readonly onMove = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return
    const r = this.host.getBoundingClientRect()
    this.updateFromClient(e.clientX, e.clientY, r)
  }

  private readonly onUp = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return
    this.endGesture(e.pointerId)
  }

  private endGesture(pointerId: number): void {
    if (this.pointerId === null) return
    try {
      this.host.releasePointerCapture(pointerId)
    } catch {
      /* already released */
    }
    this.pointerId = null
    this.vector = { x: 0, y: 0, active: false }
    this.hideFeedback()
  }

  private updateFromClient(clientX: number, clientY: number, hostRect: DOMRect): void {
    const mx = clientX - hostRect.left
    const my = clientY - hostRect.top
    const dx = mx - this.originX
    const dy = my - this.originY
    const len = Math.hypot(dx, dy) || 1
    const clamped = Math.min(len, this.maxRadiusPx)
    const kx = (dx / len) * clamped
    const ky = (dy / len) * clamped

    this.knob.style.left = `${this.originX + kx}px`
    this.knob.style.top = `${this.originY + ky}px`

    const nx = kx / this.maxRadiusPx
    const ny = ky / this.maxRadiusPx
    this.vector = { x: nx, y: ny, active: true }
  }

  private placeFeedback(cx: number, cy: number): void {
    const half = this.maxRadiusPx
    this.ring.style.left = `${cx}px`
    this.ring.style.top = `${cy}px`
    this.ring.style.width = `${half * 2}px`
    this.ring.style.height = `${half * 2}px`
    this.ring.style.marginLeft = `${-half}px`
    this.ring.style.marginTop = `${-half}px`

    this.knob.style.left = `${cx}px`
    this.knob.style.top = `${cy}px`

    this.feedback.style.display = 'block'
  }

  private hideFeedback(): void {
    this.feedback.style.display = 'none'
  }
}
