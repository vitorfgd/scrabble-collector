import type { PerspectiveCamera } from 'three'
import type { Scene } from 'three'
import type { WebGLRenderer } from 'three'
import { Group, Vector3 } from 'three'
import { CameraRig } from '../systems/camera/CameraRig.ts'
import { CollectionSystem } from '../systems/collection/CollectionSystem.ts'
import {
  DepositController,
  type DepositPresentationOverload,
} from '../systems/deposit/DepositController.ts'
import { DepositFlightAnimator } from '../systems/deposit/DepositFlightAnimator.ts'
import { DepositZoneFeedback } from '../systems/deposit/DepositZoneFeedback.ts'
import { Economy } from '../systems/economy/Economy.ts'
import {
  previewCarryPayout,
  type DepositEval,
} from '../systems/economy/wordEvaluation.ts'
import { TouchJoystick } from '../systems/input/TouchJoystick.ts'
import { ItemWorld } from '../systems/items/ItemWorld.ts'
import { ResourceSourceSystem } from '../systems/sources/ResourceSourceSystem.ts'
import type { PlayerCharacterVisual } from '../systems/player/PlayerCharacterVisual.ts'
import { PlayerController } from '../systems/player/PlayerController.ts'
import { createCamera } from '../systems/scene/createCamera.ts'
import { createRenderer } from '../systems/scene/createRenderer.ts'
import { createScene } from '../systems/scene/SceneSetup.ts'
import { subscribeViewportResize } from '../systems/scene/resize.ts'
import { CarryStack } from '../systems/stack/CarryStack.ts'
import { StackVisual } from '../systems/stack/StackVisual.ts'
import { createCrystalItem } from '../themes/crystalQuarry/itemFactory.ts'
import {
  createConsonantLetterItem,
  createVowelLetterItem,
} from '../themes/letterTile/itemFactory.ts'
import type { GameItem } from './types/GameItem.ts'
import type { ItemSpawnMode } from '../systems/items/spawnMode.ts'
import { UpgradeZoneSystem } from '../systems/upgrades/UpgradeZoneSystem.ts'
import { INITIAL_STACK_CAPACITY } from '../systems/upgrades/upgradeConfig.ts'
import { spawnUpgradeSpendCoins } from '../systems/upgrades/upgradeSpendVfx.ts'
import {
  GHOST_EAT_MONEY_REWARD,
  GHOST_HIT_INVULN_SEC,
  GHOST_HIT_LOSS_MAX,
  GHOST_HIT_LOSS_MIN,
} from '../systems/ghost/ghostConfig.ts'
import { disposeGhostSharedGeometry } from '../systems/ghost/createGhostVisual.ts'
import { GhostSystem } from '../systems/ghost/GhostSystem.ts'
import { ChaseWordSystem } from '../systems/chaseWord/ChaseWordSystem.ts'
import {
  DEFAULT_RESOURCE_SOURCES,
  getSpawnNearPrimarySource,
} from '../systems/sources/defaultSources.ts'
import {
  BOOTSTRAP_HINT_MS,
  IDLE_HINT_AFTER_SEC,
  IDLE_SPEED_MAX,
} from '../juice/juiceConfig.ts'
import { OVERLOAD_STACK_THRESHOLD } from '../systems/overload/overloadDropConfig.ts'
import { MoneyHud } from '../juice/MoneyHud.ts'
import { spawnFloatingHudText } from '../juice/floatingHud.ts'
import { playJuiceSound } from '../juice/juiceSound.ts'
import {
  disposeAllGhostHitBursts,
  spawnGhostHitPelletBurst,
  updateGhostHitBursts,
  type GhostHitBurstParticle,
} from '../juice/ghostHitPelletBurst.ts'
import { PowerPelletSpawner } from '../systems/powerPellet/PowerPelletSpawner.ts'
import {
  POWER_MODE_DURATION_SEC,
  POWER_MODE_SPEED_MULTIPLIER,
} from '../systems/powerPellet/powerPelletConfig.ts'

