import type { Vec2 } from "./vec2.js";
import type { Ship } from "./entities/ship.js";
import type { Asteroid } from "./entities/asteroid.js";
import { CONFIG } from "./constants.js";
import { getAsteroidReward } from "./entities/asteroid.js";

export type PickupKind = "gold" | "xp";

export interface Pickup {
  position: Vec2;
  kind: PickupKind;
  /** Basvärde; luck och ship-multiplikatorer appliceras vid upplockning. */
  amount: number;
  /** Sekunder sedan skapande (animation + livstid). */
  age: number;
}

function wrapPickupPosition(pos: Vec2, margin: number, w: number, h: number): void {
  if (pos.x < -margin) pos.x = w + margin;
  if (pos.x > w + margin) pos.x = -margin;
  if (pos.y < -margin) pos.y = h + margin;
  if (pos.y > h + margin) pos.y = -margin;
}

export function getShipPickupRadius(ship: Ship): number {
  return CONFIG.shipPickupRadiusBase * ship.pickupRadiusMultiplier;
}

export function createPickup(kind: PickupKind, x: number, y: number, amount: number): Pickup {
  return {
    position: { x, y },
    kind,
    amount,
    age: 0,
  };
}

/** Släpper guld- och XP-pickups vid asteroidens position (liten spridning). */
export function spawnPickupsFromAsteroid(pickups: Pickup[], asteroid: Asteroid): void {
  const reward = getAsteroidReward(asteroid);
  const spread = 10;
  if (reward.gold > 0) {
    const ox = (Math.random() - 0.5) * spread;
    const oy = (Math.random() - 0.5) * spread;
    pickups.push(createPickup("gold", asteroid.position.x + ox, asteroid.position.y + oy, reward.gold));
  }
  if (reward.xp > 0) {
    const ox = (Math.random() - 0.5) * spread;
    const oy = (Math.random() - 0.5) * spread;
    pickups.push(createPickup("xp", asteroid.position.x + ox, asteroid.position.y + oy, reward.xp));
  }
}

export function updatePickup(pickup: Pickup, dt: number, worldWidth: number, worldHeight: number): void {
  pickup.age += dt;
  wrapPickupPosition(pickup.position, 8, worldWidth, worldHeight);
}

export function isPickupExpired(pickup: Pickup): boolean {
  return pickup.age >= CONFIG.pickupLifetimeSeconds;
}

/** True om skeppet plockade upp (applicerar multiplikatorer). */
export function tryCollectPickup(pickup: Pickup, ship: Ship): boolean {
  const r = getShipPickupRadius(ship);
  const dx = pickup.position.x - ship.position.x;
  const dy = pickup.position.y - ship.position.y;
  if (dx * dx + dy * dy > r * r) return false;

  const luck = ship.luck;
  if (pickup.kind === "gold") {
    ship.gold += Math.floor(pickup.amount * luck * ship.goldGainMultiplier);
  } else {
    ship.xp += Math.floor(pickup.amount * luck * ship.xpGainMultiplier);
  }
  return true;
}

export function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup): void {
  const bob = Math.sin(pickup.age * 6) * 2;
  const x = pickup.position.x;
  const y = pickup.position.y + bob;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  if (pickup.kind === "gold") {
    ctx.strokeStyle = "#ec6";
    ctx.fillStyle = "rgba(255, 200, 80, 0.35)";
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#8cf";
    ctx.fillStyle = "rgba(100, 180, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
