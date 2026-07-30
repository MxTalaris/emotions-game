import Phaser from 'phaser';
import { CARD_HEIGHT, CARD_WIDTH, EVENT_COLORS, EVENT_TREE } from '../config/gameConfig';
import { getCardByAlias } from '../data/cards';
import { resolveModifiedCardEnergy } from '../systems/resolveModifiedCardEnergy';
import { CardAlias, EventCompletionCause, GameEventInstance } from '../types';
import { ResolvedEventColors } from '../types/Theme';
import { drawFlower, drawSeed, FlowerStyle } from '../utils/gardenGraphics';
import { domBoxLabel, domText, DomTextHandle } from '../utils/domUi';

const ENERGY_BAR_HEIGHT = 10;
const ENERGY_BAR_PADDING_X = 8;
const ENERGY_BAR_PADDING_TOP = 6;

function defaultEventColors(): ResolvedEventColors {
  return {
    fill: EVENT_COLORS.fill,
    stroke: EVENT_COLORS.stroke,
    completed: EVENT_COLORS.completed,
    completedStroke: EVENT_COLORS.completedStroke,
    flowerCenter: EVENT_COLORS.flowerCenter,
    flowerPetal: EVENT_COLORS.flowerPetal,
    flowerPetalAlt: EVENT_COLORS.flowerPetalAlt,
    ready: EVENT_COLORS.ready,
    connector: EVENT_COLORS.connector,
    slotDot: EVENT_COLORS.slotDot,
    slotDotFilled: EVENT_COLORS.slotDotFilled,
    slotRequired: EVENT_COLORS.slotRequired,
    energyBarBg: EVENT_COLORS.energyBarBg,
    energyBarFill: EVENT_COLORS.energyBarFill,
    energyBarSecret: EVENT_COLORS.energyBarSecret,
  };
}

export class EventCircle extends Phaser.GameObjects.Container {
  readonly eventData: GameEventInstance;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private label: DomTextHandle;
  private turnsText: DomTextHandle | null = null;
  private energyBarBg: Phaser.GameObjects.Rectangle;
  private energyBarFill: Phaser.GameObjects.Rectangle;
  private energySecretText: DomTextHandle | null = null;
  private slotDots: Phaser.GameObjects.Arc[] = [];
  private slotRequiredMarkers: DomTextHandle[] = [];
  private bloomProgress = 0;
  private blooming = false;
  private themeColors: ResolvedEventColors = defaultEventColors();

  constructor(scene: Phaser.Scene, eventData: GameEventInstance, themeColors?: ResolvedEventColors) {
    super(scene, eventData.x, eventData.y);

    this.eventData = eventData;
    if (themeColors) {
      this.themeColors = themeColors;
    }

    this.bodyGfx = scene.add.graphics();

    const labelWidth = eventData.width + 40;

    this.label = domText(
      scene,
      eventData.label,
      {
        fontSize: '13px',
        color: '#3d3428',
        fontWeight: 'bold',
        textAlign: 'center',
        width: `${labelWidth}px`,
        wordBreak: 'break-word',
      },
      {
        x: 0,
        y: -eventData.height / 2 - 16,
        originX: 0.5,
        originY: 0.5,
      }
    );

    const barWidth = eventData.width - ENERGY_BAR_PADDING_X * 2;
    const barY = -eventData.height / 2 + ENERGY_BAR_PADDING_TOP + ENERGY_BAR_HEIGHT / 2;

    this.energyBarBg = scene.add.rectangle(
      0,
      barY,
      barWidth,
      ENERGY_BAR_HEIGHT,
      this.themeColors.energyBarBg
    );
    this.energyBarFill = scene.add.rectangle(
      -barWidth / 2,
      barY,
      barWidth,
      ENERGY_BAR_HEIGHT,
      this.themeColors.energyBarFill
    );
    this.energyBarFill.setOrigin(0, 0.5);

    this.add([this.bodyGfx, this.label.dom, this.energyBarBg, this.energyBarFill]);

    if (eventData.energyAmountSecret) {
      this.energySecretText = domBoxLabel(scene, '?', barWidth, ENERGY_BAR_HEIGHT, {
        fontSize: '11px',
        color: '#ffffff',
        fontWeight: 'bold',
      }, { x: 0, y: barY });
      this.add(this.energySecretText.dom);
    }

    if (eventData.autoComplete > 0) {
      this.turnsText = domText(
        scene,
        '',
        {
          fontSize: '11px',
          color: '#6b4f2e',
          fontWeight: 'bold',
          textAlign: 'left',
        },
        {
          x: -eventData.width / 2 + 6,
          y: eventData.height / 2 - 6,
          originX: 0,
          originY: 1,
        }
      );
      this.add(this.turnsText.dom);
      this.refreshTurnsText();
    }

    this.createSlotDots(scene);
    this.updateEnergyBar();
    this.updateVisualState();
    this.refreshSlotDots();

    this.setDepth(20);
    scene.add.existing(this);
  }

