import type { Vec2 } from "../vec2.js";
import { add, scale, fromAngle } from "../vec2.js";
import { CONFIG } from "../constants.js";
import type { Circle } from "../collision.js";
import type { Ship } from "./ship.js";
import type { Weapon } from "../weapon.js";

export interface Bullet {
  position: Vec2;
  prevPosition: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  lifetime: number;
  /** Vapenslot (0–2) för färg/UX. */
  weaponIndex: number;
}

/** Skapar skott från vapen. Skada = base × weapon.damageMod × ship.damageMult. */
export function createBullet(ship: Ship, weapon: Weapon, weaponIndex: number): Bullet {
  const direction = fromAngle(ship.rotation);
  const nose = add(ship.position, scale(direction, 22));
  const velocity = add(
    scale(direction, CONFIG.bulletSpeed),
    ship.velocity
  );
  const damage =
    weapon.baseDamage * weapon.damageModifier * ship.damageMultiplier;
  const lifetime =
    CONFIG.bulletLifetime * weapon.lifetimeModifier * ship.lifetimeMultiplier;
  return {
    position: { ...nose },
    prevPosition: { ...nose },
    velocity,
    radius: CONFIG.bulletRadius,
    damage,
    lifetime,
    weaponIndex,
  };
}

export function updateBullet(bullet: Bullet, dt: number, worldWidth: number, worldHeight: number): void {
  bullet.prevPosition.x = bullet.position.x;
  bullet.prevPosition.y = bullet.position.y;
  bullet.position.x += bullet.velocity.x * dt;
  bullet.position.y += bullet.velocity.y * dt;
  bullet.lifetime -= dt;
  wrapPosition(bullet.position, bullet.radius, worldWidth, worldHeight);
}

function wrapPosition(pos: Vec2, margin: number, w: number, h: number): void {
  if (pos.x < -margin) pos.x = w + margin;
  if (pos.x > w + margin) pos.x = -margin;
  if (pos.y < -margin) pos.y = h + margin;
  if (pos.y > h + margin) pos.y = -margin;
}

export function bulletCollisionCircle(bullet: Bullet): Circle {
  return { position: { ...bullet.position }, radius: bullet.radius };
}

export function isBulletAlive(bullet: Bullet): boolean {
  return bullet.lifetime > 0;
}

/** Färg per vapenslot (W1, W2, W3) – gör det tydligt vilket vapen som avfyras. */
const BULLET_COLORS = ["#ffa", "#8ff", "#fa8"] as const;

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  ctx.save();
  ctx.fillStyle = BULLET_COLORS[bullet.weaponIndex] ?? "#ffa";
  ctx.beginPath();
  ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