const DEPOSIT_TOAST_MS = 2800
const CHASE_TOAST_MS = 3200

function readSpawnModeFromQuery(): ItemSpawnMode {
  const q = new URLSearchParams(window.location.search).get('spawn')
  if (q === 'letter' || q === 'letters') return 'letter'
  if (q === 'crystal' || q === 'crystals') return 'crystal'
  return 'letter'
}

/** Optional: show letter zone split line + map frame (`?zones=1` or `?debug=zones`) */
function readLetterZoneDebugFromQuery(): boolean {
  const q = new URLSearchParams(window.location.search)
  if (q.get('zones') === '1') return true
  const d = q.get('debug')
  if (d === 'zones') return true
  return false
}

export class Game {
  private readonly scene: Scene
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
  private readonly depositController: DepositController
  private readonly depositFlight: DepositFlightAnimator
  private readonly economy: Economy
  private readonly depositFeedback: DepositZoneFeedback
  private readonly playerCharacter: PlayerCharacterVisual
  private readonly upgradeZones: UpgradeZoneSystem
  private readonly resourceSources: ResourceSourceSystem
  private readonly ghostSystem: GhostSystem
  private readonly powerPelletSpawner: PowerPelletSpawner
  private powerModeRemaining = 0
  private powerTintEl: HTMLElement | null = null
  private powerTimerEl: HTMLElement | null = null
  private readonly burstGroup: Group
  private readonly burstParticles: GhostHitBurstParticle[] = []
  private readonly burstSpawnScratch = new Vector3()
  private ghostHitInvuln = 0
  /** False until player leaves ghost melee+padding after a hit (stops overlap spam). */
  private ghostDamageArmed = true
  private hitFlashEl: HTMLElement | null = null
  private hitFlashTimer: ReturnType<typeof setTimeout> | null = null
  private readonly letterZoneDebugRoot: Group
  private readonly hostEl: HTMLElement
  private readonly chaseWord: ChaseWordSystem
  private depositToastTimer: ReturnType<typeof setTimeout> | null = null
  private chaseToastTimer: ReturnType<typeof setTimeout> | null = null
  private overloadHudTimer: ReturnType<typeof setTimeout> | null = null
  private overloadSession: { active: boolean; perfect: boolean } | null = null
  private raf = 0
  private lastTime = performance.now()
  private elapsedSec = 0
  private spawnMode: ItemSpawnMode
  private hudSpawn: HTMLElement | null = null
  private hudLetters: HTMLElement | null = null
  private readonly moneyHud: MoneyHud | null
  private readonly gameViewport: HTMLElement
  private readonly velScratch = new Vector3()
  private readonly playerPos = new Vector3()
  private idleSec = 0
  private bootstrapHintEl: HTMLElement | null = null
  private objectiveEl: HTMLElement | null = null
  private idleHintEl: HTMLElement | null = null
  private hudCarryValueEl: HTMLElement | null = null

  private readonly onSpawnModeKey = (e: KeyboardEvent): void => {
    if (e.code === 'Digit1') {
      e.preventDefault()
      this.setSpawnMode('crystal')
    }
    if (e.code === 'Digit2') {
      e.preventDefault()
      this.setSpawnMode('letter')
    }
    if (e.code === 'KeyZ') {
      e.preventDefault()
      this.letterZoneDebugRoot.visible = !this.letterZoneDebugRoot.visible
    }
  }

