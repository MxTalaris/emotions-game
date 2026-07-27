import Phaser from 'phaser';
import { CardPreviewPopup } from '../entities/CardPreviewPopup';
import { CardSprite, cardTextureKey } from '../entities/CardSprite';
import { EventCircle } from '../entities/EventCircle';
import { FeelButton } from '../entities/FeelButton';
import { FlowerDetailPopup } from '../entities/FlowerDetailPopup';
import { MusicToggleButton } from '../entities/MusicToggleButton';
import { PersonalityCloud } from '../entities/PersonalityCloud';
import { EventManager } from '../systems/EventManager';
import {
  addPersonalityToSession,
  loadGameSession,
} from '../systems/gameSession';
import { getSeedById, resolveSeed } from '../data/eventTemplates';
import { resolveRewardCards } from '../systems/grantRewardCards';
import { resolveEventOutputEmotions } from '../systems/resolveEventOutputs';
import {
  selectEventResults,
  shouldOverrideOutputsFromResults,
} from '../systems/resolveEventResults';
import {
  findEventsCompletingThisSentir,
  findEventsWithFeelingsThisTurn,
} from '../systems/processFeelings';
import { TurnManager } from '../systems/TurnManager';
import {
  CardAlias,
  createCardInstance,
  EventAction,
  EventResult,
  GameEventInstance,
  PersonalityId,
} from '../types';
import {
  CARD_HEIGHT,
  EVENT_COLORS,
  EVENT_TREE,
  EVENT_VIEW_TOP,
  FEEL_BUTTON,
  GAME_HEIGHT,
  GAME_WIDTH,
  HAND_CARD_SCALE,
  HAND_WHEEL,
  HAND_Y,
  MUSIC_BUTTON,
  TREE_ZOOM,
} from '../config/gameConfig';
import { APATHY_CARD, cards, getInitialHandCards } from '../data/cards';
import { isCatalogPersonalityId } from '../data/personalities';
import {
  buildBranchCurve,
  drawSkyGroundBackground,
  Point,
  strokeCubicProgress,
} from '../utils/gardenGraphics';

type BranchCurve = [Point, Point, Point, Point];

const TREE_LABEL_OFFSET = 30;

type ViewportGesture =
  | {
      type: 'tree-pan';
      pointerId: number;
      startX: number;
      startY: number;
      originScrollX: number;
      originScrollY: number;
      flowerTap: EventCircle | null;
    }
  | {
      type: 'hand-pan';
      pointerId: number;
      startX: number;
      originScrollX: number;
    }
  | {
      type: 'pinch';
      pointerIds: [number, number];
      startDistance: number;
      startZoom: number;
      startMidX: number;
      startMidY: number;
      originScrollX: number;
      originScrollY: number;
    };

export class GameScene extends Phaser.Scene {
  private handCards: CardSprite[] = [];
  private eventCircles: EventCircle[] = [];
  private placedCardsByEvent = new Map<number, CardSprite[]>();
  private draggingCard: CardSprite | null = null;
  private eventManager!: EventManager;
  private turnManager = new TurnManager();
  private treeLayer!: Phaser.GameObjects.Container;
  private treeGraphics!: Phaser.GameObjects.Graphics;
  private grownBranches: BranchCurve[] = [];
  private growingBranches: Array<{ curve: BranchCurve; progress: number }> = [];
  private treeScrollY = 0;
  private treeScrollX = 0;
  private treeZoom = TREE_ZOOM.default;
  private handScrollX = 0;
  private viewportGesture: ViewportGesture | null = null;
  private feelButton!: FeelButton;
  private musicButton!: MusicToggleButton;
  private turnText!: Phaser.GameObjects.Text;
  private bgm: Phaser.Sound.BaseSound | null = null;
  private musicEnabled = false;
  private personalityClouds: PersonalityCloud[] = [];
  private endGameOverlay: Phaser.GameObjects.Container | null = null;
  private flowerDetailPopup: FlowerDetailPopup | null = null;
  private cardPreviewPopup: CardPreviewPopup | null = null;
  private launchSeedId: string | null = null;
  private launchSelectedPersonalities: PersonalityId[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: {
    seedId?: string;
    selectedPersonalities?: PersonalityId[];
  } = {}): void {
    this.launchSeedId = data.seedId ?? null;
    this.launchSelectedPersonalities = Array.isArray(data.selectedPersonalities)
      ? data.selectedPersonalities
      : [];
  }

  preload(): void {
    this.load.audio('bgm-chill', 'assets/audio/bgm-chill.ogg');

    const seen = new Set<string>();
    for (const definition of [...cards, APATHY_CARD]) {
      if (!definition.image || seen.has(definition.alias)) continue;
      seen.add(definition.alias);
      this.load.image(cardTextureKey(definition.alias), definition.image);
    }
  }

