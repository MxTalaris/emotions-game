import Phaser from 'phaser';
import { EVENT_COLORS } from '../config/gameConfig';

export type Point = { x: number; y: number };

export type SeedStyle = {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeWidth?: number;
};

export type FlowerStyle = {
  petal: number;
  petalAlt: number;
  center: number;
  stroke: number;
};

const DEFAULT_FLOWER: FlowerStyle = {
  petal: EVENT_COLORS.flowerPetal,
  petalAlt: EVENT_COLORS.flowerPetalAlt,
  center: EVENT_COLORS.flowerCenter,
  stroke: EVENT_COLORS.completedStroke,
};

/** Oval seed with a pointed tip, centered at origin. */
export function drawSeed(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  style: SeedStyle
): void {
  const bodyW = width * 0.72;
  const bodyH = height * 0.78;
  const tipH = height * 0.18;

  g.fillStyle(style.fill, style.fillAlpha);
  g.lineStyle(style.strokeWidth ?? 3, style.stroke, 1);

  // Pointed tip
  g.beginPath();
  g.moveTo(0, -bodyH / 2 - tipH);
  g.lineTo(bodyW * 0.22, -bodyH / 2 + 2);
  g.lineTo(-bodyW * 0.22, -bodyH / 2 + 2);
  g.closePath();
  g.fillPath();
  g.strokePath();

  g.fillEllipse(0, tipH * 0.15, bodyW, bodyH);
  g.strokeEllipse(0, tipH * 0.15, bodyW, bodyH);

  g.lineStyle(1.5, style.stroke, 0.35);
  g.lineBetween(0, -bodyH / 2 + 4, 0, bodyH * 0.28);
}

/** Simple flower with alternating petals, centered at origin. */
export function drawFlower(
  g: Phaser.GameObjects.Graphics,
  radius: number,
  style: FlowerStyle = DEFAULT_FLOWER,
  petalScale = 1
): void {
  const petalCount = 6;
  const petalW = radius * 0.38 * petalScale;
  const petalH = radius * 0.7 * petalScale;
  const petalOffset = radius * 0.36 * petalScale;

  for (let i = 0; i < petalCount; i += 1) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const color = i % 2 === 0 ? style.petal : style.petalAlt;

    g.save();
    g.rotateCanvas(angle);
    g.fillStyle(color, 1);
    g.lineStyle(1.5, style.stroke, 0.7);
    g.fillEllipse(0, -petalOffset, petalW, petalH);
    g.strokeEllipse(0, -petalOffset, petalW, petalH);
    g.restore();
  }

  const centerR = radius * 0.32 * petalScale;
  g.fillStyle(style.center, 1);
  g.lineStyle(2, style.stroke, 0.85);
  g.fillCircle(0, 0, centerR);
  g.strokeCircle(0, 0, centerR);
}

/**
 * Cubic Bezier from parent attachment (top of parent) toward child
 * attachment (bottom of child). Tree grows upward.
 */
export function buildBranchCurve(
  from: Point,
  to: Point
): [Point, Point, Point, Point] {
  const midY = (from.y + to.y) / 2;
  const sway = (to.x - from.x) * 0.18;

  return [
    from,
    { x: from.x + sway, y: midY },
    { x: to.x - sway, y: midY },
    to,
  ];
}

export function sampleCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/** Stroke a cubic Bezier up to progress t (0..1) with chord segments. */
export function strokeCubicProgress(
  g: Phaser.GameObjects.Graphics,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  progress: number,
  segments = 28
): void {
  const tMax = Phaser.Math.Clamp(progress, 0, 1);
  if (tMax <= 0) return;

  const steps = Math.max(2, Math.ceil(segments * tMax));
  g.beginPath();
  const start = sampleCubicBezier(p0, p1, p2, p3, 0);
  g.moveTo(start.x, start.y);

  for (let i = 1; i <= steps; i += 1) {
    const t = (i / steps) * tMax;
    const p = sampleCubicBezier(p0, p1, p2, p3, t);
    g.lineTo(p.x, p.y);
  }
  g.strokePath();
}

export function drawSkyGroundBackground(
  scene: Phaser.Scene,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(-1).setScrollFactor(0);
  const bands = 10;

  for (let i = 0; i < bands; i += 1) {
    const t = i / (bands - 1);
    const y0 = (height / bands) * i;
    const bandH = height / bands + 1;
    const color =
      t < 0.45
        ? Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.IntegerToColor(EVENT_COLORS.skyTop),
            Phaser.Display.Color.IntegerToColor(EVENT_COLORS.skyMid),
            100,
            Math.round((t / 0.45) * 100)
          )
        : Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.IntegerToColor(EVENT_COLORS.skyMid),
            Phaser.Display.Color.IntegerToColor(EVENT_COLORS.ground),
            100,
            Math.round(((t - 0.45) / 0.55) * 100)
          );

    const hex =
      (Math.round(color.r) << 16) +
      (Math.round(color.g) << 8) +
      Math.round(color.b);
    g.fillStyle(hex, 1);
    g.fillRect(0, y0, width, bandH);
  }

  return g;
}
