import type { Ship } from "./entities/ship.js";
import { createWeapon, type WeaponKind } from "./weapon.js";

/** XP för att nå nästa nivå. */
export function xpRequiredForNextLevel(currentLevel: number): number {
  return Math.floor(28 * Math.pow(currentLevel, 1.18));
}

/** Total XP krävs för att nå nivå. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpRequiredForNextLevel(i);
  }
  return total;
}

/** Spelaruppgraderingar (påverkar hela skeppet). */
export type PlayerUpgrade = "maxHp" | "damage" | "fireRate" | "lifetime" | "movementSpeed" | "healthRegen" | "luck" | "xpGain" | "goldGain";

/** Vapenuppgraderingar (påverkar specifikt vapen). */
export type WeaponUpgrade =
  | "weaponDamage"
  | "weaponFireRate"
  | "weaponLifetime";

/** Lägg till nytt vapen i en tom slot. */
export type AddWeaponUpgrade = `addWeapon_${0 | 1 | 2}`;

export type UpgradeCategory =
  | PlayerUpgrade
  | `${WeaponUpgrade}_${0 | 1 | 2}`
  | AddWeaponUpgrade;

export interface UpgradeOption {
  category: UpgradeCategory;
  percent: number;
  label: string;
  /** Vapenindex (0–2) för vapenuppgraderingar. */
  weaponIndex?: number;
  /** Vapentyp vid addWeapon. */
  weaponKind?: WeaponKind;
}

/** Vapentyper som kan erbjudas vid level-up (alla utom bullet som startvapen). */
const UNLOCKABLE_WEAPONS: WeaponKind[] = [
  "rocket",
  "bomb",
  "mine",
  "pulse",
  "conePulse",
  "laser",
];

const WEAPON_DISPLAY_NAMES: Record<WeaponKind, string> = {
  bullet: "Bullet",
  rocket: "Rocket",
  bomb: "Bomb",
  mine: "Mine",
  pulse: "Pulse",
  conePulse: "Cone Pulse",
  laser: "Laser",
};

function randomUpgradePercent(luck: number): number {
  const min = 0.05;
  const range = 0.25;
  const r = Math.pow(Math.random(), 1.8 / Math.max(0.1, luck));
  return min + range * r;
}

function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

const PLAYER_LABELS: Record<PlayerUpgrade, string> = {
  maxHp: "Max HP",
  damage: "Damage",
  fireRate: "Fire rate",
  lifetime: "Range",
  movementSpeed: "Movement speed",
  healthRegen: "HP regen",
  luck: "Luck",
  xpGain: "XP gain",
  goldGain: "Gold gain",
};

const WEAPON_LABELS: Record<WeaponUpgrade, string> = {
  weaponDamage: "Damage",
  weaponFireRate: "Fire rate",
  weaponLifetime: "Range",
};

/** Hitta tomma vapenslots och vilka vapentyper som redan finns. */
function getEmptySlotsAndUsedKinds(ship: Ship): { emptySlots: number[]; usedKinds: Set<WeaponKind> } {
  const emptySlots: number[] = [];
  const usedKinds = new Set<WeaponKind>();
  for (let i = 0; i < 3; i++) {
    const w = ship.weapons[i];
    if (w) usedKinds.add(w.kind);
    else emptySlots.push(i);
  }
  return { emptySlots, usedKinds };
}

