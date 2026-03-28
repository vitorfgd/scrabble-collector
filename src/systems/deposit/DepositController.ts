import { Vector3 } from 'three'
import type { Group } from 'three'
import type { Scene } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import {
  evaluateDeposit,
  type DepositEval,
} from '../economy/wordEvaluation.ts'
import type { Economy } from '../economy/Economy.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import type { CarryStack } from '../stack/CarryStack.ts'
import type { StackVisual } from '../stack/StackVisual.ts'
import { DEFAULT_DEPOSIT_ZONE_RADIUS } from './DepositZone.ts'
import {
  DEPOSIT_FLIGHT_DURATION_SEC,
  type DepositFlightAnimator,
} from './DepositFlightAnimator.ts'

const p = new Vector3()
const center = new Vector3()

export type DepositControllerOptions = {
  depositRoot: Group
  scene: Scene
  zoneRadius?: number
  player: PlayerController
  stack: CarryStack
  stackVisual: StackVisual
  economy: Economy
  flight: DepositFlightAnimator
  /** After the last mesh lands (deposit zone pulse + HUD should run here) */
  onDepositPresentationComplete: (items: GameItem[], ev: DepositEval) => void
}

/**
 * Edge-triggered deposit: peel top-first; payout applies only to items whose flight
 * finished. Leaving mid-unload pays for completed flights and returns the rest.
 */
export class DepositController {
  private readonly depositRoot: Group
  private readonly scene: Scene
  private readonly zoneRadius: number
  private readonly player: PlayerController
  private readonly stack: CarryStack
  private readonly stackVisual: StackVisual
  private readonly economy: Economy
  private readonly flight: DepositFlightAnimator
  private readonly onDepositPresentationComplete: DepositControllerOptions['onDepositPresentationComplete']

  private wasInside = false
  /** Immutable copy from edge entry; defines word order (bottom → top) for evaluation */
  private sessionSnapshot: GameItem[] | null = null
  /** Items whose flight reached the deposit (mesh disposed); in-flight not included */
  private readonly depositedIds = new Set<string>()

  constructor(opts: DepositControllerOptions) {
    this.depositRoot = opts.depositRoot
    this.scene = opts.scene
    this.zoneRadius = opts.zoneRadius ?? DEFAULT_DEPOSIT_ZONE_RADIUS
    this.player = opts.player
    this.stack = opts.stack
    this.stackVisual = opts.stackVisual
    this.economy = opts.economy
    this.flight = opts.flight
    this.onDepositPresentationComplete = opts.onDepositPresentationComplete
  }

  update(dt: number): void {
    this.depositRoot.getWorldPosition(center)
    this.player.getPosition(p)
    const dx = p.x - center.x
    const dz = p.z - center.z
    const inside = dx * dx + dz * dz <= this.zoneRadius * this.zoneRadius

    if (this.sessionSnapshot !== null && !inside) {
      this.abortDepositSession()
    }

    this.flight.update(dt)
    if (this.flight.busy) {
      this.wasInside = inside
      return
    }

    if (
      inside &&
      !this.wasInside &&
      this.stack.count > 0 &&
      this.sessionSnapshot === null
    ) {
      const snapshot = [...this.stack.getSnapshot()]
      this.sessionSnapshot = snapshot
      this.depositedIds.clear()
      this.tryPeelNext()
    }

    this.wasInside = inside
  }

  private tryPeelNext(): void {
    if (this.sessionSnapshot === null) return
    if (this.flight.busy) return

    if (this.stack.count === 0) {
      const snapshot = this.sessionSnapshot
      this.sessionSnapshot = null
      this.depositedIds.clear()
      const ev = evaluateDeposit(snapshot)
      this.economy.addMoney(ev.credits)
      this.onDepositPresentationComplete(snapshot, ev)
      return
    }

    const item = this.stack.popFromTop({ silent: true })
    if (!item) {
      this.sessionSnapshot = null
      this.depositedIds.clear()
      return
    }
    const mesh = this.stackVisual.extractTopMeshForDeposit(item)
    this.stack.notifyChange()
    this.depositRoot.getWorldPosition(center)
    const onFlightDone = (): void => {
      this.depositedIds.add(item.id)
      this.tryPeelNext()
    }
    this.flight.startOne(
      this.scene,
      mesh,
      center,
      onFlightDone,
      DEPOSIT_FLIGHT_DURATION_SEC,
    )
  }

  /** Leaving mid-unload: pay for landed items only; return gems not yet deposited. */
  private abortDepositSession(): void {
    if (this.sessionSnapshot === null) return

    this.flight.cancel()

    const snapshot = this.sessionSnapshot
    this.sessionSnapshot = null

    const completed = snapshot.filter((it) => this.depositedIds.has(it.id))
    const remaining = snapshot.filter((it) => !this.depositedIds.has(it.id))

    const ev = evaluateDeposit(completed)
    this.economy.addMoney(ev.credits)
    this.stack.replaceItems(remaining)
    this.depositedIds.clear()
  }
}
