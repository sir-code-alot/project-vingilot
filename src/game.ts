import type { Ship } from "./entities/ship.js";
import { createShip, updateShip, wrapPosition, drawShip, shipMovingCircle } from "./entities/ship.js";
import { createStarfield, drawStarfield, type Star } from "./starfield.js";
import { CONFIG } from "./constants.js";
import type { Asteroid } from "./entities/asteroid.js";
import {
  updateAsteroid,
  drawAsteroid,
  asteroidCollisionCircle,
  asteroidMovingCircle,
  isAsteroidDead,
  spawnAsteroidAtEdge,
} from "./entities/asteroid.js";
import type { Projectile, Bomb, Mine, LaserLine } from "./projectiles.js";
import {
  createProjectile,
  createBomb,
  createMine,
  createLaser,
  updateProjectile,
  updateBomb,
  isProjectileAlive,
  isBombAlive,
  mineTriggered,
  pointToSegment,
  drawProjectile,
  drawBomb,
  drawMine,
  drawLaser,
} from "./projectiles.js";
import { getWeaponCooldown } from "./weapon.js";
import { circleVsCircle, resolveBounce, resolveShipAsteroidRedirect, segmentVsCircle } from "./collision.js";
import {
  totalXpForLevel,
  generateUpgradeOptions,
  applyUpgrade,
  type UpgradeOption,
} from "./leveling.js";
import { WEAPON_NAMES } from "./weapon.js";
import {
  createExplosion,
  createPulse,
  createConePulse,
  isEffectAlive,
  drawEffect,
  type GameEffect,
} from "./effects.js";
import {
  spawnPickupsFromAsteroid,
  updatePickup,
  tryCollectPickup,
  isPickupExpired,
  drawPickup,
  getShipPickupRadius,
  type Pickup,
} from "./pickups.js";