  applyTheme(themeColors: ResolvedEventColors): void {
    this.themeColors = themeColors;
    this.refreshSlotDots();
    this.updateEnergyBar();
    this.updateVisualState();
  }

  private getFlowerStyle(): FlowerStyle {
    return {
      petal: this.themeColors.flowerPetal,
      petalAlt: this.themeColors.flowerPetalAlt,
      center: this.themeColors.flowerCenter,
      stroke: this.themeColors.completedStroke,
    };
  }

  /** Fade/scale-in when a branch finishes growing to this seed. */
  playSeedReveal(): void {
    this.setScale(0.2);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: EVENT_TREE.seedRevealMs,
      ease: 'Back.easeOut',
    });
  }

  containsPoint(x: number, y: number): boolean {
    if (this.eventData.completed) {
      const radius = this.getFlowerHitRadius();
      const dx = x - this.eventData.x;
      const dy = y - this.eventData.y;
      return dx * dx + dy * dy <= radius * radius;
    }

    const halfH = this.eventData.height / 2;
    const top = this.eventData.y - halfH;
    const bottom = this.getCardSlotsBottom();
    const historyCount = Math.max(
      0,
      this.eventData.placedCardAliases.length - this.eventData.cardsPlacedThisTurn
    );
    const stripWidth = Math.max(
      this.getCardStripWidth(this.eventData.cardsPerTurn),
      this.getCardStripWidth(historyCount)
    );
    const halfW = Math.max(this.eventData.width / 2, stripWidth / 2);

    return (
      x >= this.eventData.x - halfW &&
      x <= this.eventData.x + halfW &&
      y >= top &&
      y <= bottom
    );
  }

  /** Slot positions for cards allocated this turn (matches the outline dots). */
  getTurnSlotPositions(): Array<{ x: number; y: number }> {
    return this.toWorldPositions(this.getLocalTurnSlotPositions());
  }

  /** Positions for cards kept from previous turns, above the turn slots. */
  getHistoryCardPositions(count: number): Array<{ x: number; y: number }> {
    if (count <= 0) return [];

    const scale = EVENT_TREE.placedCardScale;
    const cardW = CARD_WIDTH * scale;
    const cardH = CARD_HEIGHT * scale;
    const gap = EVENT_TREE.placedCardGap;
    const turnSlots = this.getLocalTurnSlotPositions();
    const turnY = turnSlots[0]?.y ?? this.getTurnSlotY(cardH);
    const y = turnY - cardH - gap;
    const totalWidth = this.getCardStripWidth(count);
    const startX = -totalWidth / 2 + cardW / 2;

    return this.toWorldPositions(
      Array.from({ length: count }, (_, index) => ({
        x: startX + index * (cardW + gap),
        y,
      }))
    );
  }

  get placedCardScale(): number {
    return EVENT_TREE.placedCardScale;
  }

  canAcceptCard(): boolean {
    if (this.eventData.completed) return false;
    return this.eventData.cardsPlacedThisTurn < this.eventData.cardsPerTurn;
  }

  isTurnLimitReached(): boolean {
    return this.eventData.cardsPlacedThisTurn >= this.eventData.cardsPerTurn;
  }

  addCard(alias: CardAlias): void {
    if (!this.canAcceptCard()) return;

    const card = getCardByAlias(alias);
    const energy = resolveModifiedCardEnergy(card, this.eventData.modifiers);

    this.eventData.placedCardAliases.push(alias);
    this.eventData.thisTurnPlacedCardAliases.push(alias);
    this.eventData.progress += energy;
    this.eventData.cardsPlacedThisTurn += 1;
    this.refreshSlotDots();
    this.updateEnergyBar();
    this.updateVisualState();
  }

  /** Removes a this-turn card by index in placedCardAliases. History cards cannot be removed. */
  removeCardAt(index: number): boolean {
    const { placedCardAliases, cardsPlacedThisTurn, thisTurnPlacedCardAliases } =
      this.eventData;
    const historyCount = placedCardAliases.length - cardsPlacedThisTurn;

    if (index < historyCount || index >= placedCardAliases.length) {
      return false;
    }

    const turnIndex = index - historyCount;
    const [alias] = placedCardAliases.splice(index, 1);
    thisTurnPlacedCardAliases.splice(turnIndex, 1);
    const card = getCardByAlias(alias);
    const energy = resolveModifiedCardEnergy(card, this.eventData.modifiers);

    this.eventData.progress = Math.max(0, this.eventData.progress - energy);
    this.eventData.cardsPlacedThisTurn = Math.max(
      0,
      this.eventData.cardsPlacedThisTurn - 1
    );
    this.refreshSlotDots();
    this.updateEnergyBar();
    this.updateVisualState();
    return true;
  }

  resetTurnLimit(): void {
    this.eventData.cardsPlacedThisTurn = 0;
    this.eventData.thisTurnPlacedCardAliases = [];
    this.refreshSlotDots();
    this.updateVisualState();
  }

  tickTurn(): void {
    if (this.eventData.completed) return;
    this.eventData.turnsAlive += 1;
    this.refreshTurnsText();
  }

  shouldAutoComplete(): boolean {
    const turns = this.eventData.autoComplete;
    return (
      turns > 0 &&
      !this.eventData.completed &&
      this.eventData.turnsAlive >= turns
    );
  }

  isReadyToProcess(): boolean {
    return (
      !this.eventData.completed &&
      this.eventData.progress >= this.eventData.energyAmount
    );
  }

  complete(cause: EventCompletionCause = 'energy', dealBreakerAlias?: string): void {
    if (this.eventData.completed) return;

    this.eventData.completed = true;
    this.eventData.completionCause = cause;
    if (dealBreakerAlias) {
      this.eventData.matchedDealBreakerAlias = dealBreakerAlias;
    }
    this.applyCompletedPresentation();
    this.playBloom();
  }

  getFlowerHitRadius(): number {
    return Math.max(this.eventData.width, this.eventData.height) * EVENT_TREE.flowerRadiusScale;
  }

  /** True when this event still needs a required card allocation this turn. */
  needsRequiredCard(): boolean {
    return (
      !this.eventData.completed &&
      this.eventData.cardsRequired &&
      this.eventData.cardsPlacedThisTurn < this.eventData.cardsPerTurn
    );
  }

  private applyCompletedPresentation(): void {
    this.energyBarBg.setVisible(false);
    this.energyBarFill.setVisible(false);
    this.energySecretText?.setVisible(false);
    this.turnsText?.setVisible(false);
    this.slotDots.forEach((dot) => dot.setVisible(false));
    this.slotRequiredMarkers.forEach((marker) => marker.setVisible(false));

    const flowerRadius = this.getFlowerHitRadius();
    this.label.dom.setPosition(0, -flowerRadius - 14);
    this.label.element.style.color = '#3d3428';
  }

  private playBloom(): void {
    if (this.blooming) return;
    this.blooming = true;
    this.bloomProgress = 0;

    const bloom = { progress: 0 };
    this.scene.tweens.add({
      targets: bloom,
      progress: 1,
      duration: EVENT_TREE.flowerBloomMs,
      ease: 'Back.easeOut',
      onUpdate: () => {
        this.bloomProgress = bloom.progress;
        this.redrawBody();
      },
      onComplete: () => {
        this.blooming = false;
        this.bloomProgress = 1;
        this.redrawBody();
      },
    });
  }

  private createSlotDots(scene: Phaser.Scene): void {
    const radius = EVENT_TREE.slotDotRadius;

    for (const slot of this.getLocalTurnSlotPositions()) {
      const dot = scene.add.circle(slot.x, slot.y, radius);
      dot.setStrokeStyle(2, this.themeColors.slotDot);
      dot.setFillStyle(this.themeColors.slotDot, 0);
      this.slotDots.push(dot);
      this.add(dot);

      if (this.eventData.cardsRequired) {
        const marker = domBoxLabel(
          scene,
          '!',
          EVENT_TREE.slotDotRadius * 4,
          EVENT_TREE.slotDotRadius * 4,
          {
            fontSize: '14px',
            color: '#ef5350',
            fontWeight: 'bold',
          },
          { x: slot.x, y: slot.y }
        );
        this.slotRequiredMarkers.push(marker);
        this.add(marker.dom);
      }
    }
  }

  private getTurnSlotY(cardH: number): number {
    return this.eventData.height / 2 + EVENT_TREE.placedCardOffsetY + cardH / 2;
  }

  private getLocalTurnSlotPositions(): Array<{ x: number; y: number }> {
    const count = this.eventData.cardsPerTurn;
    if (count <= 0) return [];

    const scale = EVENT_TREE.placedCardScale;
    const cardW = CARD_WIDTH * scale;
    const cardH = CARD_HEIGHT * scale;
    const gap = EVENT_TREE.placedCardGap;
    const y = this.getTurnSlotY(cardH);
    const totalWidth = this.getCardStripWidth(count);
    const startX = -totalWidth / 2 + cardW / 2;

    return Array.from({ length: count }, (_, index) => ({
      x: startX + index * (cardW + gap),
      y,
    }));
  }

  private toWorldPositions(
    locals: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> {
    return locals.map((slot) => ({
      x: this.eventData.x + slot.x,
      y: this.eventData.y + slot.y,
    }));
  }

  private getCardStripWidth(count: number): number {
    if (count <= 0) return 0;
    const cardW = CARD_WIDTH * EVENT_TREE.placedCardScale;
    return count * cardW + Math.max(0, count - 1) * EVENT_TREE.placedCardGap;
  }

  private getCardSlotsBottom(): number {
    const cardH = CARD_HEIGHT * EVENT_TREE.placedCardScale;
    const halfH = this.eventData.height / 2;
    return this.eventData.y + halfH + EVENT_TREE.placedCardOffsetY + cardH;
  }

  private refreshSlotDots(): void {
    if (this.eventData.completed) {
      this.slotDots.forEach((dot) => dot.setVisible(false));
      this.slotRequiredMarkers.forEach((marker) => marker.setVisible(false));
      return;
    }

    const filled = this.eventData.cardsPlacedThisTurn;
    const required = this.eventData.cardsRequired;

    this.slotDots.forEach((dot, index) => {
      dot.setVisible(true);
      const marker = this.slotRequiredMarkers[index];

      if (index < filled) {
        dot.setFillStyle(this.themeColors.slotDotFilled, 1);
        dot.setStrokeStyle(2, this.themeColors.slotDotFilled);
        marker?.setVisible(false);
        return;
      }

      if (required) {
        dot.setFillStyle(this.themeColors.slotRequired, 0);
        dot.setStrokeStyle(2, this.themeColors.slotRequired);
        marker?.setVisible(true);
      } else {
        dot.setFillStyle(this.themeColors.slotDot, 0);
        dot.setStrokeStyle(2, this.themeColors.slotDot);
        marker?.setVisible(false);
      }
    });
  }

  private refreshTurnsText(): void {
    if (!this.turnsText) return;

    if (this.eventData.completed || this.eventData.autoComplete <= 0) {
      this.turnsText.setVisible(false);
      return;
    }

    const current = Math.min(
      this.eventData.turnsAlive + 1,
      this.eventData.autoComplete
    );
    const total = this.eventData.autoCompleteSecret
      ? '?'
      : String(this.eventData.autoComplete);

    this.turnsText.setVisible(true);
    this.turnsText.setText(`${current}/${total}`);
  }

  private updateEnergyBar(): void {
    if (this.eventData.completed) {
      this.energyBarBg.setVisible(false);
      this.energyBarFill.setVisible(false);
      this.energySecretText?.setVisible(false);
      return;
    }

    const barWidth = this.eventData.width - ENERGY_BAR_PADDING_X * 2;

    this.energyBarBg.setVisible(true);

    if (this.eventData.energyAmountSecret) {
      this.energyBarBg.setFillStyle(this.themeColors.energyBarSecret);
      this.energyBarFill.width = 0;
      this.energyBarFill.setVisible(false);
      this.energySecretText?.setVisible(true);
      return;
    }

    this.energySecretText?.setVisible(false);
    this.energyBarBg.setFillStyle(this.themeColors.energyBarBg);

    const ratio = Phaser.Math.Clamp(
      this.eventData.progress / Math.max(1, this.eventData.energyAmount),
      0,
      1
    );

    this.energyBarFill.width = barWidth * ratio;
    this.energyBarFill.setVisible(true);

    if (this.isReadyToProcess()) {
      this.energyBarFill.setFillStyle(this.themeColors.ready);
    } else {
      this.energyBarFill.setFillStyle(this.themeColors.energyBarFill);
    }
  }

  private updateVisualState(): void {
    this.redrawBody();
  }

  private redrawBody(): void {
    const { width, height, completed } = this.eventData;
    this.bodyGfx.clear();

    if (completed || this.blooming) {
      const seedAlpha = Math.max(0, 1 - this.bloomProgress * 1.4);
      if (seedAlpha > 0.02) {
        drawSeed(this.bodyGfx, width, height, {
          fill: this.themeColors.fill,
          fillAlpha: seedAlpha * 0.85,
          stroke: this.themeColors.stroke,
        });
      }

      const flowerRadius =
        Math.max(width, height) * EVENT_TREE.flowerRadiusScale;
      const petalScale = Phaser.Math.Clamp(this.bloomProgress, 0.05, 1.12);
      drawFlower(this.bodyGfx, flowerRadius, this.getFlowerStyle(), petalScale);
      return;
    }

    const showReady =
      this.isReadyToProcess() && !this.eventData.energyAmountSecret;
    const stroke = showReady ? this.themeColors.ready : this.themeColors.stroke;
    const fillAlpha = this.isTurnLimitReached() ? 1 : 0.35;

    drawSeed(this.bodyGfx, width, height, {
      fill: this.themeColors.fill,
      fillAlpha,
      stroke,
    });
  }
}
