import { CONFIG } from "./constants.js";

export type WeaponKind =
  | "bullet"
  | "rocket"
  | "bomb"
  | "mine"
  | "pulse"
  | "conePulse"
  | "laser";

export const WEAPON_NAMES: Record<WeaponKind, string> = {
  bullet: "Bullet",
  rocket: "Rocket",
  bomb: "Bomb",
  mine: "Mine",
  pulse: "Pulse",
  conePulse: "Cone",
  laser: "Laser",
};

export const WEAPON_COLORS: Record<WeaponKind, string> = {
  bullet: "#ffa",
  rocket: "#f84",
  bomb: "#a62",
  mine: "#862",
  pulse: "#8af",
  conePulse: "#a8f",
  laser: "#4ff",
};

/** Ett vapen i en slot. Har kind + modifierare. */
export interface Weapon {
  kind: WeaponKind;
  baseDamage: number;
  damageModifier: number;
  fireRateModifier: number;
  lifetimeModifier: number;
  lastFiredAt: number;
}

export type WeaponSlot = Weapon | null;

export function createWeapon(kind: WeaponKind, baseDamage?: number): Weapon {
  const damage = baseDamage ?? getBaseDamage(kind);
  return {
    kind,
    baseDamage: damage,
    damageModifier: 1,
    fireRateModifier: 1,
    lifetimeModifier: 1,
    lastFiredAt: -999,
  };
}

function getBaseDamage(kind: WeaponKind): number {
  switch (kind) {
    case "bullet":
      return CONFIG.bulletDamage;
    case "rocket":
      return CONFIG.rocketDamage;
    case "bomb":
      return CONFIG.bombDamage;
    case "mine":
      return CONFIG.mineDamage;
    case "pulse":
      return CONFIG.pulseDamage;
    case "conePulse":
      return CONFIG.conePulseDamage;
    case "laser":
      return CONFIG.laserDamage;
    default:
      return 1;
  }
}

export function getWeaponCooldown(kind: WeaponKind): number {
  switch (kind) {
    case "bullet":
      return CONFIG.bulletCooldown;
    case "rocket":
      return CONFIG.rocketCooldown;
    case "bomb":
      return CONFIG.bombCooldown;
    case "mine":
      return CONFIG.mineCooldown;
    case "pulse":
      return CONFIG.pulseCooldown;
    case "conePulse":
      return CONFIG.conePulseCooldown;
    case "laser":
      return CONFIG.laserCooldown;
    default:
      return 0.2;
  }
}

/** Startvapen: bara kula i slot 0. */
export function createDefaultWeaponSlots(): [WeaponSlot, WeaponSlot, WeaponSlot] {
  return [createWeapon("bullet"), null, null];
}
