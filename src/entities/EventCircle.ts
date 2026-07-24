import Phaser from 'phaser';
import { CARD_HEIGHT, CARD_WIDTH, EVENT_COLORS, EVENT_TREE } from '../config/gameConfig';
import { getCardByAlias } from '../data/cards';
import { resolveModifiedCardEnergy } from '../systems/resolveModifiedCardEnergy';
import { CardAlias, EventCompletionCause, GameEventInstance } from '../types';

const ENERGY_BAR_HEIGHT = 10;
const ENERGY_BAR_PADDING_X = 8;
const ENERGY_BAR_PADDING_TOP = 6;

export class EventCircle extends Phaser.GameObjects.Container {
  readonly eventData: GameEventInstance;
  private rect: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private turnsText: Phaser.GameObjects.Text | null = null;
  private energyBarBg: Phaser.GameObjects.Rectangle;
  private energyBarFill: Phaser.GameObjects.Rectangle;
  private energySecretText: Phaser.GameObjects.Text | null = null;
  private slotDots: Phaser.GameObjects.Arc[] = [];
  private slotRequiredMarkers: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, eventData: GameEventInstance) {
    super(scene, eventData.x, eventData.y);

    this.eventData = eventData;

    this.rect = scene.add.rectangle(0, 0, eventData.width, eventData.height);
    this.rect.setStrokeStyle(3, EVENT_COLORS.stroke);

    this.label = scene.add.text(0, -eventData.height / 2 - 16, eventData.label, {
      fontSize: '13px',
      color: '#ffffff',
      align: 'center',
    });
    this.label.setOrigin(0.5);

    const barWidth = eventData.width - ENERGY_BAR_PADDING_X * 2;
    const barY = -eventData.height / 2 + ENERGY_BAR_PADDING_TOP + ENERGY_BAR_HEIGHT / 2;

    this.energyBarBg = scene.add.rectangle(
      0,
      barY,
      barWidth,
      ENERGY_BAR_HEIGHT,
      EVENT_COLORS.energyBarBg
    );
    this.energyBarFill = scene.add.rectangle(
      -barWidth / 2,
      barY,
      barWidth,
      ENERGY_BAR_HEIGHT,
      EVENT_COLORS.energyBarFill
    );
    this.energyBarFill.setOrigin(0, 0.5);

    this.add([this.rect, this.label, this.energyBarBg, this.energyBarFill]);

    if (eventData.energyAmountSecret) {
      this.energySecretText = scene.add.text(0, barY, '?', {
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      this.energySecretText.setOrigin(0.5);
      this.add(this.energySecretText);
    }

    if (eventData.autoComplete > 0) {
      this.turnsText = scene.add.text(
        -eventData.width / 2 + 6,
        eventData.height / 2 - 6,
        '',
        {
          fontSize: '11px',
          color: '#ffe082',
          fontStyle: 'bold',
        }
      );
      this.turnsText.setOrigin(0, 1);
      this.add(this.turnsText);
      this.refreshTurnsText();
    }

    this.createSlotDots(scene);
    this.updateEnergyBar();
    this.updateVisualState();
    this.refreshSlotDots();

    this.setDepth(20);
    scene.add.existing(this);
  }

  containsPoint(x: number, y: number): boolean {
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
    this.eventData.progress += energy;
    this.eventData.cardsPlacedThisTurn += 1;
    this.refreshSlotDots();
    this.updateEnergyBar();
    this.updateVisualState();
  }

  /** Removes a this-turn card by index in placedCardAliases. History cards cannot be removed. */
  removeCardAt(index: number): boolean {
    const { placedCardAliases, cardsPlacedThisTurn } = this.eventData;
    const historyCount = placedCardAliases.length - cardsPlacedThisTurn;

    if (index < historyCount || index >= placedCardAliases.length) {
      return false;
    }

    const [alias] = placedCardAliases.splice(index, 1);
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
    this.updateVisualState();
    this.refreshSlotDots();
    this.refreshTurnsText();
    this.updateEnergyBar();
  }

  /** True when this event still needs a required card allocation this turn. */
  needsRequiredCard(): boolean {
    return (
      !this.eventData.completed &&
      this.eventData.cardsRequired &&
      this.eventData.cardsPlacedThisTurn < this.eventData.cardsPerTurn
    );
  }

  private createSlotDots(scene: Phaser.Scene): void {
    const radius = EVENT_TREE.slotDotRadius;

    for (const slot of this.getLocalTurnSlotPositions()) {
      const dot = scene.add.circle(slot.x, slot.y, radius);
      dot.setStrokeStyle(2, EVENT_COLORS.slotDot);
      dot.setFillStyle(EVENT_COLORS.slotDot, 0);
      this.slotDots.push(dot);
      this.add(dot);

      if (this.eventData.cardsRequired) {
        const marker = scene.add.text(slot.x, slot.y, '!', {
          fontSize: '14px',
          color: '#ef5350',
          fontStyle: 'bold',
        });
        marker.setOrigin(0.5);
        this.slotRequiredMarkers.push(marker);
        this.add(marker);
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
        dot.setFillStyle(EVENT_COLORS.slotDotFilled, 1);
        dot.setStrokeStyle(2, EVENT_COLORS.slotDotFilled);
        marker?.setVisible(false);
        return;
      }

      if (required) {
        dot.setFillStyle(EVENT_COLORS.slotRequired, 0);
        dot.setStrokeStyle(2, EVENT_COLORS.slotRequired);
        marker?.setVisible(true);
      } else {
        dot.setFillStyle(EVENT_COLORS.slotDot, 0);
        dot.setStrokeStyle(2, EVENT_COLORS.slotDot);
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
    const barWidth = this.eventData.width - ENERGY_BAR_PADDING_X * 2;

    this.energyBarBg.setVisible(true);

    if (this.eventData.energyAmountSecret && !this.eventData.completed) {
      this.energyBarBg.setFillStyle(EVENT_COLORS.energyBarSecret);
      this.energyBarFill.width = 0;
      this.energyBarFill.setVisible(false);
      this.energySecretText?.setVisible(true);
      return;
    }

    this.energySecretText?.setVisible(false);
    this.energyBarBg.setFillStyle(EVENT_COLORS.energyBarBg);

    const ratio = Phaser.Math.Clamp(
      this.eventData.progress / Math.max(1, this.eventData.energyAmount),
      0,
      1
    );

    this.energyBarFill.width = barWidth * ratio;
    this.energyBarFill.setVisible(true);

    if (this.isReadyToProcess() || this.eventData.completed) {
      this.energyBarFill.setFillStyle(EVENT_COLORS.ready);
    } else {
      this.energyBarFill.setFillStyle(EVENT_COLORS.energyBarFill);
    }
  }

  private updateVisualState(): void {
    if (this.eventData.completed) {
      this.rect.setFillStyle(EVENT_COLORS.completed, 1);
      this.rect.setStrokeStyle(3, EVENT_COLORS.completedStroke);
      return;
    }

    const showReady =
      this.isReadyToProcess() && !this.eventData.energyAmountSecret;
    const stroke = showReady ? EVENT_COLORS.ready : EVENT_COLORS.stroke;

    if (this.isTurnLimitReached()) {
      this.rect.setFillStyle(EVENT_COLORS.fill, 1);
      this.rect.setStrokeStyle(3, stroke);
      return;
    }

    this.rect.setFillStyle(EVENT_COLORS.fill, 0);
    this.rect.setStrokeStyle(3, stroke);
  }
}
