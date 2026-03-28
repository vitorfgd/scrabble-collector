import { POWER_MODE_DURATION_SEC } from './powerModeConfig.ts'

/** Tracks remaining power time; collecting again refreshes full duration */
export class PowerModeState {
  private remainingSec = 0

  /** (Re)start or extend powered time to full duration */
  activate(durationSec: number = POWER_MODE_DURATION_SEC): void {
    this.remainingSec = durationSec
  }

  update(dt: number): void {
    this.remainingSec = Math.max(0, this.remainingSec - dt)
  }

  get isActive(): boolean {
    return this.remainingSec > 0
  }

  /** 0..1 for optional HUD */
  get fractionRemaining(): number {
    return this.remainingSec <= 0
      ? 0
      : Math.min(1, this.remainingSec / POWER_MODE_DURATION_SEC)
  }
}