  create(): void {
    this.handCards = [];
    this.eventCircles = [];
    this.placedCardsByEvent = new Map();
    this.draggingCard = null;
    this.grownBranches = [];
    this.growingBranches = [];

    const session = loadGameSession();
    const selectedPersonalities =
      this.launchSelectedPersonalities.length > 0
        ? this.launchSelectedPersonalities
        : session.selectedPersonalities;
    const seedId = this.launchSeedId ?? session.seedId;
    const seed =
      (seedId ? getSeedById(seedId) : undefined) ??
      resolveSeed(selectedPersonalities);

    this.eventManager = new EventManager(seed);
    this.turnManager = new TurnManager();
    this.treeScrollY = 0;
    this.treeScrollX = 0;
    this.treeZoom = TREE_ZOOM.default;
    this.handScrollX = 0;
    this.viewportGesture = null;
    this.personalityClouds = [];
    this.endGameOverlay = null;
    this.flowerDetailPopup = null;
    this.cardPreviewPopup = null;
    this.bgm = null;
    this.musicEnabled = false;

    drawSkyGroundBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.treeLayer = this.add.container(0, 0).setDepth(10);
    this.treeGraphics = this.add.graphics();
    this.treeLayer.add(this.treeGraphics);

    this.createEvents();
    this.createHand();
    this.createFeelButton();
    this.createMusicButton();
    this.createTurnDisplay();
    this.setupDragAndDrop();
    this.setupScroll();
    this.setupTouchViewport();
    this.ensureApathyHandForRequiredSlots();
    this.updateFeelButtonState();
    this.setupBackgroundMusic();
    this.restoreSessionPersonalities();
  }

  private setupBackgroundMusic(): void {
    if (this.bgm) return;

    this.bgm = this.sound.add('bgm-chill', {
      loop: true,
      volume: 0.35,
    });

    const tryPlay = () => {
      if (!this.bgm || !this.musicEnabled || this.bgm.isPlaying) return;
      this.sound.unlock();
      this.bgm.play();
    };

    // Browsers often block autoplay until a user gesture.
    tryPlay();
    this.input.once('pointerdown', tryPlay);
  }

  private setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;

    if (!this.bgm) return;

    if (enabled) {
      this.sound.unlock();
      if (!this.bgm.isPlaying) {
        this.bgm.play();
      }
      return;
    }