/** Genererar tre slumpade uppgraderingar (spelare, vapenuppgraderingar, nya vapen). */
export function generateUpgradeOptions(ship: Ship): UpgradeOption[] {
  const playerCategories: PlayerUpgrade[] = [
    "maxHp",
    "damage",
    "fireRate",
    "lifetime",
    "movementSpeed",
    "healthRegen",
    "luck",
    "xpGain",
    "goldGain",
  ];
  const weaponStats: WeaponUpgrade[] = [
    "weaponDamage",
    "weaponFireRate",
    "weaponLifetime",
  ];

  const { emptySlots, usedKinds } = getEmptySlotsAndUsedKinds(ship);
  const availableNewWeapons = UNLOCKABLE_WEAPONS.filter((k) => !usedKinds.has(k));

  const pool: UpgradeOption[] = [];

  for (const cat of playerCategories) {
    pool.push({ category: cat, percent: 0, label: "" });
  }
  for (let wi = 0; wi < 3; wi++) {
    if (ship.weapons[wi]) {
      for (const stat of weaponStats) {
        pool.push({
          category: `${stat}_${wi}` as UpgradeCategory,
          percent: 0,
          label: "",
          weaponIndex: wi,
        });
      }
    }
  }
  for (const slot of emptySlots) {
    for (const kind of availableNewWeapons) {
      pool.push({
        category: `addWeapon_${slot}` as AddWeaponUpgrade,
        percent: 0,
        label: "",
        weaponIndex: slot,
        weaponKind: kind,
      });
    }
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const chosen: UpgradeOption[] = [];
  const usedTypes = new Set<string>();

  for (const opt of shuffled) {
    if (chosen.length >= 3) break;

    let typeKey: string;
    if ((opt.category as string).startsWith("addWeapon_")) {
      typeKey = `add_${opt.weaponIndex}_${opt.weaponKind}`;
    } else if (opt.weaponIndex !== undefined) {
      const base = (opt.category as string).replace(/_\d$/, "");
      typeKey = `weapon_${opt.weaponIndex}_${base}`;
    } else {
      typeKey = `player_${opt.category}`;
    }

    if (usedTypes.has(typeKey)) continue;
    usedTypes.add(typeKey);

    const percent = randomUpgradePercent(ship.luck);
    if ((opt.category as string).startsWith("addWeapon_") && opt.weaponKind) {
      chosen.push({
        ...opt,
        percent,
        label: `Add ${WEAPON_DISPLAY_NAMES[opt.weaponKind]} (slot ${opt.weaponIndex! + 1})`,
      });
    } else if (opt.weaponIndex !== undefined && !opt.category.toString().startsWith("addWeapon")) {
      const stat = (opt.category as string).replace(/_\d$/, "") as WeaponUpgrade;
      chosen.push({
        ...opt,
        percent,
        label: `${WEAPON_DISPLAY_NAMES[ship.weapons[opt.weaponIndex]!.kind]} ${WEAPON_LABELS[stat]} +${formatPercent(percent)}`,
      });
    } else {
      chosen.push({
        ...opt,
        percent,
        label: `${PLAYER_LABELS[opt.category as PlayerUpgrade]} +${formatPercent(percent)}`,
      });
    }
  }

  return chosen;
}

/** Applicerar vald uppgradering. */
export function applyUpgrade(ship: Ship, option: UpgradeOption): void {
  if ((option.category as string).startsWith("addWeapon_") && option.weaponKind && option.weaponIndex !== undefined) {
    ship.weapons[option.weaponIndex] = createWeapon(option.weaponKind);
    return;
  }

  const mult = 1 + option.percent;

  if (option.weaponIndex !== undefined) {
    const weapon = ship.weapons[option.weaponIndex];
    if (!weapon) return;
    const base = (option.category as string).replace(/_\d$/, "");
    if (base === "weaponDamage") weapon.damageModifier *= mult;
    else if (base === "weaponFireRate") weapon.fireRateModifier *= mult;
    else if (base === "weaponLifetime") weapon.lifetimeModifier *= mult;
    return;
  }

  switch (option.category as PlayerUpgrade) {
    case "maxHp": {
      const added = Math.max(1, Math.floor(ship.maxHp * option.percent));
      ship.maxHp += added;
      ship.hp = Math.min(ship.hp + added, ship.maxHp);
      break;
    }
    case "damage":
      ship.damageMultiplier *= mult;
      break;
    case "fireRate":
      ship.fireRateMultiplier *= mult;
      break;
    case "lifetime":
      ship.lifetimeMultiplier *= mult;
      break;
    case "movementSpeed":
      ship.thrustMultiplier *= mult;
      break;
    case "healthRegen":
      ship.healthRegenModifier += option.percent;
      break;
    case "luck":
      ship.luck *= mult;
      break;
    case "xpGain":
      ship.xpGainMultiplier *= mult;
      break;
    case "goldGain":
      ship.goldGainMultiplier *= mult;
      break;
  }
}
