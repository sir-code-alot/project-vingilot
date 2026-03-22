/**
 * Visual effects for pulse and explosive weapons.
 * Performant: a few canvas draws per effect, no particle systems.
 */
import type { Vec2 } from "./vec2.js";
import { CONFIG } from "./constants.js";

export type ExplosionEffect = {
  type: "explosion";
  position: Vec2;
  radius: number;
  createdAt: number;
  duration: number;
};

export type PulseEffect = {
  type: "pulse";
  position: Vec2;
  radius: number;
  createdAt: number;
  duration: number;
};

export type ConePulseEffect = {
  type: "conePulse";
  position: Vec2;
  angle: number; // center direction (radians)
  halfAngle: number;
  range: number;
  createdAt: number;
  duration: number;
};

export type GameEffect = ExplosionEffect | PulseEffect | ConePulseEffect;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Normalized progress 0..1 and alpha (1 → 0) for a given effect age. */
function effectProgress(createdAt: number, duration: number, now: number): { t: number; alpha: number } {
  const age = now - createdAt;
  const t = Math.min(1, age / duration);
  const alpha = 1 - easeOutQuad(t); // fade out toward end
  return { t, alpha };
}

export function createExplosion(position: Vec2, radius: number, now: number): ExplosionEffect {
  return {
    type: "explosion",
    position: { ...position },
    radius,
    createdAt: now,
    duration: CONFIG.effectExplosionDuration,
  };
}

export function createPulse(position: Vec2, radius: number, now: number): PulseEffect {
  return {
    type: "pulse",
    position: { ...position },
    radius,
    createdAt: now,
    duration: CONFIG.effectPulseDuration,
  };
}

export function createConePulse(
  position: Vec2,
  angle: number,
  halfAngle: number,
  range: number,
  now: number
): ConePulseEffect {
  return {
    type: "conePulse",
    position: { ...position },
    angle,
    halfAngle,
    range,
    createdAt: now,
    duration: CONFIG.effectPulseDuration,
  };
}

export function isEffectAlive(e: GameEffect, now: number): boolean {
  return now - e.createdAt < e.duration;
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  e: ExplosionEffect,
  now: number
): void {
  const { t, alpha } = effectProgress(e.createdAt, e.duration, now);
  const expansion = easeOutCubic(t); // 0 → 1
  const currentRadius = e.radius * (0.3 + 0.95 * expansion); // start slightly in, expand to ~1.25x

  const x = e.position.x;
  const y = e.position.y;

  // Core: bright white-orange glow that shrinks and fades
  const coreRadius = currentRadius * 0.35 * (1 - t * 0.7);
  const coreGradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, coreRadius
  );
  coreGradient.addColorStop(0, `rgba(255, 248, 220, ${0.95 * alpha})`);
  coreGradient.addColorStop(0.4, `rgba(255, 180, 80, ${0.6 * alpha})`);
  coreGradient.addColorStop(1, "rgba(255, 100, 0, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();
  ctx.restore();

  // Shockwave ring: expands quickly, fades
  const ringRadius = currentRadius * (0.6 + 0.5 * expansion);
  const ringAlpha = alpha * (1 - expansion) * 0.9; // strongest when small
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 220, 150, ${ringAlpha})`;
  ctx.lineWidth = Math.max(1, 4 * (1 - expansion));
  ctx.stroke();
  ctx.restore();

  // Outer glow: soft orange halo
  const haloGradient = ctx.createRadialGradient(
    x, y, currentRadius * 0.2,
    x, y, currentRadius * 1.1
  );
  haloGradient.addColorStop(0, `rgba(255, 140, 60, ${0.25 * alpha})`);
  haloGradient.addColorStop(0.6, `rgba(200, 80, 20, ${0.08 * alpha})`);
  haloGradient.addColorStop(1, "rgba(150, 50, 0, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, currentRadius * 1.15, 0, Math.PI * 2);
  ctx.fillStyle = haloGradient;
  ctx.fill();
  ctx.restore();
}

export function drawPulse(
  ctx: CanvasRenderingContext2D,
  e: PulseEffect,
  now: number
): void {
  const { t, alpha } = effectProgress(e.createdAt, e.duration, now);
  const expansion = easeOutCubic(t);
  const currentRadius = e.radius * (0.05 + 0.95 * expansion);

  const x = e.position.x;
  const y = e.position.y;

  // Double ring: sci-fi pulse wave
  const ringAlpha = alpha * 0.85;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(100, 200, 255, ${ringAlpha})`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Inner ring (slightly smaller, brighter)
  const innerRadius = currentRadius * 0.88;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180, 230, 255, ${ringAlpha * 0.7})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Soft fill: very subtle cyan glow inside
  const fillGradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, currentRadius
  );
  fillGradient.addColorStop(0, `rgba(120, 200, 255, ${0.12 * alpha})`);
  fillGradient.addColorStop(0.5, `rgba(80, 160, 220, ${0.04 * alpha})`);
  fillGradient.addColorStop(1, "rgba(60, 120, 200, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
  ctx.fillStyle = fillGradient;
  ctx.fill();
  ctx.restore();
}

export function drawConePulse(
  ctx: CanvasRenderingContext2D,
  e: ConePulseEffect,
  now: number
): void {
  const { t, alpha } = effectProgress(e.createdAt, e.duration, now);
  const expansion = easeOutCubic(t);
  const currentRange = e.range * (0.05 + 0.95 * expansion);

  const x = e.position.x;
  const y = e.position.y;
  const a1 = e.angle - e.halfAngle;
  const a2 = e.angle + e.halfAngle;

  // Wedge path: center -> arc at currentRange
  const r = currentRange;
  const x1 = x + Math.cos(a1) * r;
  const y1 = y + Math.sin(a1) * r;
  const x2 = x + Math.cos(a2) * r;
  const y2 = y + Math.sin(a2) * r;

  const wedgeAlpha = alpha * 0.8;
  const gradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, currentRange
  );
  gradient.addColorStop(0, `rgba(140, 180, 255, ${0.35 * wedgeAlpha})`);
  gradient.addColorStop(0.4, `rgba(100, 160, 240, ${0.15 * wedgeAlpha})`);
  gradient.addColorStop(0.85, `rgba(80, 120, 220, ${0.04 * wedgeAlpha})`);
  gradient.addColorStop(1, "rgba(60, 100, 200, 0)");

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.arc(x, y, currentRange, a1, a2);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // Sharp leading edge: bright line along the cone sides
  ctx.save();
  ctx.strokeStyle = `rgba(180, 220, 255, ${wedgeAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function drawEffect(
  ctx: CanvasRenderingContext2D,
  effect: GameEffect,
  now: number
): void {
  if (effect.type === "explosion") drawExplosion(ctx, effect, now);
  else if (effect.type === "pulse") drawPulse(ctx, effect, now);
  else drawConePulse(ctx, effect, now);
}