function drawStatsUI(
  ctx: CanvasRenderingContext2D,
  ship: Ship,
  width: number,
  height: number,
  running: boolean,
  gameTimeSeconds: number,
  restartConfirmPending: boolean
): void {
  const pad = 12;
  const lineH = 18;
  const barW = 140;
  const barH = 8;

  ctx.save();
  const panelH = pad * 2 + barH * 2 + lineH * 2 + barH + 12;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.fillRect(pad, pad, 164, panelH);
  ctx.strokeRect(pad, pad, 164, panelH);

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#eee";
  ctx.textBaseline = "top";

  const hpPct = ship.maxHp > 0 ? ship.hp / ship.maxHp : 0;
  ctx.fillStyle = "#333";
  ctx.fillRect(pad + 4, pad + 4, barW, barH);
  ctx.fillStyle = hpPct > 0.4 ? "#4a8" : hpPct > 0.2 ? "#ca4" : "#a44";
  ctx.fillRect(pad + 4, pad + 4, barW * hpPct, barH);
  ctx.strokeStyle = "#666";
  ctx.strokeRect(pad + 4, pad + 4, barW, barH);
  ctx.fillStyle = "#fff";
  ctx.fillText(`HP ${Math.max(0, Math.floor(ship.hp))} / ${ship.maxHp}`, pad + 4, pad + barH + 6);

  const xpForNext = totalXpForLevel(ship.level + 1);
  const xpInLevel = ship.xp - totalXpForLevel(ship.level);
  const xpNeeded = xpForNext - totalXpForLevel(ship.level);
  const xpPct = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1;

  const xpBarY = pad + barH + 6 + lineH;
  ctx.fillStyle = "#333";
  ctx.fillRect(pad + 4, xpBarY, barW, barH);
  ctx.fillStyle = "#6af";
  ctx.fillRect(pad + 4, xpBarY, barW * xpPct, barH);
  ctx.strokeStyle = "#666";
  ctx.strokeRect(pad + 4, xpBarY, barW, barH);
  ctx.fillStyle = "#fff";
  ctx.fillText(`XP ${xpInLevel}/${xpNeeded}  Level ${ship.level}`, pad + 4, xpBarY + barH + 6);

  ctx.fillText(`Gold ${ship.gold}`, pad + 4, xpBarY + barH + 6 + lineH);

  const weaponY = xpBarY + barH + 6 + lineH * 2;
  const weaponW = 52;
  const weaponGap = 4;
  const weaponSlotColors = ["#ffa", "#8ff", "#fa8"] as const;
  const showCooldownBar = (cooldown: number) => cooldown >= CONFIG.weaponCooldownBarMin;

  for (let i = 0; i < ship.weapons.length; i++) {
    const weapon = ship.weapons[i];
    const x = pad + 4 + i * (weaponW + weaponGap);
    const isSelected = i === ship.selectedWeaponSlot;

    ctx.fillStyle = "rgba(40, 40, 50, 0.9)";
    ctx.strokeStyle = isSelected ? "#8af" : weapon ? "#555" : "#333";
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.fillRect(x, weaponY, weaponW, barH);
    ctx.strokeRect(x, weaponY, weaponW, barH);

    if (weapon) {
      const baseCooldown = getWeaponCooldown(weapon.kind);
      const cooldown = baseCooldown / (weapon.fireRateModifier * ship.fireRateMultiplier);
      const elapsed = gameTimeSeconds - weapon.lastFiredAt;
      const ready = elapsed >= cooldown;
      const drawCooldownFill = !ready && showCooldownBar(cooldown);

      if (drawCooldownFill) {
        ctx.fillStyle = "rgba(80,80,80,0.6)";
        ctx.fillRect(x + 1, weaponY + 1, weaponW - 2, barH - 2);
        const cdPct = Math.min(1, elapsed / cooldown);
        ctx.fillStyle = weaponSlotColors[i] ?? "#888";
        ctx.fillRect(x + 1, weaponY + 1, (weaponW - 2) * cdPct, barH - 2);
      } else {
        ctx.fillStyle = weaponSlotColors[i] ?? "#888";
        ctx.globalAlpha = ready ? 1 : 0.6;
        ctx.fillRect(x + 1, weaponY + 1, weaponW - 2, barH - 2);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#fff";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      const short = WEAPON_NAMES[weapon.kind].slice(0, 4);
      ctx.fillText(`${i + 1}: ${short}`, x + weaponW / 2, weaponY + barH - 3);
    } else {
      ctx.fillStyle = "#666";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}: —`, x + weaponW / 2, weaponY + barH - 3);
    }
    ctx.textAlign = "left";
  }

  if (!running) {
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#f44";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", width / 2, height / 2);
    if (!restartConfirmPending) {
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#ccc";
      ctx.fillText("R — new run (asks for confirmation)", width / 2, height / 2 + 34);
    }
    ctx.textAlign = "left";
  }
  ctx.restore();
}

const LEVEL_UP_BOX_W = 200;
const LEVEL_UP_BOX_H = 44;
const LEVEL_UP_GAP = 16;

/** Samma geometri som ritning — används för mushit-test. */
function getLevelUpOptionRects(
  width: number,
  height: number,
  optionCount: number
): { x: number; y: number; w: number; h: number }[] {
  const totalW = optionCount * LEVEL_UP_BOX_W + (optionCount - 1) * LEVEL_UP_GAP;
  const baseX = (width - totalW) / 2;
  const by = height / 2 - 20;
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < optionCount; i++) {
    rects.push({
      x: baseX + i * (LEVEL_UP_BOX_W + LEVEL_UP_GAP),
      y: by,
      w: LEVEL_UP_BOX_W,
      h: LEVEL_UP_BOX_H,
    });
  }
  return rects;
}

function eventToLogicalCanvasCoords(
  game: Game,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const dpr = window.devicePixelRatio ?? 1;
  const rect = game.canvas.getBoundingClientRect();
  const logicalW = game.width / dpr;
  const logicalH = game.height / dpr;
  return {
    x: ((clientX - rect.left) / rect.width) * logicalW,
    y: ((clientY - rect.top) / rect.height) * logicalH,
  };
}

const RESTART_BTN_W = 148;
const RESTART_BTN_H = 40;
const RESTART_BTN_GAP = 20;

/** 0 = Restart (destruktiv), 1 = Cancel — defaultfokus 1 enligt UX. */
function getRestartConfirmButtonRects(width: number, height: number): {
  restart: { x: number; y: number; w: number; h: number };
  cancel: { x: number; y: number; w: number; h: number };
} {
  const totalW = RESTART_BTN_W * 2 + RESTART_BTN_GAP;
  const baseX = (width - totalW) / 2;
  const by = height / 2 + 28;
  return {
    restart: { x: baseX, y: by, w: RESTART_BTN_W, h: RESTART_BTN_H },
    cancel: { x: baseX + RESTART_BTN_W + RESTART_BTN_GAP, y: by, w: RESTART_BTN_W, h: RESTART_BTN_H },
  };
}

function drawRestartConfirmOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  focusedIndex: 0 | 1
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, width, height);

  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#e8eef8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Start a new run?", width / 2, height / 2 - 56);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#9aa4b8";
  ctx.fillText("Level, gold, pickups and upgrades will be lost.", width / 2, height / 2 - 26);

  const { restart, cancel } = getRestartConfirmButtonRects(width, height);
  const labels: [typeof restart, string, 0 | 1][] = [
    [restart, "Restart", 0],
    [cancel, "Cancel", 1],
  ];

  for (const [rect, label, idx] of labels) {
    const focused = idx === focusedIndex;
    const destructive = idx === 0;
    if (destructive) {
      ctx.fillStyle = focused ? "rgba(88, 42, 48, 0.96)" : "rgba(52, 38, 42, 0.92)";
      ctx.strokeStyle = focused ? "rgba(255, 150, 130, 0.95)" : "rgba(140, 80, 80, 0.45)";
    } else {
      ctx.fillStyle = focused ? "rgba(52, 60, 78, 0.96)" : "rgba(42, 48, 58, 0.92)";
      ctx.strokeStyle = focused ? "rgba(150, 195, 255, 0.9)" : "rgba(100, 120, 150, 0.45)";
    }
    ctx.lineWidth = focused ? 3 : 2;
    if (focused) {
      ctx.shadowColor = destructive ? "rgba(255, 120, 100, 0.3)" : "rgba(130, 180, 255, 0.35)";
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = focused ? "#fff" : "#ccd6e6";
    ctx.font = "14px sans-serif";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#7a8498";
  ctx.fillText("← / → — focus    Enter — activate    R again — restart    Esc — cancel", width / 2, height / 2 + 88);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawLevelUpOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: UpgradeOption[],
  newLevel: number,
  focusedIndex: number
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, width, height);

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#8af";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Level ${newLevel}!`, width / 2, height / 2 - 88);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#aaa";
  ctx.fillText("← → or WASD — move focus   ·   Enter — confirm", width / 2, height / 2 - 54);
  ctx.fillText("Or press 1–3 or click a box", width / 2, height / 2 - 36);

  const rects = getLevelUpOptionRects(width, height, options.length);
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const { x: bx, y: by, w: boxW, h: boxH } = rects[i]!;
    const hovered = i === focusedIndex;

    ctx.fillStyle = hovered ? "rgba(55, 72, 110, 0.95)" : "rgba(40, 50, 70, 0.9)";
    ctx.strokeStyle = hovered ? "rgba(170, 210, 255, 0.98)" : "rgba(100, 140, 200, 0.6)";
    ctx.lineWidth = hovered ? 3 : 2;
    if (hovered) {
      ctx.shadowColor = "rgba(130, 180, 255, 0.55)";
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.shadowBlur = 0;

    ctx.fillStyle = hovered ? "#f0f6ff" : "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}. ${opt.label}`, bx + boxW / 2, by + 14);
    ctx.fillStyle = hovered ? "#b8d8ff" : "#fff";
    ctx.fillText(`[${i + 1}]`, bx + boxW / 2, by + 32);
  }
  ctx.textAlign = "left";
  ctx.restore();
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, ship: Ship): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, width, height);

  const pad = 20;
  const statsLineH = 16;
  const statsFont = "12px sans-serif";
  const panelW = 280;
  const panelH = pad * 2 + 9 * statsLineH;
  const gap = 20;

  let y = 36;

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("PAUSED", width / 2, y);
  y += 44 + gap;

  const panelX = (width - panelW) / 2;
  let panelY = y;
  y += panelH + gap;

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.font = statsFont;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const statLabels: [string, string][] = [
    ["Damage", `${ship.damageMultiplier.toFixed(1)}×`],
    ["Fire rate", `${ship.fireRateMultiplier.toFixed(1)}×`],
    ["Range", `${ship.lifetimeMultiplier.toFixed(1)}×`],
    ["Movement", `${ship.thrustMultiplier.toFixed(1)}×`],
    ["HP regen", ship.healthRegenModifier > 0 ? `${(CONFIG.baseHealthRegenPerSecond * ship.healthRegenModifier).toFixed(1)}/s` : "—"],
    ["Luck", `${ship.luck.toFixed(1)}×`],
    ["XP gain", `${ship.xpGainMultiplier.toFixed(1)}×`],
    ["Gold gain", `${ship.goldGainMultiplier.toFixed(1)}×`],
    ["Pickup range", `${getShipPickupRadius(ship).toFixed(0)}`],
  ];
  for (let i = 0; i < statLabels.length; i++) {
    const [label, value] = statLabels[i]!;
    const rowY = panelY + pad + i * statsLineH;
    ctx.fillStyle = "#aaa";
    ctx.fillText(label, panelX + 10, rowY);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText(value, panelX + panelW - 10, rowY);
    ctx.textAlign = "left";
  }

  const weaponSlotCount = ship.weapons.filter((w) => w !== null).length;
  if (weaponSlotCount > 0) {
    y += gap;
    const weaponHeaderH = 20;
    const weaponStatsPerSlot = 3;
    const weaponBlockH = pad * 2 + weaponHeaderH + weaponSlotCount * (statsLineH + weaponStatsPerSlot * statsLineH);
    const weaponPanelY = y;
    y += weaponBlockH + gap;

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(panelX, weaponPanelY, panelW, weaponBlockH);
    ctx.strokeRect(panelX, weaponPanelY, panelW, weaponBlockH);

    ctx.fillStyle = "#8af";
    ctx.font = "11px sans-serif";
    ctx.fillText("WEAPONS", panelX + 10, weaponPanelY + 8);
    ctx.font = statsFont;

    let rowY = weaponPanelY + pad + weaponHeaderH;
    for (let i = 0; i < 3; i++) {
      const weapon = ship.weapons[i];
      if (!weapon) continue;
      const isSelected = i === ship.selectedWeaponSlot;
      const name = WEAPON_NAMES[weapon.kind];
      ctx.textAlign = "left";
      ctx.fillStyle = isSelected ? "#fff" : "#bbb";
      ctx.font = isSelected ? "12px sans-serif" : "11px sans-serif";
      ctx.fillText(`Slot ${i + 1}: ${name}${isSelected ? " (selected)" : ""}`, panelX + 14, rowY);
      rowY += statsLineH;
      const weaponStatRows: [string, string][] = [
        ["Damage", `${weapon.damageModifier.toFixed(1)}×`],
        ["Fire rate", `${weapon.fireRateModifier.toFixed(1)}×`],
        ["Range", `${weapon.lifetimeModifier.toFixed(1)}×`],
      ];
      for (const [label, value] of weaponStatRows) {
        ctx.fillStyle = "#aaa";
        ctx.font = statsFont;
        ctx.textAlign = "left";
        ctx.fillText(label, panelX + 14, rowY);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "right";
        ctx.fillText(value, panelX + panelW - 10, rowY);
        rowY += statsLineH;
      }
    }
    ctx.textAlign = "left";
  }

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("1/2/3 — Select weapon", width / 2, y);
  ctx.fillText("Escape — Resume", width / 2, y + 24);
  ctx.fillText("R — New run (asks confirmation)", width / 2, y + 48);
  ctx.textAlign = "left";
  ctx.restore();
}

