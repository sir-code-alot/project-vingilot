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
  getAsteroidReward,
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

function drawStatsUI(
  ctx: CanvasRenderingContext2D,
  ship: Ship,
  width: number,
  height: number,
  running: boolean,
  gameTimeSeconds: number
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
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#ccc";
    ctx.fillText("Press R to restart", width / 2, height / 2 + 36);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawLevelUpOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: UpgradeOption[],
  newLevel: number
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, width, height);

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#8af";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Level ${newLevel}!`, width / 2, height / 2 - 80);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#aaa";
  ctx.fillText("Choose an upgrade (1, 2, or 3)", width / 2, height / 2 - 50);

  const boxW = 200;
  const boxH = 44;
  const gap = 16;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const totalW = options.length * boxW + (options.length - 1) * gap;
    const bx = (width - totalW) / 2 + i * (boxW + gap);
    const by = height / 2 - 20;

    ctx.fillStyle = "rgba(40, 50, 70, 0.9)";
    ctx.strokeStyle = "rgba(100, 140, 200, 0.6)";
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}. ${opt.label}`, bx + boxW / 2, by + 14);
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
  const panelW = 180;
  const panelH = pad * 2 + 8 * statsLineH;
  const gap = 24;

  let y = 40;

  ctx.font = "32px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("PAUSED", width / 2, y);
  y += 48 + gap;

  const panelX = (width - panelW) / 2;
  const panelY = y;
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

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("1/2/3 — Select weapon", width / 2, y);
  ctx.fillText("Escape — Resume", width / 2, y + 24);
  ctx.fillText("R — Restart", width / 2, y + 48);
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
  keys: InputState;
  width: number;
  height: number;
  lastTime: number;
  running: boolean;
  paused: boolean;
  asteroidSpawnTimer: number;
  /** Visas vid level-up; null = ej aktiv. */
  levelUpMenu: { options: UpgradeOption[]; newLevel: number } | null;
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
  game.asteroidSpawnTimer = 0;
  game.running = true;
  game.paused = false;
  game.levelUpMenu = null;
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
    keys: { up: false, left: false, right: false, fire: false, selectedSlot: 0 },
    width,
    height,
    lastTime: 0,
    running: true,
    paused: false,
    asteroidSpawnTimer: 0,
    levelUpMenu: null,
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
      const n = e.code === "Digit1" ? 1 : e.code === "Digit2" ? 2 : e.code === "Digit3" ? 3 : 0;
      if (n >= 1 && n <= game.levelUpMenu.options.length) {
        const opt = game.levelUpMenu.options[n - 1]!;
        applyUpgrade(game.ship, opt);
        game.levelUpMenu = null;
        game.paused = false;
        e.preventDefault();
      }
      return;
    }
    const weaponSlot = e.code === "Digit1" ? 0 : e.code === "Digit2" ? 1 : e.code === "Digit3" ? 2 : -1;
    if (weaponSlot >= 0) {
      game.ship.selectedWeaponSlot = weaponSlot as 0 | 1 | 2;
      game.keys.selectedSlot = weaponSlot as 0 | 1 | 2;
    }
    if (e.code === "Escape") {
      if (game.running && game.ship.hp > 0 && !game.levelUpMenu) {
        game.paused = !game.paused;
        e.preventDefault();
      }
      return;
    }
    if (e.code === "KeyR") {
      if (!game.running || (game.paused && !game.levelUpMenu)) {
        resetGame(game);
        e.preventDefault();
      }
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

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", () => resizeCanvas(canvas, game));

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

    for (let i = 0; i < game.asteroids.length; i++) {
      for (let j = i + 1; j < game.asteroids.length; j++) {
        const a = game.asteroids[i]!;
        const b = game.asteroids[j]!;
        if (circleVsCircle(asteroidCollisionCircle(a), asteroidCollisionCircle(b))) {
          resolveBounce(asteroidMovingCircle(a), asteroidMovingCircle(b), CONFIG.restitution);
        }
      }
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
    for (const asteroid of game.asteroids) {
      if (isAsteroidDead(asteroid)) {
        const reward = getAsteroidReward(asteroid);
        game.ship.gold += Math.floor(reward.gold * game.ship.luck * game.ship.goldGainMultiplier);
        game.ship.xp += Math.floor(reward.xp * game.ship.luck * game.ship.xpGainMultiplier);
      }
    }
    game.asteroids = game.asteroids.filter((a) => !isAsteroidDead(a));

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
    time / 1000
  );

  if (game.levelUpMenu) {
    drawLevelUpOverlay(
      game.ctx,
      logicalWidth,
      logicalHeight,
      game.levelUpMenu.options,
      game.levelUpMenu.newLevel
    );
  } else if (game.paused) {
    drawPauseOverlay(game.ctx, logicalWidth, logicalHeight, game.ship);
  }
}

export function runGameLoop(game: Game): void {
  function frame(time: number): void {
    if (!game.running) {
      requestAnimationFrame(frame);
      return;
    }
    tick(game, time);
    requestAnimationFrame(frame);
  }
  game.lastTime = performance.now();
  requestAnimationFrame(frame);
}