    if (this.bgm.isPlaying) {
      this.bgm.pause();
    }
  }

  private createEvents(): void {
    const eventInstances = this.eventManager.generateInitialEvents();

    this.eventCircles = eventInstances.map((instance) => {
      const circle = new EventCircle(this, instance);
      this.treeLayer.add(circle);
      return circle;
    });
  }

  private spawnEvents(
    parent: EventCircle,
    instances: GameEventInstance[]
  ): void {
    if (instances.length === 0) return;

    const from: Point = {
      x: parent.eventData.x,
      y: parent.eventData.y - EVENT_TREE.height / 2,
    };
    const curves = instances.map((instance) =>
      buildBranchCurve(from, {
        x: instance.x,
        y: instance.y + EVENT_TREE.height / 2,
      })
    );

    const childCircles = instances.map((instance) => {
      const circle = new EventCircle(this, instance);
      circle.setAlpha(0);
      circle.setScale(0.2);
      this.treeLayer.add(circle);
      this.eventCircles.push(circle);
      return circle;
    });

    this.growBranches(curves, () => {
      for (const circle of childCircles) {
        circle.playSeedReveal();
      }
    });

    this.ensureEventsVisible(instances);
    this.updateFeelButtonState();
  }

  private growBranches(curves: BranchCurve[], onComplete: () => void): void {
    const growing = curves.map((curve) => ({ curve, progress: 0 }));
    this.growingBranches.push(...growing);

    const state = { t: 0 };
    this.tweens.add({
      targets: state,
      t: 1,
      duration: EVENT_TREE.branchGrowMs,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        for (const branch of growing) {
          branch.progress = state.t;
        }
        this.redrawBranches();
      },
      onComplete: () => {
        for (const branch of growing) {
          const index = this.growingBranches.indexOf(branch);
          if (index >= 0) this.growingBranches.splice(index, 1);
          this.grownBranches.push(branch.curve);
        }
        this.redrawBranches();
        onComplete();
      },
    });
  }

  private redrawBranches(): void {
    this.treeGraphics.clear();
    this.treeGraphics.lineStyle(
      EVENT_TREE.branchWidth,
      EVENT_COLORS.connector,
      0.8
    );

    for (const [p0, p1, p2, p3] of this.grownBranches) {
      strokeCubicProgress(this.treeGraphics, p0, p1, p2, p3, 1);
    }

    for (const { curve, progress } of this.growingBranches) {
      const [p0, p1, p2, p3] = curve;
      strokeCubicProgress(this.treeGraphics, p0, p1, p2, p3, progress);
    }
  }

  private getTreeBounds(): { minX: number; maxX: number; minY: number } {
    const halfW = EVENT_TREE.width / 2;
    const xs = this.eventCircles.map((event) => event.eventData.x);
    const ys = this.eventCircles.map(
      (event) => event.eventData.y - event.eventData.height / 2 - TREE_LABEL_OFFSET
    );

    return {
      minX: Math.min(...xs) - halfW,
      maxX: Math.max(...xs) + halfW,
      minY: Math.min(...ys),
    };
  }

  private getMaxTreeScrollY(): number {
    if (this.eventCircles.length === 0) return 0;
    return Math.max(0, EVENT_VIEW_TOP - this.getTreeBounds().minY * this.treeZoom);
  }

  private getTreeScrollXRange(): { min: number; max: number } {
    if (this.eventCircles.length === 0) return { min: 0, max: 0 };

    const { minX, maxX } = this.getTreeBounds();
    const padding = EVENT_TREE.sidePadding;
    const overflowLeft = Math.max(0, padding - minX * this.treeZoom);
    const overflowRight = Math.max(0, maxX * this.treeZoom - (GAME_WIDTH - padding));

    return {
      min: -overflowRight,
      max: overflowLeft,
    };
  }

  private applyTreeTransform(): void {
    this.treeLayer.setPosition(this.treeScrollX, this.treeScrollY);
    this.treeLayer.setScale(this.treeZoom);
  }

  private clampTreeScroll(): void {
    const range = this.getTreeScrollXRange();
    this.treeScrollX = Phaser.Math.Clamp(this.treeScrollX, range.min, range.max);
    this.treeScrollY = Phaser.Math.Clamp(this.treeScrollY, 0, this.getMaxTreeScrollY());
  }

  private setTreeScrollY(scrollY: number): void {
    this.treeScrollY = scrollY;
    this.clampTreeScroll();
    this.applyTreeTransform();
  }

  private setTreeScrollX(scrollX: number): void {
    this.treeScrollX = scrollX;
    this.clampTreeScroll();
    this.applyTreeTransform();
  }

  private setTreeScroll(scrollX: number, scrollY: number): void {
    this.treeScrollX = scrollX;
    this.treeScrollY = scrollY;
    this.clampTreeScroll();
    this.applyTreeTransform();
  }

  private screenToTreeLocal(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.treeScrollX) / this.treeZoom,
      y: (screenY - this.treeScrollY) / this.treeZoom,
    };
  }

  private ensureEventsVisible(instances: GameEventInstance[]): void {
    if (instances.length === 0) return;

    const minNewY = Math.min(
      ...instances.map(
        (instance) => instance.y - instance.height / 2 - TREE_LABEL_OFFSET
      )
    );
    const neededScrollY = EVENT_VIEW_TOP - minNewY * this.treeZoom;
    if (neededScrollY > this.treeScrollY) {
      this.setTreeScrollY(neededScrollY);
    }

    const padding = EVENT_TREE.sidePadding;
    const xs = instances.map((instance) => instance.x);
    const halfW = EVENT_TREE.width / 2;
    const minX = Math.min(...xs) - halfW;
    const maxX = Math.max(...xs) + halfW;

    if (minX * this.treeZoom + this.treeScrollX < padding) {
      this.setTreeScrollX(padding - minX * this.treeZoom);
    } else if (maxX * this.treeZoom + this.treeScrollX > GAME_WIDTH - padding) {
      this.setTreeScrollX(GAME_WIDTH - padding - maxX * this.treeZoom);
    }
  }

  private getHandCenterIndex(): number {
    return (this.handCards.length - 1) / 2;
  }

  /** Max rotation (degrees) so the outermost card can reach the top center. */
  private getMaxHandScroll(): number {
    return this.getHandCenterIndex() * HAND_WHEEL.angleStepDeg;
  }

  private setHandScroll(scrollDeg: number): void {
    const maxScroll = this.getMaxHandScroll();
    this.handScrollX = Phaser.Math.Clamp(scrollDeg, -maxScroll, maxScroll);
    this.relayoutHand();
  }

  private isPointerOverHand(pointer: Phaser.Input.Pointer): boolean {
    return pointer.y >= HAND_Y - CARD_HEIGHT / 2 - 16;
  }

  private isPointerOverFeelButton(pointer: Phaser.Input.Pointer): boolean {
    const halfW = FEEL_BUTTON.width / 2;
    const halfH = FEEL_BUTTON.height / 2;
    return (
      pointer.x >= FEEL_BUTTON.x - halfW &&
      pointer.x <= FEEL_BUTTON.x + halfW &&
      pointer.y >= FEEL_BUTTON.y - halfH &&
      pointer.y <= FEEL_BUTTON.y + halfH
    );
  }

  private isPointerOverTopUi(pointer: Phaser.Input.Pointer): boolean {
    return (
      this.isPointerOverFeelButton(pointer) ||
      this.musicButton.containsPoint(pointer.x, pointer.y)
    );
  }

  private isPointerOverHandCard(pointer: Phaser.Input.Pointer): boolean {
    return this.handCards.some((card) => {
      if (card.isPlaced) return false;
      const bounds = card.getBounds();
      return bounds.contains(pointer.x, pointer.y);
    });
  }

  private isPointerOverRecallableCard(pointer: Phaser.Input.Pointer): boolean {
    for (const cards of this.placedCardsByEvent.values()) {
      for (const card of cards) {
        if (!card.canRecall) continue;
        if (card.getBounds().contains(pointer.x, pointer.y)) {
          return true;
        }
      }
    }
    return false;
  }

  private getActivePointers(): Phaser.Input.Pointer[] {
    return this.input.manager.pointers.filter(
      (pointer) => pointer.active && pointer.isDown
    );
  }

  private getPinchMetrics(
    a: Phaser.Input.Pointer,
    b: Phaser.Input.Pointer
  ): { distance: number; midX: number; midY: number } {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return {
      distance: Math.hypot(dx, dy),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
  }

  private setupScroll(): void {
    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number
      ) => {
        if (this.isPointerOverHand(pointer)) {
          if (this.getMaxHandScroll() <= 0) return;
          const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
          this.setHandScroll(this.handScrollX - delta * HAND_WHEEL.degPerWheel);
          return;
        }

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          this.setTreeScrollX(this.treeScrollX - deltaX * 0.45);
          return;
        }

        this.setTreeScrollY(this.treeScrollY - deltaY * 0.45);
      }
    );
  }

  private setupTouchViewport(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleViewportPointerDown(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleViewportPointerMove(pointer);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handleViewportPointerUp(pointer);
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      this.handleViewportPointerUp(pointer);
    });
  }

  private handleViewportPointerDown(pointer: Phaser.Input.Pointer): void {
    const activePointers = this.getActivePointers();

    if (activePointers.length >= 2) {
      this.startPinchGesture(activePointers[0], activePointers[1]);
      return;
    }

    if (
      this.draggingCard ||
      this.isPointerOverTopUi(pointer) ||
      this.flowerDetailPopup ||
      this.cardPreviewPopup
    ) {
      return;
    }

    if (this.isPointerOverHandCard(pointer) || this.isPointerOverRecallableCard(pointer)) {
      return;
    }

    if (this.isPointerOverHand(pointer)) {
      if (this.getMaxHandScroll() <= 0) {
        return;
      }
      this.viewportGesture = {
        type: 'hand-pan',
        pointerId: pointer.id,
        startX: pointer.x,
        originScrollX: this.handScrollX,
      };
      return;
    }

    const eventAtPointer = this.findEventAt(pointer.x, pointer.y);
    this.viewportGesture = {
      type: 'tree-pan',
      pointerId: pointer.id,
      startX: pointer.x,
      startY: pointer.y,
      originScrollX: this.treeScrollX,
      originScrollY: this.treeScrollY,
      flowerTap:
        eventAtPointer?.eventData.completed === true ? eventAtPointer : null,
    };
  }

  private startPinchGesture(
    a: Phaser.Input.Pointer,
    b: Phaser.Input.Pointer
  ): void {
    if (this.draggingCard) {
      this.draggingCard.returnToHand();
      this.draggingCard = null;
    }

    const metrics = this.getPinchMetrics(a, b);
    if (metrics.distance < 8) return;

    this.viewportGesture = {
      type: 'pinch',
      pointerIds: [a.id, b.id],
      startDistance: metrics.distance,
      startZoom: this.treeZoom,
      startMidX: metrics.midX,
      startMidY: metrics.midY,
      originScrollX: this.treeScrollX,
      originScrollY: this.treeScrollY,
    };
  }

  private handleViewportPointerMove(pointer: Phaser.Input.Pointer): void {
    const gesture = this.viewportGesture;
    if (!gesture) {
      const activePointers = this.getActivePointers();
      if (activePointers.length >= 2) {
        this.startPinchGesture(activePointers[0], activePointers[1]);
      }
      return;
    }

    if (gesture.type === 'pinch') {
      if (!gesture.pointerIds.includes(pointer.id)) return;

      const pointers = gesture.pointerIds
        .map((id) => this.input.manager.pointers.find((p) => p.id === id))
        .filter((p): p is Phaser.Input.Pointer => !!p && p.isDown);

      if (pointers.length < 2) return;

      const metrics = this.getPinchMetrics(pointers[0], pointers[1]);
      if (gesture.startDistance < 8 || metrics.distance < 8) return;

      const nextZoom = Phaser.Math.Clamp(
        gesture.startZoom * (metrics.distance / gesture.startDistance),
        TREE_ZOOM.min,
        TREE_ZOOM.max
      );
      const localX = (gesture.startMidX - gesture.originScrollX) / gesture.startZoom;
      const localY = (gesture.startMidY - gesture.originScrollY) / gesture.startZoom;

      this.treeZoom = nextZoom;
      this.setTreeScroll(
        metrics.midX - localX * nextZoom,
        metrics.midY - localY * nextZoom
      );
      return;
    }

    if (gesture.pointerId !== pointer.id || !pointer.isDown) return;

    if (gesture.type === 'hand-pan') {
      this.setHandScroll(
        gesture.originScrollX +
          (pointer.x - gesture.startX) * HAND_WHEEL.degPerPixel
      );
      return;
    }

    this.setTreeScroll(
      gesture.originScrollX + (pointer.x - gesture.startX),
      gesture.originScrollY + (pointer.y - gesture.startY)
    );
  }

  private handleViewportPointerUp(pointer: Phaser.Input.Pointer): void {
    const gesture = this.viewportGesture;
    if (!gesture) return;

    if (gesture.type === 'pinch') {
      if (!gesture.pointerIds.includes(pointer.id)) return;

      const remaining = this.getActivePointers().filter((p) => p.id !== pointer.id);
      if (remaining.length >= 2) {
        this.startPinchGesture(remaining[0], remaining[1]);
        return;
      }

      if (remaining.length === 1) {
        const next = remaining[0];
        this.viewportGesture = {
          type: 'tree-pan',
          pointerId: next.id,
          startX: next.x,
          startY: next.y,
          originScrollX: this.treeScrollX,
          originScrollY: this.treeScrollY,
          flowerTap: null,
        };
        return;
      }

      this.viewportGesture = null;
      return;
    }

    if (gesture.pointerId === pointer.id) {
      if (gesture.type === 'tree-pan' && gesture.flowerTap) {
        const moved = Math.hypot(
          pointer.x - gesture.startX,
          pointer.y - gesture.startY
        );
        if (moved < 10) {
          this.showFlowerDetail(gesture.flowerTap);
        }
      }
      this.viewportGesture = null;
    }
  }

  private createFeelButton(): void {
    this.feelButton = new FeelButton(this, {
      x: FEEL_BUTTON.x,
      y: FEEL_BUTTON.y,
      width: FEEL_BUTTON.width,
      height: FEEL_BUTTON.height,
      label: 'Sentir',
      onClick: () => this.processFeelings(),
    });
    this.feelButton.setDepth(200);
  }

  private createMusicButton(): void {
    this.musicButton = new MusicToggleButton(this, {
      x: MUSIC_BUTTON.x,
      y: MUSIC_BUTTON.y,
      size: MUSIC_BUTTON.size,
      enabled: false,
      onToggle: (enabled) => this.setMusicEnabled(enabled),
    });
    this.musicButton.setDepth(200);
  }

  private canPressFeel(): boolean {
    return !this.eventCircles.some((event) => event.needsRequiredCard());
  }

  private updateFeelButtonState(): void {
    this.feelButton.setEnabled(this.canPressFeel());
  }

  private countRequiredSlotsAvailable(): number {
    return this.eventCircles.reduce((total, event) => {
      if (event.eventData.completed || !event.eventData.cardsRequired) {
        return total;
      }
      return (
        total +
        Math.max(
          0,
          event.eventData.cardsPerTurn - event.eventData.cardsPlacedThisTurn
        )
      );
    }, 0);
  }

  private ensureApathyHandForRequiredSlots(): void {
    const needed = this.countRequiredSlotsAvailable();
    const deficit = needed - this.handCards.length;
    if (deficit <= 0) return;

    for (let i = 0; i < deficit; i++) {
      const instance = createCardInstance(APATHY_CARD);
      const card = new CardSprite(this, GAME_WIDTH / 2, HAND_Y, instance);
      this.setupHandCard(card);
      this.input.setDraggable(card);
      this.handCards.push(card);
    }

    const maxScroll = this.getMaxHandScroll();
    if (maxScroll > 0) {
      this.handScrollX = -maxScroll;
    }
    this.relayoutHand();
  }

  private allocateApathyCardToEvent(event: EventCircle): void {
    if (!event.canAcceptCard()) return;

    const instance = createCardInstance(APATHY_CARD);
    const card = new CardSprite(
      this,
      event.eventData.x,
      event.eventData.y,
      instance
    );

    event.addCard(APATHY_CARD.alias);

    const eventInstanceId = event.eventData.instanceId;
    const placed = this.placedCardsByEvent.get(eventInstanceId) ?? [];
    placed.push(card);
    this.placedCardsByEvent.set(eventInstanceId, placed);

    this.treeLayer.add(card);
    this.relayoutEventCards(event);
  }

  private autoAllocateApathyToOptionalEvents(): void {
    for (const event of this.eventCircles) {
      if (event.eventData.completed || event.eventData.cardsRequired) {
        continue;
      }

      while (event.canAcceptCard()) {
        this.allocateApathyCardToEvent(event);
      }
    }
  }

  private createTurnDisplay(): void {
    this.turnText = this.add.text(16, 16, this.getTurnLabel(), {
      fontSize: '16px',
      color: '#3d3428',
      fontStyle: 'bold',
    });
    this.turnText.setDepth(200);
  }

  private getTurnLabel(): string {
    return `Turno ${this.turnManager.getCurrentTurn()}`;
  }

  private updateTurnDisplay(): void {
    this.turnText.setText(this.getTurnLabel());
  }

  private createHand(): void {
    this.handCards = getInitialHandCards().map((definition) => {
      const instance = createCardInstance(definition);
      const card = new CardSprite(this, GAME_WIDTH / 2, HAND_Y, instance);
      this.setupHandCard(card);
      this.input.setDraggable(card);
      return card;
    });

    this.relayoutHand();
  }

  private setupDragAndDrop(): void {
    this.input.on(
      'dragstart',
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const card = gameObject as CardSprite;
        if (card.isCommitted) return;

        this.draggingCard = card;

        if (card.canRecall) {
          this.recallCardFromEvent(card, pointer);
        }

        card.onDragStart();
      }
    );

    this.input.on(
      'drag',
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const card = gameObject as CardSprite;
        if (card.isCommitted) return;
        card.setPosition(pointer.x, pointer.y);
      }
    );

    this.input.on(
      'dragend',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const card = gameObject as CardSprite;
        if (card.isCommitted) return;

        const targetEvent = this.findEventAt(card.x, card.y);

        if (targetEvent?.canAcceptCard()) {
          targetEvent.addCard(card.cardData.alias);
          this.placeCardOnEvent(card, targetEvent);
          this.removeFromHand(card);
          this.updateFeelButtonState();
        } else {
          card.returnToHand();
        }

        this.draggingCard = null;
      }
    );
  }

  private recallCardFromEvent(
    card: CardSprite,
    pointer: Phaser.Input.Pointer
  ): void {
    const eventInstanceId = card.cardData.eventInstanceId;
    if (eventInstanceId == null) return;

    const event = this.eventCircles.find(
      (item) => item.eventData.instanceId === eventInstanceId
    );
    if (!event || event.eventData.completed) return;

    const placed = this.placedCardsByEvent.get(eventInstanceId) ?? [];
    const index = placed.indexOf(card);
    if (index < 0) return;
    if (!event.removeCardAt(index)) return;

    placed.splice(index, 1);
    this.placedCardsByEvent.set(eventInstanceId, placed);

    this.treeLayer.remove(card);
    this.add.existing(card);
    card.prepareRecall();
    this.setupHandCard(card);
    card.setPosition(pointer.x, pointer.y);

    if (!this.handCards.includes(card)) {
      this.handCards.push(card);
    }
    this.input.setDraggable(card);
    this.relayoutEventCards(event);
    this.relayoutHand();
    this.updateFeelButtonState();
  }

  private placeCardOnEvent(card: CardSprite, event: EventCircle): void {
    const local = this.screenToTreeLocal(card.x, card.y);
    this.treeLayer.add(card);
    card.setPosition(local.x, local.y);

    const eventInstanceId = event.eventData.instanceId;
    const placed = this.placedCardsByEvent.get(eventInstanceId) ?? [];
    placed.push(card);
    this.placedCardsByEvent.set(eventInstanceId, placed);

    this.relayoutEventCards(event);
  }

  private relayoutEventCards(event: EventCircle): void {
    const placed = this.placedCardsByEvent.get(event.eventData.instanceId) ?? [];

    if (event.eventData.completed) {
      for (const card of placed) {
        card.setVisible(false);
        card.disableInteractive();
      }
      return;
    }

    const thisTurnCount = event.eventData.cardsPlacedThisTurn;
    const historyCount = Math.max(0, placed.length - thisTurnCount);
    const historyCards = placed.slice(0, historyCount);
    const turnCards = placed.slice(historyCount);
    const scale = event.placedCardScale;
    const eventInstanceId = event.eventData.instanceId;

    const historySlots = event.getHistoryCardPositions(historyCards.length);
    historyCards.forEach((card, index) => {
      const slot = historySlots[index];
      if (!slot) return;
      card.placeInEvent(slot.x, slot.y, eventInstanceId, scale, true);
    });

    const turnSlots = event.getTurnSlotPositions();
    turnCards.forEach((card, index) => {
      const slot = turnSlots[index];
      if (!slot) return;
      card.placeInEvent(slot.x, slot.y, eventInstanceId, scale, false);
      this.input.setDraggable(card);
    });
  }

  private showFlowerDetail(event: EventCircle): void {
    if (this.flowerDetailPopup || !event.eventData.completed) return;

    this.flowerDetailPopup = new FlowerDetailPopup(this, event.eventData, () => {
      this.flowerDetailPopup = null;
    });
  }

  private findEventAt(screenX: number, screenY: number): EventCircle | null {
    const local = this.screenToTreeLocal(screenX, screenY);

    for (const event of this.eventCircles) {
      if (event.containsPoint(local.x, local.y)) {
        return event;
      }
    }
    return null;
  }

  private removeFromHand(card: CardSprite): void {
    this.handCards = this.handCards.filter((c) => c !== card);
    this.relayoutHand();
  }

  private relayoutHand(): void {
    const maxScroll = this.getMaxHandScroll();
    this.handScrollX = Phaser.Math.Clamp(this.handScrollX, -maxScroll, maxScroll);

    const centerIndex = this.getHandCenterIndex();
    const wheelCenterX = GAME_WIDTH / 2;
    const wheelCenterY = HAND_Y + HAND_WHEEL.radius;

    this.handCards.forEach((card, index) => {
      const angleDeg =
        (index - centerIndex) * HAND_WHEEL.angleStepDeg + this.handScrollX;
      const angle = Phaser.Math.DegToRad(angleDeg);
      const x = wheelCenterX + HAND_WHEEL.radius * Math.sin(angle);
      const y = wheelCenterY - HAND_WHEEL.radius * Math.cos(angle);

      card.setHomePose(x, y, angle, HAND_CARD_SCALE);
      if (card !== this.draggingCard) {
        card.setPosition(x, y);
        card.setRotation(angle);
        card.setScale(HAND_CARD_SCALE);
        // Cards nearer the top center render above the ones curving away.
        card.setDepth(40 + Math.round(100 - Math.abs(angleDeg)));
      }
    });
  }

  private setupHandCard(card: CardSprite): void {
    card.setPreviewHandler(() => this.showCardPreview(card));
  }

  private showCardPreview(card: CardSprite): void {
    if (this.cardPreviewPopup || this.flowerDetailPopup || card.isPlaced) return;

    this.cardPreviewPopup = new CardPreviewPopup(this, card.cardData, () => {
      this.cardPreviewPopup = null;
    });
  }

  private addCardsToHand(aliases: CardAlias[]): void {
    const definitions = resolveRewardCards(aliases);
    for (const definition of definitions) {
      const instance = createCardInstance(definition);
      const card = new CardSprite(this, GAME_WIDTH / 2, HAND_Y, instance);
      this.setupHandCard(card);
      this.input.setDraggable(card);
      this.handCards.push(card);
    }

    const maxScroll = this.getMaxHandScroll();
    if (maxScroll > 0) {
      this.handScrollX = -maxScroll;
    }

    this.relayoutHand();
  }

  private processFeelings(): void {
    if (!this.canPressFeel()) return;

    const pendingBatches = this.eventManager.tickPendingSpawns((instanceId) =>
      this.eventCircles.find((circle) => circle.eventData.instanceId === instanceId)
        ?.eventData
    );
    for (const batch of pendingBatches) {
      const parentCircle = this.eventCircles.find(
        (circle) => circle.eventData.instanceId === batch.parent.instanceId
      );
      if (parentCircle) {
        this.spawnEvents(parentCircle, batch.children);
      }
    }

    this.autoAllocateApathyToOptionalEvents();

    const feltIds = new Set(
      findEventsWithFeelingsThisTurn(this.eventCircles).map(
        (event) => event.eventData.instanceId
      )
    );
    const completing = findEventsCompletingThisSentir(this.eventCircles);
    const completingIds = new Set(
      completing.map((item) => item.event.eventData.instanceId)
    );

    for (const event of this.eventCircles) {
      if (!feltIds.has(event.eventData.instanceId)) continue;
      if (completingIds.has(event.eventData.instanceId)) continue;
      this.grantEventRewardCards(event);
    }

    const completions: Array<{
      event: EventCircle;
      cause: (typeof completing)[number]['cause'];
      dealBreakerAlias?: string;
      selectedResults: EventResult[];
    }> = [];

    for (const item of completing) {
      const { event, cause, dealBreakerAlias } = item;
      event.eventData.completionCause = cause;
      if (dealBreakerAlias) {
        event.eventData.matchedDealBreakerAlias = dealBreakerAlias;
      }

      const selectedResults = selectEventResults(event.eventData);
      if (
        feltIds.has(event.eventData.instanceId) &&
        !shouldOverrideOutputsFromResults(selectedResults)
      ) {
        this.grantEventRewardCards(event);
      }

      completions.push({ event, cause, dealBreakerAlias, selectedResults });
    }

    this.eventCircles.forEach((event) => {
      event.resetTurnLimit();
      this.relayoutEventCards(event);
    });
    this.turnManager.advanceTurn();
    this.eventCircles.forEach((event) => event.tickTurn());

    for (const item of completions) {
      if (item.event.eventData.completed) continue;
      item.event.complete(item.cause, item.dealBreakerAlias);
      this.relayoutEventCards(item.event);
      this.executeResultActions(
        item.event,
        item.selectedResults.flatMap((result) => result.actions)
      );
    }

    this.ensureApathyHandForRequiredSlots();
    this.updateFeelButtonState();
    this.updateTurnDisplay();
    this.setHandScroll(0);
  }

  private grantEventRewardCards(event: EventCircle): void {
    const aliases = resolveEventOutputEmotions(event.eventData);
    if (aliases.length > 0) {
      this.addCardsToHand(aliases);
    }
  }

  private executeResultActions(
    parent: EventCircle,
    actions: EventAction[]
  ): void {
    const immediateTemplateIds: number[] = [];
    const emotionAliases: CardAlias[] = [];

    for (const action of actions) {
      if (action.type === 'createEmotion') {
        const emotions = Array.isArray(action.emotions)
          ? action.emotions
          : [action.emotions];
        emotionAliases.push(...emotions);
        continue;
      }

      if (action.type === 'generatePersonality') {
        this.generatePersonality(action.personality);
        continue;
      }

      if (action.type === 'endGame') {
        this.endGame();
        continue;
      }

      const templateId = Number(action.event);
      if (Number.isNaN(templateId)) continue;

      if (action.delay <= 0) {
        immediateTemplateIds.push(templateId);
      } else {
        this.eventManager.enqueueChildEvent(
          parent.eventData.instanceId,
          templateId,
          action.personality,
          action.delay
        );
      }
    }

    if (emotionAliases.length > 0) {
      this.addCardsToHand(emotionAliases);
    }

    if (immediateTemplateIds.length > 0) {
      const newEvents = this.eventManager.spawnChildEvents(
        parent.eventData,
        immediateTemplateIds
      );
      this.spawnEvents(parent, newEvents);
    }
  }

  generatePersonality(personalityAlias: string): void {
    if (!isCatalogPersonalityId(personalityAlias)) {
      console.warn(`generatePersonality: unknown alias "${personalityAlias}"`);
      return;
    }

    const alias = personalityAlias as PersonalityId;
    addPersonalityToSession(alias);

    if (this.personalityClouds.some((cloud) => cloud.getData('alias') === alias)) {
      return;
    }

    const index = this.personalityClouds.length;
    const cloud = new PersonalityCloud(
      this,
      70 + index * 130,
      70,
      alias
    );
    cloud.setData('alias', alias);
    cloud.setScrollFactor(0);
    this.personalityClouds.push(cloud);
  }

  endGame(): void {
    if (this.endGameOverlay) return;

    const overlay = this.add.container(0, 0).setDepth(200).setScrollFactor(0);

    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setInteractive();

    const panel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      340,
      200,
      0x2d3561
    );
    panel.setStrokeStyle(3, 0x66bb6a);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 48, 'Sucesso!', {
        fontSize: '28px',
        color: '#66bb6a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, 'Você descobriu uma personalidade.', {
        fontSize: '14px',
        color: '#c5cae9',
        align: 'center',
      })
      .setOrigin(0.5);

    const buttonBg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 52,
      120,
      44,
      0x43a047
    );
    buttonBg.setStrokeStyle(2, 0x66bb6a);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 52, 'YAY', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x66bb6a));
    buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x43a047));
    buttonBg.on('pointerdown', () => {
      this.scene.start('StartScene');
    });

    overlay.add([dim, panel, title, subtitle, buttonBg, buttonLabel]);
    this.endGameOverlay = overlay;

    overlay.setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 280,
      ease: 'Sine.easeOut',
    });
  }

  private restoreSessionPersonalities(): void {
    const session = loadGameSession();
    for (const alias of session.personalities) {
      this.generatePersonality(alias);
    }
  }
}