export interface InputState {
  up: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  /** Vald vapenslot (1–3). */
  selectedSlot: 0 | 1 | 2;
}

export interface Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ship: Ship;
  stars: Star[];
  asteroids: Asteroid[];
  projectiles: Projectile[];
  bombs: Bomb[];
  mines: Mine[];
  lasers: LaserLine[];
  effects: GameEffect[];
  pickups: Pickup[];
  keys: InputState;
  width: number;
  height: number;
  lastTime: number;
  running: boolean;
  paused: boolean;
  asteroidSpawnTimer: number;
  /** Visas vid level-up; null = ej aktiv. */
  levelUpMenu: { options: UpgradeOption[]; newLevel: number } | null;
  /**
   * Fokuserat level-up-alternativ (0..n-1). Uppdateras med pilar/WASD och mus över ruta.
   * Enter väljer det fokuserade alternativet (Space används inte — undviker oavsiktlig val vid hållen eld).
   */
  levelUpFocusedOption: number;
  /** True när spelaren bett om omstart och bekräftelsedialog visas. */
  restartConfirmPending: boolean;
  /** 0 = Restart, 1 = Cancel — standard 1 (säkert standardval). */
  restartConfirmFocusedOption: 0 | 1;
}

function getWorldSize(game: Game): { worldW: number; worldH: number } {
  const dpr = window.devicePixelRatio ?? 1;
  const logicalW = game.width / dpr;
  const logicalH = game.height / dpr;
  return { worldW: logicalW / CONFIG.zoom, worldH: logicalH / CONFIG.zoom };
}

