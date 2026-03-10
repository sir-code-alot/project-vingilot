/**
 * Projektiler och vapeneffekter – bullet, rocket, bomb, mine, laser.
 * Pulse och conePulse hanteras direkt i game (omedelbar skada).
 */
import type { Vec2 } from "./vec2.js";
import { add, scale, fromAngle } from "./vec2.js";
import { CONFIG } from "./constants.js";
import type { Circle } from "./collision.js";
import type { Ship } from "./entities/ship.js";
import type { Weapon } from "./weapon.js";
import type { Asteroid } from "./entities/asteroid.js";

/** Projektil – bullet eller rocket (räkna som skott). */
export interface Projectile {
  type: "bullet" | "rocket";
  position: Vec2;
  prevPosition: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  lifetime: number;
  weaponIndex: number;
  weaponKind: string;
}

/** Bomb – släpps, exploderar efter fuse. */
export interface Bomb {
  type: "bomb";
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  explosionRadius: number;
  fuse: number;
  weaponIndex: number;
}

/** Mina – släpps, triggas av asteroid inom radie. */
export interface Mine {
  type: "mine";
  position: Vec2;
  radius: number;
  damage: number;
  explosionRadius: number;
  triggerRadius: number;
  weaponIndex: number;
}

/** Laser – linje som existerar kort. */
export interface LaserLine {
  type: "laser";
  start: Vec2;
  end: Vec2;
  damage: number;
  lifetime: number;
  weaponIndex: number;
}

export type ProjectileEntity = Projectile | Bomb | Mine | LaserLine;

function wrapPos(pos: Vec2, margin: number, w: number, h: number): void {
  if (pos.x < -margin) pos.x = w + margin;
  if (pos.x > w + margin) pos.x = -margin;
  if (pos.y < -margin) pos.y = h + margin;
  if (pos.y > h + margin) pos.y = -margin;
}

/** Skapa bullet eller rocket. */
export function createProjectile(
  ship: Ship,
  weapon: Weapon,
  weaponIndex: number,
  speed: number
): Projectile {
  const dir = fromAngle(ship.rotation);
  const nose = add(ship.position, scale(dir, 22));
  const vel = add(scale(dir, speed), ship.velocity);
  const damage =
    weapon.baseDamage * weapon.damageModifier * ship.damageMultiplier;
  const lifetime =
    CONFIG.bulletLifetime * weapon.lifetimeModifier * ship.lifetimeMultiplier;
  return {
    type: weapon.kind === "rocket" ? "rocket" : "bullet",
    position: { ...nose },
    prevPosition: { ...nose },
    velocity: vel,
    radius: weapon.kind === "rocket" ? CONFIG.bulletRadius * 1.5 : CONFIG.bulletRadius,
    damage,
    lifetime,
    weaponIndex,
    weaponKind: weapon.kind,
  };
}

/** Skapa bomb. */
export function createBomb(ship: Ship, weapon: Weapon, weaponIndex: number): Bomb {
  const vel = { ...ship.velocity };
  const dir = fromAngle(ship.rotation);
  const dropPos = add(ship.position, scale(dir, 30));
  const damage =
    weapon.baseDamage * weapon.damageModifier * ship.damageMultiplier;
  return {
    type: "bomb",
    position: dropPos,
    velocity: vel,
    radius: CONFIG.bulletRadius * 2,
    damage,
    explosionRadius: CONFIG.bombRadius * weapon.lifetimeModifier * ship.lifetimeMultiplier,
    fuse: CONFIG.bombFuse,
    weaponIndex,
  };
}

/** Skapa mina. */
export function createMine(ship: Ship, weapon: Weapon, weaponIndex: number): Mine {
  const dir = fromAngle(ship.rotation);
  const dropPos = add(ship.position, scale(dir, 35));
  const damage =
    weapon.baseDamage * weapon.damageModifier * ship.damageMultiplier;
  return {
    type: "mine",
    position: dropPos,
    radius: CONFIG.bulletRadius * 2,
    damage,
    explosionRadius: CONFIG.mineExplosionRadius,
    triggerRadius: CONFIG.mineTriggerRadius,
    weaponIndex,
  };
}

/** Skapa laserlinje. */
export function createLaser(ship: Ship, weapon: Weapon, weaponIndex: number): LaserLine {
  const dir = fromAngle(ship.rotation);
  const len = CONFIG.laserLength * weapon.lifetimeModifier * ship.lifetimeMultiplier;
  const start = add(ship.position, scale(dir, 25));
  const end = add(start, scale(dir, len));
  const damage =
    weapon.baseDamage * weapon.damageModifier * ship.damageMultiplier;
  return {
    type: "laser",
    start,
    end,
    damage,
    lifetime: CONFIG.laserDuration,
    weaponIndex,
  };
}

export function updateProjectile(
  p: Projectile,
  dt: number,
  w: number,
  h: number
): void {
  p.prevPosition.x = p.position.x;
  p.prevPosition.y = p.position.y;
  p.position.x += p.velocity.x * dt;
  p.position.y += p.velocity.y * dt;
  p.lifetime -= dt;
  wrapPos(p.position, p.radius, w, h);
}

export function updateBomb(b: Bomb, dt: number, w: number, h: number): void {
  b.position.x += b.velocity.x * dt;
  b.position.y += b.velocity.y * dt;
  b.fuse -= dt;
  wrapPos(b.position, b.radius, w, h);
}

export function projectileCircle(p: Projectile): Circle {
  return { position: { ...p.position }, radius: p.radius };
}

export function bombCircle(b: Bomb): Circle {
  return { position: { ...b.position }, radius: b.radius };
}

export function mineCircle(m: Mine): Circle {
  return { position: { ...m.position }, radius: m.triggerRadius };
}

export function isProjectileAlive(p: Projectile): boolean {
  return p.lifetime > 0;
}

export function isBombAlive(b: Bomb): boolean {
  return b.fuse > 0;
}

/** Kolla om asteroid är inom mine trigger. */
export function mineTriggered(m: Mine, asteroid: Asteroid): boolean {
  const dx = asteroid.position.x - m.position.x;
  const dy = asteroid.position.y - m.position.y;
  return dx * dx + dy * dy <= m.triggerRadius * m.triggerRadius;
}

/** Kolla avstånd till punkt. */
export function distanceToPoint(pos: Vec2, px: number, py: number): number {
  return Math.hypot(px - pos.x, py - pos.y);
}

/** Avstånd punkt till linjesegment. */
export function pointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

export function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile): void {
  ctx.save();
  const color = p.weaponKind === "rocket" ? "#f84" : "#ffa";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBomb(ctx: CanvasRenderingContext2D, b: Bomb): void {
  ctx.save();
  ctx.fillStyle = "#a62";
  ctx.strokeStyle = "#862";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.position.x, b.position.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawMine(ctx: CanvasRenderingContext2D, m: Mine): void {
  ctx.save();
  ctx.fillStyle = "#862";
  ctx.strokeStyle = "#642";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(m.position.x, m.position.y, m.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawLaser(ctx: CanvasRenderingContext2D, l: LaserLine): void {
  ctx.save();
  ctx.strokeStyle = "#4ff";
  ctx.lineWidth = 4;
  ctx.globalAlpha = l.lifetime / CONFIG.laserDuration;
  ctx.beginPath();
  ctx.moveTo(l.start.x, l.start.y);
  ctx.lineTo(l.end.x, l.end.y);
  ctx.stroke();
  ctx.restore();
}