  constructor(host: HTMLElement) {
    this.hostEl = host
    this.gameViewport =
      host.querySelector<HTMLElement>('#game-viewport') ?? host
    const {
      scene,
      playerRoot,
      stackAnchor,
      pickupGroup,
      ghostGroup,
      depositRoot,
      depositZoneMesh,
      depositRingMesh,
      playerCharacter,
      upgradePads,
      letterZoneDebugRoot,
    } = createScene()

    this.scene = scene
    this.burstGroup = new Group()
    this.burstGroup.name = 'ghostHitBurst'
    this.burstGroup.renderOrder = 50
    this.scene.add(this.burstGroup)

    const hudMoney = host.querySelector<HTMLElement>('#hud-money')
    const hudCarry = host.querySelector<HTMLElement>('#hud-carry')
    this.hudCarryValueEl = host.querySelector<HTMLElement>('#hud-carry-value')
    const hudDepositToast = host.querySelector<HTMLElement>(
      '#hud-deposit-toast',
    )
    const depositAmountEl = hudDepositToast?.querySelector<HTMLElement>(
      '.deposit-amount',
    )
    const depositWordEl = hudDepositToast?.querySelector<HTMLElement>(
      '.deposit-word',
    )
    const depositHintEl = hudDepositToast?.querySelector<HTMLElement>(
      '.deposit-hint',
    )
    this.hudSpawn = host.querySelector('#hud-spawn')
    this.hudLetters = host.querySelector('#hud-letters')
    const hudOverload = host.querySelector<HTMLElement>('#hud-overload')
    const hudOverloadAmount = hudOverload?.querySelector<HTMLElement>(
      '.hud-overload-amount',
    )
    const hudChaseToast = host.querySelector<HTMLElement>('#hud-chase-toast')
    const chaseToastWordEl = hudChaseToast?.querySelector<HTMLElement>(
      '.chase-toast-word',
    )
    const chaseToastBonusEl = hudChaseToast?.querySelector<HTMLElement>(
      '.chase-toast-bonus',
    )
    this.spawnMode = readSpawnModeFromQuery()
    this.letterZoneDebugRoot = letterZoneDebugRoot
    this.letterZoneDebugRoot.visible = readLetterZoneDebugFromQuery()

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
    this.cameraRig = new CameraRig(this.camera, playerRoot, () =>
      this.stack.count,
    )

    this.economy = new Economy()
    this.moneyHud = hudMoney
      ? new MoneyHud(hudMoney, () => this.economy.money)
      : null
    this.moneyHud?.sync()

    this.stackVisual = new StackVisual(stackAnchor)
    this.stack = new CarryStack(INITIAL_STACK_CAPACITY, () => {
      this.stackVisual.sync(this.stack.getSnapshot())
      if (hudCarry) {
        hudCarry.textContent = `${this.stack.count} / ${this.stack.maxCapacity}`
      }
      this.refreshCarryValueHud()
      this.refreshLettersHud()
      this.refreshChaseHud()
    })
    if (hudCarry) {
      hudCarry.textContent = `0 / ${INITIAL_STACK_CAPACITY}`
    }
    this.refreshCarryValueHud()

    this.chaseWord = new ChaseWordSystem({
      getSpawnMode: () => this.spawnMode,
      economy: this.economy,
      onStateChanged: () => {
        this.refreshChaseHud()
      },
    })
    this.chaseWord.syncMode()

    this.itemWorld = new ItemWorld(pickupGroup, scene)
    this.resourceSources = new ResourceSourceSystem({
      scene: this.scene,
      itemWorld: this.itemWorld,
      player: this.player,
      getSpawnMode: () => this.spawnMode,
      createCrystalItem: () => this.createCrystalSpawnItem(),
      createVowelLetterItem: () => createVowelLetterItem(),
      createConsonantLetterItem: () => createConsonantLetterItem(),
    })
    this.resourceSources.syncLayoutForMode(this.spawnMode)
    this.ghostSystem = new GhostSystem(ghostGroup)
    this.powerPelletSpawner = new PowerPelletSpawner()
    this.refreshLettersHud()
    this.refreshChaseHud()
    this.refreshSpawnHud()
    window.addEventListener('keydown', this.onSpawnModeKey)

    this.seedBootstrapPickups()

    this.hitFlashEl = host.querySelector('#hud-hit-flash')
    this.powerTintEl = host.querySelector('#hud-power-tint')
    this.powerTimerEl = host.querySelector('#hud-power-timer')
    this.bootstrapHintEl = host.querySelector('#hud-bootstrap')
    this.objectiveEl = host.querySelector('#hud-objective')
    this.idleHintEl = host.querySelector('#hud-idle-hint')
    setTimeout(() => {
      this.bootstrapHintEl?.classList.add('hud-bootstrap--out')
      setTimeout(() => this.bootstrapHintEl?.classList.add('hidden'), 380)
    }, BOOTSTRAP_HINT_MS)

    this.collection = new CollectionSystem()

    this.depositFeedback = new DepositZoneFeedback(
      depositZoneMesh,
      depositRingMesh,
      depositRoot,
    )

    this.depositFlight = new DepositFlightAnimator()
    this.depositController = new DepositController({
      depositRoot,
      scene: this.scene,
      player: this.player,
      stack: this.stack,
      stackVisual: this.stackVisual,
      economy: this.economy,
      flight: this.depositFlight,
      evaluateOverload: (snapshot) => {
        const preview = this.chaseWord.previewOverloadAfterDeposit([...snapshot])
        const largeStack = snapshot.length >= OVERLOAD_STACK_THRESHOLD
        const overload = largeStack || preview.completesChase
        const perfect =
          snapshot.length >= this.stack.maxCapacity || preview.perfectChase
        return { overload, perfect }
      },
      onDepositSessionStart: (meta) => {
        this.overloadSession = { active: meta.overload, perfect: meta.perfect }
      },
      onDepositSessionEnd: () => {
        this.overloadSession = null
      },
      onItemDepositLanded: (item) => {
        if (this.overloadSession?.active) {
          this.depositFeedback.triggerOverloadItemImpact(
            this.overloadSession.perfect,
          )
          playJuiceSound('overload_impact')
        } else {
          this.depositFeedback.triggerItem()
          spawnFloatingHudText(
            this.gameViewport,
            `+$${item.value}`,
            'float-hud--coin',
          )
          playJuiceSound('deposit_item')
        }
      },
      onDepositPresentationComplete: (items, ev, ol) => {
        if (ol.overloadActive) {
          this.depositFeedback.triggerOverloadBurst(ol.perfect)
        } else {
          this.depositFeedback.triggerDepositComplete(
            items.length,
            ev.credits + ol.overloadBonus,
          )
        }
        const totalPayout = ev.credits + ol.overloadBonus
        if (hudMoney) {
          hudMoney.classList.remove('money-bump', 'money-bump-big')
          void hudMoney.offsetWidth
          const heavy =
            !ol.overloadActive &&
            (items.length >= 7 || totalPayout >= 65)
          hudMoney.classList.add(heavy ? 'money-bump-big' : 'money-bump')
        }
        if (
          !ol.overloadActive &&
          items.length >= 6 &&
          totalPayout >= 40
        ) {
          spawnFloatingHudText(
            this.gameViewport,
            `+$${totalPayout} BANKED!`,
            'float-hud--bank-big',
          )
        }
        if (
          hudOverload &&
          hudOverloadAmount &&
          ol.overloadActive
        ) {
          if (this.overloadHudTimer) clearTimeout(this.overloadHudTimer)
          hudOverloadAmount.textContent = `+$${totalPayout}`
          hudOverload.classList.toggle('hud-overload--perfect', ol.perfect)
          hudOverload.classList.remove('hidden')
          hudOverload.classList.add('visible')
          this.overloadHudTimer = setTimeout(() => {
            hudOverload.classList.remove('visible', 'hud-overload--perfect')
            hudOverload.classList.add('hidden')
            this.overloadHudTimer = null
          }, 2400)
        }
        if (
          hudDepositToast &&
          depositAmountEl &&
          depositWordEl &&
          depositHintEl
        ) {
          if (this.depositToastTimer) clearTimeout(this.depositToastTimer)
          this.fillDepositToastLines(
            depositAmountEl,
            depositWordEl,
            depositHintEl,
            ev,
            ol,
          )
          hudDepositToast.classList.remove('hidden')
          hudDepositToast.classList.add('visible')
          this.depositToastTimer = setTimeout(() => {
            hudDepositToast.classList.remove('visible')
            hudDepositToast.classList.add('hidden')
            this.depositToastTimer = null
          }, DEPOSIT_TOAST_MS)
        }

        const chase = this.chaseWord.processLetterDeposit(items)
        if (
          chase.chaseCompleted &&
          chase.completedWord &&
          hudChaseToast &&
          chaseToastWordEl &&
          chaseToastBonusEl
        ) {
          if (this.chaseToastTimer) clearTimeout(this.chaseToastTimer)
          chaseToastWordEl.textContent = chase.completedWord
          chaseToastBonusEl.textContent = `+${chase.bonusCredits} bonus gold`
          hudChaseToast.classList.remove('hidden')
          hudChaseToast.classList.add('visible', 'chase-toast--celebrate')
          playJuiceSound('deposit_complete')
          this.chaseToastTimer = setTimeout(() => {
            hudChaseToast.classList.remove(
              'visible',
              'chase-toast--celebrate',
            )
            hudChaseToast.classList.add('hidden')
            this.chaseToastTimer = null
          }, CHASE_TOAST_MS)
        }
      },
    })

    this.upgradeZones = new UpgradeZoneSystem({
      economy: this.economy,
      player: this.player,
      stack: this.stack,
      capacityPad: upgradePads.capacity,
      speedPad: upgradePads.speed,
      onSpendVfx: (_kind, cost, padWorld) => {
        spawnUpgradeSpendCoins(this.hostEl, this.camera, cost, padWorld)
      },
    })

    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - this.lastTime) / 1000)
      this.lastTime = now
      this.elapsedSec += dt

      const j = this.joystick.getVector()
      this.player.update(dt, j)
      this.player.getPosition(this.playerPos)

      this.powerModeRemaining = Math.max(0, this.powerModeRemaining - dt)

      this.itemWorld.updateVisuals(this.elapsedSec, dt)

      this.player.setPowerSpeedMultiplier(
        this.powerModeRemaining > 0 ? POWER_MODE_SPEED_MULTIPLIER : 1,
      )
      this.powerTintEl?.classList.toggle(
        'hud-power-tint--on',
        this.powerModeRemaining > 0,
      )
      if (this.powerTimerEl) {
        const on = this.powerModeRemaining > 0
        this.powerTimerEl.hidden = !on
        if (on) {
          this.powerTimerEl.textContent = `${Math.ceil(this.powerModeRemaining)}`
        }
      }

      this.ghostSystem.setPowerMode(
        this.powerModeRemaining > 0,
        this.elapsedSec,
      )
      this.ghostSystem.update(dt, this.playerPos)

      this.ghostHitInvuln = Math.max(0, this.ghostHitInvuln - dt)
      if (!this.ghostDamageArmed) {
        if (
          this.ghostSystem.isPlayerClearForGhostDamageRearm(
            this.playerPos,
            this.player.radius,
          )
        ) {
          this.ghostDamageArmed = true
        }
      }
      this.gameViewport.classList.toggle(
        'game-viewport--ghost-invuln',
        this.ghostHitInvuln > 0,
      )

      if (this.ghostSystem.tryEatGhost(this.playerPos, this.player.radius)) {
        this.economy.addMoney(GHOST_EAT_MONEY_REWARD)
        spawnFloatingHudText(
          this.gameViewport,
          `+$${GHOST_EAT_MONEY_REWARD}`,
          'float-hud--coin',
        )
        playJuiceSound('ghost_eat')
      }
      const hit = this.ghostSystem.tryHitPlayer(
        this.playerPos,
        this.player.radius,
        this.ghostHitInvuln > 0 || !this.ghostDamageArmed,
      )
      if (hit.kind === 'hit') {
        this.ghostDamageArmed = false
        this.ghostHitInvuln = GHOST_HIT_INVULN_SEC
        this.player.applyGhostKnockback(
          hit.ghostX,
          hit.ghostZ,
          this.playerPos.x,
          this.playerPos.z,
        )
        this.triggerGhostHitFlash()

        const c = this.stack.count
        let toRemove = 0
        if (c > 0) {
          const frac =
            GHOST_HIT_LOSS_MIN +
            Math.random() * (GHOST_HIT_LOSS_MAX - GHOST_HIT_LOSS_MIN)
          toRemove = Math.min(c, Math.ceil(c * frac))
        }
        const lost =
          toRemove > 0 ? this.stack.popManyFromTop(toRemove) : []
        if (lost.length > 0) {
          this.chaseWord.onLettersRemovedFromCarry(lost)
        }

        this.burstSpawnScratch.copy(this.playerPos)
        this.burstSpawnScratch.y += 0.38
        this.burstParticles.push(
          ...spawnGhostHitPelletBurst(
            this.burstGroup,
            this.burstSpawnScratch,
            lost,
          ),
        )
        playJuiceSound('ghost_hit')
        this.ghostSystem.onGhostHitLandedAt(
          hit.ghostX,
          hit.ghostZ,
          this.playerPos,
        )
      }
      updateGhostHitBursts(this.burstParticles, dt)

      const stackIdsBefore = new Set(
        this.stack.getSnapshot().map((i) => i.id),
      )
      this.powerPelletSpawner.update(this.elapsedSec, this.itemWorld)
      this.collection.update(this.player, this.stack, this.itemWorld, dt, {
        pickupBlocked: this.ghostHitInvuln > 0,
        onPowerPelletCollected: (item) => {
          this.powerModeRemaining = POWER_MODE_DURATION_SEC
          this.powerPelletSpawner.onPowerPelletCollected(item.id, this.elapsedSec)
          playJuiceSound('power_pellet')
          spawnFloatingHudText(
            this.gameViewport,
            'POWER!',
            'float-hud--pickup',
          )
        },
      })
      for (const it of this.stack.getSnapshot()) {
        if (!stackIdsBefore.has(it.id)) {
          this.chaseWord.onLetterCollected(it)
          spawnFloatingHudText(this.gameViewport, '+1', 'float-hud--pickup')
          playJuiceSound('pickup')
        }
      }

      this.player.getVelocity(this.velScratch)
      this.playerCharacter.update(dt, {
        timeSec: this.elapsedSec,
        speed: this.player.getHorizontalSpeed(),
        velX: this.velScratch.x,
        itemsCarried: this.stack.count,
        maxCarry: this.stack.maxCapacity,
        powerMode: this.powerModeRemaining > 0,
        ghostInvuln: this.ghostHitInvuln > 0,
      })
      this.cameraRig.update(dt)
      this.moneyHud?.update(dt)
      this.itemWorld.updateCollectEffects(dt)
      this.stackVisual.update(dt)
      this.depositController.update(dt)
      this.depositFeedback.update(dt)
      this.upgradeZones.update()
      this.resourceSources.update(dt, this.elapsedSec)

      this.updateObjectiveAndIdleHints(dt)

      this.renderer.render(scene, this.camera)
    }

    this.raf = requestAnimationFrame(tick)
  }

  private createCrystalSpawnItem(): GameItem {
    return createCrystalItem(
      Math.random(),
      4 + Math.floor(Math.random() * 12),
    )
  }

  private setSpawnMode(mode: ItemSpawnMode): void {
    if (this.spawnMode === mode) return
    this.spawnMode = mode
    this.itemWorld.clearAllPickups()
    this.powerPelletSpawner.reset(this.itemWorld, this.elapsedSec)
    this.resourceSources.onSpawnModeChanged()
    this.resourceSources.syncLayoutForMode(this.spawnMode)
    this.chaseWord.syncMode()
    this.refreshLettersHud()
    this.refreshChaseHud()
    this.refreshSpawnHud()
  }

  private refreshChaseHud(): void {
    const hudChase = this.hostEl.querySelector<HTMLElement>('#hud-chase')
    const hudChaseTarget = this.hostEl.querySelector<HTMLElement>(
      '#hud-chase-target',
    )
    const hudChaseProgress = this.hostEl.querySelector<HTMLElement>(
      '#hud-chase-progress',
    )
    if (!hudChase || !hudChaseTarget || !hudChaseProgress) return
    if (this.spawnMode !== 'letter') {
      hudChase.classList.add('hidden')
      return
    }
    hudChase.classList.remove('hidden')
    const t = this.chaseWord.getActiveTarget()
    hudChaseTarget.textContent = t ?? '—'
    const progress = this.chaseWord.getProgressLine()
    const gaps = this.chaseWord.getChaseGapCount()
    hudChase.classList.toggle('hud-chase--close', gaps > 0 && gaps <= 2)
    hudChaseProgress.textContent = ''
    if (progress) {
      hudChaseProgress.appendChild(document.createTextNode('PROGRESS: '))
      for (const token of progress.split(' ')) {
        const span = document.createElement('span')
        span.textContent = `${token} `
        if (token === '_') span.className = 'chase-gap'
        hudChaseProgress.appendChild(span)
      }
    }
  }

  private seedBootstrapPickups(): void {
    const base = getSpawnNearPrimarySource(2.35)
    const offsets: [number, number][] = [
      [1.05, 0.35],
      [-0.55, 1.05],
      [0.35, -0.85],
    ]
    for (const [dx, dz] of offsets) {
      const item =
        this.spawnMode === 'crystal'
          ? this.createCrystalSpawnItem()
          : createVowelLetterItem()
      this.itemWorld.spawn(item, base.x + dx, base.z + dz)
    }
  }

  private updateObjectiveAndIdleHints(dt: number): void {
    if (this.objectiveEl) {
      this.objectiveEl.textContent =
        this.stack.count === 0
          ? 'Pick up items in the colored zones'
          : 'Deposit at the bright gold circle (center)'
    }

    const speed = this.player.getHorizontalSpeed()
    if (speed < IDLE_SPEED_MAX) {
      this.idleSec += dt
    } else {
      this.idleSec = 0
    }

    this.player.getPosition(this.playerPos)
    const px = this.playerPos.x
    const pz = this.playerPos.z
    let inSource = false
    const probeR = 5.75
    const r2 = probeR * probeR
    for (const s of DEFAULT_RESOURCE_SOURCES) {
      const dx = px - s.worldX
      const dz = pz - s.worldZ
      if (dx * dx + dz * dz <= r2) {
        inSource = true
        break
      }
    }

    if (
      this.idleHintEl &&
      this.idleSec > IDLE_HINT_AFTER_SEC &&
      speed < IDLE_SPEED_MAX &&
      !inSource
    ) {
      this.idleHintEl.classList.remove('hidden')
    } else {
      this.idleHintEl?.classList.add('hidden')
    }
  }

  private refreshCarryValueHud(): void {
    const el = this.hudCarryValueEl
    if (!el) return
    const snap = this.stack.getSnapshot()
    if (snap.length === 0) {
      el.textContent = '≈ $0'
      el.hidden = true
      return
    }
    el.hidden = false
    el.textContent = `≈ $${previewCarryPayout(snap)}`
  }

  private refreshLettersHud(): void {
    if (!this.hudLetters) return
    if (this.spawnMode !== 'letter') {
      this.hudLetters.textContent = ''
      this.hudLetters.hidden = true
      return
    }
    this.hudLetters.hidden = false
    const letters = this.stack
      .getSnapshot()
      .filter((i): i is Extract<GameItem, { type: 'letter' }> => i.type === 'letter')
      .map((i) => i.letter)
      .join('')
    this.hudLetters.textContent = letters
  }

  private fillDepositToastLines(
    amountEl: HTMLElement,
    wordEl: HTMLElement,
    hintEl: HTMLElement,
    ev: DepositEval,
    overload?: DepositPresentationOverload,
  ): void {
    const total = ev.credits + (overload?.overloadBonus ?? 0)
    const stackJackpot =
      !overload?.overloadActive &&
      ev.itemCount >= 2 &&
      ev.batchMultiplier >= 1.18
    amountEl.classList.remove(
      'deposit-amount--overload',
      'deposit-amount--overload-perfect',
      'deposit-amount--stack-jackpot',
    )
    if (overload?.overloadActive) {
      amountEl.textContent = total > 0 ? `+$${total}` : '$0'
      amountEl.classList.add('deposit-amount--overload')
      if (overload.perfect) amountEl.classList.add('deposit-amount--overload-perfect')
    } else {
      amountEl.textContent = ev.credits > 0 ? `+$${ev.credits}` : '$0'
      if (stackJackpot) amountEl.classList.add('deposit-amount--stack-jackpot')
    }

    const riskLine =
      !overload?.overloadActive && ev.batchMultiplier > 1.02
        ? `Stack bonus ×${ev.batchMultiplier.toFixed(2)} (base $${ev.baseCredits})`
        : ''

    if (ev.letterWord.length === 0) {
      wordEl.textContent = ''
      wordEl.style.display = 'none'
      if (overload?.overloadActive) {
        hintEl.style.display = 'block'
        hintEl.textContent = overload.perfect
          ? 'Perfect overload — maximum burst'
          : 'Overload drop — bonus credits'
      } else if (riskLine) {
        hintEl.style.display = 'block'
        hintEl.textContent = `${riskLine} — bigger stacks pay more`
      } else {
        hintEl.textContent = ''
        hintEl.style.display = 'none'
      }
      return
    }
    wordEl.style.display = 'block'
    wordEl.textContent = ev.letterWord
    if (overload?.overloadActive) {
      hintEl.style.display = 'block'
      hintEl.textContent = overload.perfect
        ? 'Perfect overload — maximum burst'
        : 'Overload drop — bonus credits'
    } else {
      const parts: string[] = []
      if (riskLine) parts.push(riskLine)
      if (ev.wordValid === true) {
        parts.push('Valid word — bonus applied')
      } else if (ev.wordValid === false) {
        parts.push('Not a word — partial payout')
      }
      if (parts.length > 0) {
        hintEl.style.display = 'block'
        hintEl.textContent = parts.join(' · ')
      } else {
        hintEl.style.display = 'none'
        hintEl.textContent = ''
      }
    }
  }

  private triggerGhostHitFlash(): void {
    const el = this.hitFlashEl
    if (!el) return
    if (this.hitFlashTimer) {
      clearTimeout(this.hitFlashTimer)
      this.hitFlashTimer = null
    }
    el.classList.add('hud-hit-flash--on')
    this.hitFlashTimer = setTimeout(() => {
      el.classList.remove('hud-hit-flash--on')
      this.hitFlashTimer = null
    }, 88)
  }

  private refreshSpawnHud(): void {
    if (!this.hudSpawn) return
    const label =
      this.spawnMode === 'crystal' ? 'pellets (hue)' : 'pellets (letters)'
    this.hudSpawn.textContent = `Mode: ${label} · sources · [1][2] · ?spawn=letter · [Z] zones · ?zones=1`
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onSpawnModeKey)
    if (this.depositToastTimer) clearTimeout(this.depositToastTimer)
    if (this.chaseToastTimer) clearTimeout(this.chaseToastTimer)
    if (this.overloadHudTimer) clearTimeout(this.overloadHudTimer)
    if (this.hitFlashTimer) {
      clearTimeout(this.hitFlashTimer)
      this.hitFlashTimer = null
    }
    this.hitFlashEl?.classList.remove('hud-hit-flash--on')
    this.gameViewport.classList.remove('game-viewport--ghost-invuln')
    disposeAllGhostHitBursts(this.burstParticles)
    this.burstGroup.removeFromParent()
    this.resourceSources.dispose()
    this.ghostSystem.dispose()
    disposeGhostSharedGeometry()
    this.joystick.dispose()
    this.unsubscribeResize()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