function resetGame(game: Game): void {
  const { worldW, worldH } = getWorldSize(game);
  game.ship = createShip(worldW / 2, worldH / 2);
  game.asteroids = [];
  game.projectiles = [];
  game.bombs = [];
  game.mines = [];
  game.lasers = [];
  game.effects = [];
  game.pickups = [];
  game.asteroidSpawnTimer = 0;
  game.running = true;
  game.paused = false;
  game.levelUpMenu = null;
  game.levelUpFocusedOption = 0;
  game.restartConfirmPending = false;
  game.restartConfirmFocusedOption = 1;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  return ctx;
}

function resizeCanvas(canvas: HTMLCanvasElement, game: Game): void {
  const container = canvas.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio ?? 1;
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if (w === game.width && h === game.height) return;
  game.width = w;
  game.height = h;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  game.ctx.scale(dpr, dpr);
  const worldW = rect.width / CONFIG.zoom;
  const worldH = rect.height / CONFIG.zoom;
  game.stars = createStarfield(worldW, worldH);
}

export function createGame(canvas: HTMLCanvasElement): Game {
  const ctx = getContext(canvas);
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio ?? 1;
  const width = Math.floor(rect.width * dpr);
  const height = Math.floor(rect.height * dpr);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.scale(dpr, dpr);

  const logicalW = width / dpr;
  const logicalH = height / dpr;
  const worldW = logicalW / CONFIG.zoom;
  const worldH = logicalH / CONFIG.zoom;

  const game: Game = {
    canvas,
    ctx,
    ship: createShip(worldW / 2, worldH / 2),
    stars: createStarfield(worldW, worldH),
    asteroids: [],
    projectiles: [],
    bombs: [],
    mines: [],
    lasers: [],
    effects: [],
    pickups: [],
    keys: { up: false, left: false, right: false, fire: false, selectedSlot: 0 },
    width,
    height,
    lastTime: 0,
    running: true,
    paused: false,
    asteroidSpawnTimer: 0,
    levelUpMenu: null,
    levelUpFocusedOption: 0,
    restartConfirmPending: false,
    restartConfirmFocusedOption: 1,
  };

  const keyMap: Record<string, "up" | "left" | "right" | "fire"> = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    Space: "fire",
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (game.levelUpMenu) {
      const opts = game.levelUpMenu.options;
      const nOpt = opts.length;

      const movePrev =
        e.code === "ArrowLeft" ||
        e.code === "KeyA" ||
        e.code === "ArrowUp" ||
        e.code === "KeyW";
      const moveNext =
        e.code === "ArrowRight" ||
        e.code === "KeyD" ||
        e.code === "ArrowDown" ||
        e.code === "KeyS";

      if (movePrev) {
        game.levelUpFocusedOption = (game.levelUpFocusedOption - 1 + nOpt) % nOpt;
        e.preventDefault();
        return;
      }
      if (moveNext) {
        game.levelUpFocusedOption = (game.levelUpFocusedOption + 1) % nOpt;
        e.preventDefault();
        return;
      }

      if (e.code === "Enter") {
        const i = Math.max(0, Math.min(game.levelUpFocusedOption, nOpt - 1));
        applyUpgrade(game.ship, opts[i]!);
        game.levelUpMenu = null;
        game.paused = false;
        canvas.style.cursor = "";
        e.preventDefault();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        return;
      }

      const n = e.code === "Digit1" ? 1 : e.code === "Digit2" ? 2 : e.code === "Digit3" ? 3 : 0;
      if (n >= 1 && n <= nOpt) {
        const opt = opts[n - 1]!;
        applyUpgrade(game.ship, opt);
        game.levelUpMenu = null;
        game.paused = false;
        canvas.style.cursor = "";
        e.preventDefault();
      }
      return;
    }

    const restartDialogActive =
      game.restartConfirmPending &&
      !game.levelUpMenu &&
      (!game.running || (game.paused && game.ship.hp > 0));

    if (restartDialogActive) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        game.restartConfirmFocusedOption = 0;
        e.preventDefault();
        return;
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        game.restartConfirmFocusedOption = 1;
        e.preventDefault();
        return;
      }
      if (e.code === "Enter" || e.code === "Space") {
        if (game.restartConfirmFocusedOption === 0) {
          resetGame(game);
          game.restartConfirmPending = false;
          canvas.style.cursor = "";
        } else {
          game.restartConfirmPending = false;
        }
        e.preventDefault();
        return;
      }
    }

    const weaponSlot = e.code === "Digit1" ? 0 : e.code === "Digit2" ? 1 : e.code === "Digit3" ? 2 : -1;
    if (weaponSlot >= 0) {
      game.ship.selectedWeaponSlot = weaponSlot as 0 | 1 | 2;
      game.keys.selectedSlot = weaponSlot as 0 | 1 | 2;
    }
    if (e.code === "Escape") {
      if (game.restartConfirmPending) {
        game.restartConfirmPending = false;
        e.preventDefault();
        return;
      }
      if (game.running && game.ship.hp > 0 && !game.levelUpMenu) {
        game.paused = !game.paused;
        e.preventDefault();
      }
      return;
    }
    if (e.code === "KeyR") {
      const canAskRestart =
        !game.running || (game.paused && game.ship.hp > 0 && !game.levelUpMenu);
      if (!canAskRestart) {
        return;
      }
      if (game.restartConfirmPending) {
        resetGame(game);
        game.restartConfirmPending = false;
        canvas.style.cursor = "";
        e.preventDefault();
        return;
      }
      game.restartConfirmPending = true;
      game.restartConfirmFocusedOption = 1;
      e.preventDefault();
      return;
    }
    const key = keyMap[e.code];
    if (key) {
      e.preventDefault();
      game.keys[key] = true;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const key = keyMap[e.code];
    if (key) {
      e.preventDefault();
      game.keys[key] = false;
    }
  };

  const handleCanvasClick = (e: MouseEvent) => {
    const restartDialogActive =
      game.restartConfirmPending &&
      !game.levelUpMenu &&
      (!game.running || (game.paused && game.ship.hp > 0));
    if (restartDialogActive) {
      const dpr = window.devicePixelRatio ?? 1;
      const logicalW = game.width / dpr;
      const logicalH = game.height / dpr;
      const { x, y } = eventToLogicalCanvasCoords(game, e.clientX, e.clientY);
      const { restart, cancel } = getRestartConfirmButtonRects(logicalW, logicalH);
      const inR = x >= restart.x && x <= restart.x + restart.w && y >= restart.y && y <= restart.y + restart.h;
      const inC = x >= cancel.x && x <= cancel.x + cancel.w && y >= cancel.y && y <= cancel.y + cancel.h;
      if (inR) {
        resetGame(game);
        game.restartConfirmPending = false;
        canvas.style.cursor = "";
        e.preventDefault();
        return;
      }
      if (inC) {
        game.restartConfirmPending = false;
        e.preventDefault();
        return;
      }
      return;
    }

    if (!game.levelUpMenu) return;
    const dpr = window.devicePixelRatio ?? 1;
    const logicalW = game.width / dpr;
    const logicalH = game.height / dpr;
    const { x, y } = eventToLogicalCanvasCoords(game, e.clientX, e.clientY);
    const rects = getLevelUpOptionRects(logicalW, logicalH, game.levelUpMenu.options.length);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        applyUpgrade(game.ship, game.levelUpMenu.options[i]!);
        game.levelUpMenu = null;
        game.paused = false;
        canvas.style.cursor = "";
        e.preventDefault();
        return;
      }
    }
  };

  const handleCanvasMove = (e: MouseEvent) => {
    const restartDialogActive =
      game.restartConfirmPending &&
      !game.levelUpMenu &&
      (!game.running || (game.paused && game.ship.hp > 0));
    if (restartDialogActive) {
      const dpr = window.devicePixelRatio ?? 1;
      const logicalW = game.width / dpr;
      const logicalH = game.height / dpr;
      const { x, y } = eventToLogicalCanvasCoords(game, e.clientX, e.clientY);
      const { restart, cancel } = getRestartConfirmButtonRects(logicalW, logicalH);
      let over: 0 | 1 | null = null;
      if (x >= restart.x && x <= restart.x + restart.w && y >= restart.y && y <= restart.y + restart.h) {
        over = 0;
      } else if (x >= cancel.x && x <= cancel.x + cancel.w && y >= cancel.y && y <= cancel.y + cancel.h) {
        over = 1;
      }
      if (over !== null) {
        game.restartConfirmFocusedOption = over;
      }
      canvas.style.cursor = over !== null ? "pointer" : "default";
      return;
    }

    if (!game.levelUpMenu) {
      canvas.style.cursor = "";
      return;
    }
    const dpr = window.devicePixelRatio ?? 1;
    const logicalW = game.width / dpr;
    const logicalH = game.height / dpr;
    const { x, y } = eventToLogicalCanvasCoords(game, e.clientX, e.clientY);
    const rects = getLevelUpOptionRects(logicalW, logicalH, game.levelUpMenu.options.length);
    let hovered: number | null = null;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        hovered = i;
        break;
      }
    }
    if (hovered !== null) {
      game.levelUpFocusedOption = hovered;
    }
    canvas.style.cursor = hovered !== null ? "pointer" : "default";
  };

  const handleCanvasLeave = () => {
    if (game.levelUpMenu) {
      canvas.style.cursor = "default";
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", () => resizeCanvas(canvas, game));
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("mousemove", handleCanvasMove);
  canvas.addEventListener("mouseleave", handleCanvasLeave);

  return game;
}

function tick(game: Game, time: number): void {
  const dt = Math.min((time - game.lastTime) / 1000, 0.1);
  game.lastTime = time;

  const dpr = window.devicePixelRatio ?? 1;
  const logicalWidth = game.width / dpr;
  const logicalHeight = game.height / dpr;
  const worldWidth = logicalWidth / CONFIG.zoom;
  const worldHeight = logicalHeight / CONFIG.zoom;

    if (!game.paused && !game.levelUpMenu && game.ship.hp > 0) {
    const gameTime = time / 1000;
    const sel = game.ship.selectedWeaponSlot;
    const weapon = game.ship.weapons[sel];

    if (game.keys.fire && weapon) {
      const baseCd = getWeaponCooldown(weapon.kind);
      const cooldown = baseCd / (weapon.fireRateModifier * game.ship.fireRateMultiplier);
      if (gameTime - weapon.lastFiredAt >= cooldown) {
        weapon.lastFiredAt = gameTime;
        if (weapon.kind === "bullet" || weapon.kind === "rocket") {
          const speed = weapon.kind === "rocket" ? CONFIG.rocketSpeed : CONFIG.bulletSpeed;
          game.projectiles.push(createProjectile(game.ship, weapon, sel, speed));
        } else if (weapon.kind === "bomb") {
          game.bombs.push(createBomb(game.ship, weapon, sel));
        } else if (weapon.kind === "mine") {
          game.mines.push(createMine(game.ship, weapon, sel));
        } else if (weapon.kind === "pulse" || weapon.kind === "conePulse") {
          const r = weapon.kind === "pulse" ? CONFIG.pulseRadius : CONFIG.conePulseRange;
          const damage =
            weapon.baseDamage * weapon.damageModifier * game.ship.damageMultiplier;
          for (const asteroid of game.asteroids) {
            const dx = asteroid.position.x - game.ship.position.x;
            const dy = asteroid.position.y - game.ship.position.y;
            const d = Math.hypot(dx, dy);
            if (weapon.kind === "conePulse") {
              const angle = Math.atan2(dy, dx);
              const shipAngle = game.ship.rotation;
              let diff = angle - shipAngle;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              if (Math.abs(diff) <= CONFIG.conePulseAngle / 2 && d <= r) {
                asteroid.hp -= damage;
                asteroid.lastDamagedAt = gameTime;
              }
            } else {
              if (d <= r) {
                asteroid.hp -= damage;
                asteroid.lastDamagedAt = gameTime;
              }
            }
          }
          if (weapon.kind === "pulse") {
            game.effects.push(createPulse(game.ship.position, CONFIG.pulseRadius, gameTime));
          } else {
            game.effects.push(createConePulse(
              game.ship.position,
              game.ship.rotation,
              CONFIG.conePulseAngle / 2,
              CONFIG.conePulseRange,
              gameTime
            ));
          }
        } else if (weapon.kind === "laser") {
          game.lasers.push(createLaser(game.ship, weapon, sel));
        }
      }
    }

    updateShip(game.ship, dt, game.keys);
    wrapPosition(game.ship, worldWidth, worldHeight);

    if (game.ship.healthRegenModifier > 0 && game.ship.hp > 0) {
      const regen = CONFIG.baseHealthRegenPerSecond * game.ship.healthRegenModifier * dt;
      game.ship.hp = Math.min(game.ship.maxHp, game.ship.hp + regen);
    }

    for (const p of game.projectiles) {
      updateProjectile(p, dt, worldWidth, worldHeight);
    }
    for (const b of game.bombs) {
      updateBomb(b, dt, worldWidth, worldHeight);
    }
    for (const laser of game.lasers) {
      laser.lifetime -= dt;
    }
    for (const asteroid of game.asteroids) {
      updateAsteroid(asteroid, dt, worldWidth, worldHeight);
    }

    const shipCircle = shipMovingCircle(game.ship);
    for (const p of game.projectiles) {
      for (const asteroid of game.asteroids) {
        const ac = asteroidCollisionCircle(asteroid);
        const expandedCircle = { position: ac.position, radius: ac.radius + p.radius };
        if (segmentVsCircle(p.prevPosition, p.position, expandedCircle)) {
          asteroid.hp -= p.damage;
          asteroid.lastDamagedAt = time / 1000;
          p.lifetime = 0;
          break;
        }
      }
    }

    for (const b of game.bombs) {
      if (b.fuse <= 0) {
        game.effects.push(createExplosion(b.position, b.explosionRadius, time / 1000));
        for (const asteroid of game.asteroids) {
          const dx = asteroid.position.x - b.position.x;
          const dy = asteroid.position.y - b.position.y;
          if (dx * dx + dy * dy <= b.explosionRadius * b.explosionRadius) {
            asteroid.hp -= b.damage;
            asteroid.lastDamagedAt = time / 1000;
          }
        }
      }
    }
    for (const m of game.mines) {
      for (const asteroid of game.asteroids) {
        if (mineTriggered(m, asteroid)) {
          game.effects.push(createExplosion(m.position, m.explosionRadius, time / 1000));
          for (const a of game.asteroids) {
            const dx = a.position.x - m.position.x;
            const dy = a.position.y - m.position.y;
            if (dx * dx + dy * dy <= m.explosionRadius * m.explosionRadius) {
              a.hp -= m.damage;
              a.lastDamagedAt = time / 1000;
            }
          }
          m.explosionRadius = 0;
          break;
        }
      }
    }
    for (const laser of game.lasers) {
      if (laser.lifetime > 0) {
        for (const asteroid of game.asteroids) {
          const ac = asteroidCollisionCircle(asteroid);
          const dist = pointToSegment(
            ac.position.x, ac.position.y,
            laser.start.x, laser.start.y,
            laser.end.x, laser.end.y
          );
          if (dist <= ac.radius) {
            asteroid.hp -= laser.damage;
            asteroid.lastDamagedAt = time / 1000;
          }
        }
      }
    }

    for (let pass = 0; pass < CONFIG.collisionResolutionPasses; pass++) {
      for (const asteroid of game.asteroids) {
        if (circleVsCircle(shipCircle, asteroidCollisionCircle(asteroid))) {
          if (pass === 0 && game.ship.hp > 0) {
            const damage = CONFIG.shipCollisionDamage + asteroid.radius * CONFIG.shipCollisionDamagePerRadius;
            game.ship.hp = Math.max(0, game.ship.hp - damage);
          }
          resolveShipAsteroidRedirect(shipCircle, asteroidMovingCircle(asteroid), CONFIG.shipAsteroidDamping);
        }
      }
      for (let i = 0; i < game.asteroids.length; i++) {
        for (let j = i + 1; j < game.asteroids.length; j++) {
          const a = game.asteroids[i]!;
          const b = game.asteroids[j]!;
          if (circleVsCircle(asteroidCollisionCircle(a), asteroidCollisionCircle(b))) {
            resolveBounce(asteroidMovingCircle(a), asteroidMovingCircle(b), CONFIG.restitution);
          }
        }
      }
    }

    game.projectiles = game.projectiles.filter(isProjectileAlive);
    game.bombs = game.bombs.filter(isBombAlive);
    game.mines = game.mines.filter((m) => m.explosionRadius > 0);
    game.lasers = game.lasers.filter((l) => l.lifetime > 0);
    const nowSec = time / 1000;
    game.effects = game.effects.filter((e) => isEffectAlive(e, nowSec));
    for (const asteroid of game.asteroids) {
      if (isAsteroidDead(asteroid)) {
        spawnPickupsFromAsteroid(game.pickups, asteroid);
      }
    }
    game.asteroids = game.asteroids.filter((a) => !isAsteroidDead(a));

    for (const pickup of game.pickups) {
      updatePickup(pickup, dt, worldWidth, worldHeight);
    }
    const keptPickups: Pickup[] = [];
    for (const pickup of game.pickups) {
      if (tryCollectPickup(pickup, game.ship)) continue;
      if (isPickupExpired(pickup)) continue;
      keptPickups.push(pickup);
    }
    game.pickups = keptPickups;

    if (
      !game.levelUpMenu &&
      game.ship.xp >= totalXpForLevel(game.ship.level + 1)
    ) {
      game.ship.level++;
      game.paused = true;
      game.levelUpMenu = {
        options: generateUpgradeOptions(game.ship),
        newLevel: game.ship.level,
      };
      game.levelUpFocusedOption = 0;
    }

    game.asteroidSpawnTimer += dt;
    if (game.asteroidSpawnTimer >= CONFIG.asteroidSpawnInterval) {
      game.asteroidSpawnTimer = 0;
      game.asteroids.push(spawnAsteroidAtEdge(worldWidth, worldHeight));
    }
  }

  game.ctx.save();
  game.ctx.scale(CONFIG.zoom, CONFIG.zoom);

  game.ctx.fillStyle = "#0a0a0f";
  game.ctx.fillRect(0, 0, worldWidth, worldHeight);
  drawStarfield(game.ctx, game.stars, worldWidth, worldHeight, time / 1000);
  for (const asteroid of game.asteroids) {
    drawAsteroid(game.ctx, asteroid, time / 1000);
  }
  for (const pickup of game.pickups) {
    drawPickup(game.ctx, pickup);
  }
  drawShip(game.ctx, game.ship);
  for (const p of game.projectiles) {
    drawProjectile(game.ctx, p);
  }
  for (const b of game.bombs) {
    drawBomb(game.ctx, b);
  }
  for (const m of game.mines) {
    drawMine(game.ctx, m);
  }
  for (const laser of game.lasers) {
    drawLaser(game.ctx, laser);
  }
  for (const e of game.effects) {
    drawEffect(game.ctx, e, time / 1000);
  }

  game.ctx.restore();

  if (game.ship.hp <= 0) {
    game.running = false;
  }

  drawStatsUI(
    game.ctx,
    game.ship,
    logicalWidth,
    logicalHeight,
    game.running,
    time / 1000,
    game.restartConfirmPending
  );

  if (game.levelUpMenu) {
    drawLevelUpOverlay(
      game.ctx,
      logicalWidth,
      logicalHeight,
      game.levelUpMenu.options,
      game.levelUpMenu.newLevel,
      Math.max(0, Math.min(game.levelUpFocusedOption, game.levelUpMenu.options.length - 1))
    );
  } else if (game.paused) {
    drawPauseOverlay(game.ctx, logicalWidth, logicalHeight, game.ship);
  }

  const showRestartDialog =
    game.restartConfirmPending &&
    !game.levelUpMenu &&
    (!game.running || (game.paused && game.ship.hp > 0));
  if (showRestartDialog) {
    drawRestartConfirmOverlay(
      game.ctx,
      logicalWidth,
      logicalHeight,
      game.restartConfirmFocusedOption
    );
  }
}

export function runGameLoop(game: Game): void {
  function frame(time: number): void {
    tick(game, time);
    requestAnimationFrame(frame);
  }
  game.lastTime = performance.now();
  requestAnimationFrame(frame);
}
