import type { PerspectiveCamera } from 'three'
import type { WebGLRenderer } from 'three'
import { CameraRig } from '../systems/camera/CameraRig.ts'
import { CollectionSystem } from '../systems/collection/CollectionSystem.ts'
import { DepositSystem } from '../systems/deposit/DepositSystem.ts'
import { DepositZoneFeedback } from '../systems/deposit/DepositZoneFeedback.ts'
import { Economy } from '../systems/economy/Economy.ts'
import { TouchJoystick } from '../systems/input/TouchJoystick.ts'
import { ItemWorld } from '../systems/items/ItemWorld.ts'
import {
  DEFAULT_PICKUP_SPAWN_AREA,
} from '../systems/items/ItemSpawnArea.ts'
import { spawnPickupsInArea } from '../systems/items/WorldItemSpawner.ts'
import type { PlayerCharacterVisual } from '../systems/player/PlayerCharacterVisual.ts'
import { PlayerController } from '../systems/player/PlayerController.ts'
import { createCamera } from '../systems/scene/createCamera.ts'
import { createRenderer } from '../systems/scene/createRenderer.ts'
import { createScene } from '../systems/scene/SceneSetup.ts'
import { subscribeViewportResize } from '../systems/scene/resize.ts'
import { CarryStack } from '../systems/stack/CarryStack.ts'
import { StackVisual } from '../systems/stack/StackVisual.ts'
import { createCrystalItem } from '../themes/crystalQuarry/itemFactory.ts'

const INITIAL_CRYSTAL_COUNT = 18
const STACK_CAPACITY = 10

const DEPOSIT_TOAST_MS = 1400

export class Game {
  private readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly unsubscribeResize: () => void
  private readonly joystick: TouchJoystick
  private readonly player: PlayerController
  private readonly cameraRig: CameraRig
  private readonly stack: CarryStack
  private readonly stackVisual: StackVisual
  private readonly itemWorld: ItemWorld
  private readonly collection: CollectionSystem
  private readonly deposit: DepositSystem
  private readonly economy: Economy
  private readonly depositFeedback: DepositZoneFeedback
  private readonly playerCharacter: PlayerCharacterVisual
  private depositToastTimer: ReturnType<typeof setTimeout> | null = null
  private raf = 0
  private lastTime = performance.now()
  private elapsedSec = 0

  constructor(host: HTMLElement) {
    const {
      scene,
      playerRoot,
      stackAnchor,
      pickupGroup,
      depositRoot,
      depositZoneMesh,
      depositRingMesh,
      playerCharacter,
    } = createScene()

    const hudMoney = host.querySelector<HTMLElement>('#hud-money')
    const hudCarry = host.querySelector<HTMLElement>('#hud-carry')
    const hudDepositToast = host.querySelector<HTMLElement>(
      '#hud-deposit-toast',
    )

    this.camera = createCamera(
      host.clientWidth / Math.max(host.clientHeight, 1),
    )
    this.renderer = createRenderer(host)
    this.unsubscribeResize = subscribeViewportResize(
      this.camera,
      this.renderer,
      host,
    )

    this.joystick = new TouchJoystick(host)
    this.player = new PlayerController(playerRoot)
    this.playerCharacter = playerCharacter
    this.cameraRig = new CameraRig(this.camera, playerRoot)

    this.stackVisual = new StackVisual(stackAnchor)
    this.stack = new CarryStack(STACK_CAPACITY, () => {
      this.stackVisual.sync(this.stack.getSnapshot())
      if (hudCarry) {
        hudCarry.textContent = `${this.stack.count} / ${this.stack.maxCapacity}`
      }
    })
    if (hudCarry) {
      hudCarry.textContent = `0 / ${STACK_CAPACITY}`
    }

    this.itemWorld = new ItemWorld(pickupGroup, scene)
    spawnPickupsInArea(
      this.itemWorld,
      () =>
        createCrystalItem(
          Math.random(),
          4 + Math.floor(Math.random() * 12),
        ),
      INITIAL_CRYSTAL_COUNT,
      DEFAULT_PICKUP_SPAWN_AREA,
    )

    this.collection = new CollectionSystem()

    this.depositFeedback = new DepositZoneFeedback(
      depositZoneMesh,
      depositRingMesh,
    )

    this.deposit = new DepositSystem(depositRoot, {
      onDeposited: (_items, credits) => {
        this.depositFeedback.trigger()
        if (hudMoney) {
          hudMoney.classList.remove('money-bump')
          void hudMoney.offsetWidth
          hudMoney.classList.add('money-bump')
        }
        if (hudDepositToast && credits > 0) {
          if (this.depositToastTimer) clearTimeout(this.depositToastTimer)
          hudDepositToast.textContent = `+$${credits}`
          hudDepositToast.classList.remove('hidden')
          hudDepositToast.classList.add('visible')
          this.depositToastTimer = setTimeout(() => {
            hudDepositToast.classList.remove('visible')
            hudDepositToast.classList.add('hidden')
            this.depositToastTimer = null
          }, DEPOSIT_TOAST_MS)
        }
      },
    })

    this.economy = new Economy(undefined, (money) => {
      if (hudMoney) hudMoney.textContent = `$${money}`
    })
    if (hudMoney) hudMoney.textContent = `$${this.economy.money}`

    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - this.lastTime) / 1000)
      this.lastTime = now
      this.elapsedSec += dt

      const j = this.joystick.getVector()
      this.player.update(dt, j)
      this.playerCharacter.update(dt, {
        timeSec: this.elapsedSec,
        speed: this.player.getHorizontalSpeed(),
        itemsCarried: this.stack.count,
        maxCarry: STACK_CAPACITY,
      })
      this.cameraRig.update(dt)
      this.itemWorld.updateVisuals(this.elapsedSec, dt)
      this.collection.update(this.player, this.stack, this.itemWorld)
      this.itemWorld.updateCollectEffects(dt)
      this.stackVisual.update(dt)
      this.deposit.update(this.player, this.stack, this.economy)
      this.depositFeedback.update(dt)

      this.renderer.render(scene, this.camera)
    }

    this.raf = requestAnimationFrame(tick)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    if (this.depositToastTimer) clearTimeout(this.depositToastTimer)
    this.joystick.dispose()
    this.unsubscribeResize()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
