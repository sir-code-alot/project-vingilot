import type { Vec2 } from "../vec2.js";
import { add, scale, fromAngle, rotate } from "../vec2.js";
import { CONFIG } from "../constants.js";
import type { Circle, MovingCircle } from "../collision.js";
import type { WeaponSlot } from "../weapon.js";
import { createDefaultWeaponSlots } from "../weapon.js";

export interface Ship {
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  thrusting: boolean;
  /** Nuvarande HP. */
  hp: number;
  /** Max HP (för uppgraderingar senare). */
  maxHp: number;
  /** Tre vapenslotter (null = tom). */
  weapons: [WeaponSlot, WeaponSlot, WeaponSlot];
  /** Vald vapenslot (0–2). Endast detta vapen avfyras. */
  selectedWeaponSlot: 0 | 1 | 2;
  /** Spelarens skadamultiplikator (multipliceras med vapen). */
  damageMultiplier: number;
  /** Spelarens eldhastighet (multipliceras med vapen). */
  fireRateMultiplier: number;
  /** Spelarens livslängdsmultiplikator för skott. */
  lifetimeMultiplier: number;
  /** Spelarens rörelsehastighet (multipliceras med thrust). */
  thrustMultiplier: number;
  /** Modifier för hp-regeneration. Regen = baseHealthRegenPerSecond × healthRegenModifier (hp/s). Startar 0. */
  healthRegenModifier: number;
  /** Tur – påverkar slumpade utfall (belöningar, uppgraderingskvalitet). Bas 1, uppgraderbar. */
  luck: number;
  /** XP-multiplikator – påverkar hur mycket XP man får. Bas 1, uppgraderbar. */
  xpGainMultiplier: number;
  /** Guld-multiplikator – påverkar hur mycket guld man får. Bas 1, uppgraderbar. */
  goldGainMultiplier: number;
  /** Samlad guld. */
  gold: number;
  /** Samlad XP. */
  xp: number;
  /** Spelarens nivå. */
  level: number;
}

export function createShip(centerX: number, centerY: number): Ship {
  return {
    position: { x: centerX, y: centerY },
    velocity: { x: 0, y: 0 },
    rotation: -Math.PI / 2,
    thrusting: false,
    hp: CONFIG.shipMaxHp,
    maxHp: CONFIG.shipMaxHp,
    weapons: createDefaultWeaponSlots(),
    selectedWeaponSlot: 0,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    lifetimeMultiplier: 1,
    thrustMultiplier: 1,
    healthRegenModifier: 0,
    luck: 1,
    xpGainMultiplier: 1,
    goldGainMultiplier: 1,
    gold: 0,
    xp: 0,
    level: 1,
  };
}

export function updateShip(ship: Ship, dt: number, keys: { up: boolean; left: boolean; right: boolean }): void {
  if (keys.left) ship.rotation -= CONFIG.turnSpeed * dt;
  if (keys.right) ship.rotation += CONFIG.turnSpeed * dt;
  if (keys.up) {
    const thrustVec = scale(
      fromAngle(ship.rotation),
      CONFIG.thrust * ship.thrustMultiplier * dt
    );
    ship.velocity = add(ship.velocity, thrustVec);
    ship.thrusting = true;
  } else {
    ship.thrusting = false;
  }

  ship.velocity = scale(ship.velocity, CONFIG.friction);
  ship.position = add(ship.position, scale(ship.velocity, dt));
}

export function wrapPosition(ship: Ship, width: number, height: number): void {
  const r = CONFIG.shipRadius * 2;
  if (ship.position.x < -r) ship.position.x = width + r;
  if (ship.position.x > width + r) ship.position.x = -r;
  if (ship.position.y < -r) ship.position.y = height + r;
  if (ship.position.y > height + r) ship.position.y = -r;
}

/** Cirkel för kollisionsdetektering (skepp vs hinder/fiender). */
export function shipCollisionCircle(ship: Ship): Circle {
  return {
    position: { ...ship.position },
    radius: CONFIG.shipRadius,
  };
}

/** För studs mot asteroider (skepp som MovingCircle). */
export function shipMovingCircle(ship: Ship): MovingCircle {
  return {
    position: ship.position,
    velocity: ship.velocity,
    radius: CONFIG.shipRadius,
  };
}

export function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  const nose = add(
    ship.position,
    scale(fromAngle(ship.rotation), CONFIG.shipNoseLength)
  );
  const backLeft = add(
    ship.position,
    scale(rotate(fromAngle(ship.rotation), Math.PI * 0.85), CONFIG.shipWingHalf * 2)
  );
  const backRight = add(
    ship.position,
    scale(rotate(fromAngle(ship.rotation), -Math.PI * 0.85), CONFIG.shipWingHalf * 2)
  );

  ctx.save();
  ctx.strokeStyle = "#8af";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(nose.x, nose.y);
  ctx.lineTo(backLeft.x, backLeft.y);
  ctx.lineTo(backRight.x, backRight.y);
  ctx.closePath();
  ctx.stroke();

  if (ship.thrusting) {
    const flameLen = 12 + Math.random() * 6;
    const flameBack = add(ship.position, scale(fromAngle(ship.rotation + Math.PI), flameLen));
    ctx.strokeStyle = "#fa4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(backLeft.x * 0.3 + backRight.x * 0.7, backLeft.y * 0.3 + backRight.y * 0.7);
    ctx.lineTo(flameBack.x, flameBack.y);
    ctx.lineTo(backRight.x * 0.3 + backLeft.x * 0.7, backRight.y * 0.3 + backLeft.y * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}
