import type { Vec2 } from "../vec2.js";
import { CONFIG } from "../constants.js";
import type { Circle, MovingCircle } from "../collision.js";

/**
 * Asteroid – har position, hastighet, radie, HP.
 * Utformad så att fler objekttyper (fiender, items, hinder) kan följa samma mönster.
 */
export interface Asteroid {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  /** Speltid (sekunder) när asteroiden senast tog skada – för att visa/tona ut hälsokorrugg. */
  lastDamagedAt: number;
  /** Rotationsvinkel för ritning (radianer). */
  rotation: number;
  /** Rotationshastighet (rad/s). */
  rotationSpeed: number;
  /** Vertices för polygon-form (relativa offset från centrum), för visuell variation. */
  shape: Vec2[];
}

export function createAsteroid(
  x: number,
  y: number,
  velocity: Vec2,
  radius?: number
): Asteroid {
  const r = radius ?? CONFIG.asteroidRadiusMin + Math.random() * (CONFIG.asteroidRadiusMax - CONFIG.asteroidRadiusMin);
  const maxHp = Math.max(1, Math.floor(r * CONFIG.asteroidHpPerRadius));
  const verts = 6 + Math.floor(Math.random() * 4);
  const shape: Vec2[] = [];
  for (let i = 0; i < verts; i++) {
    const angle = (i / verts) * Math.PI * 2 + Math.random() * 0.5;
    const dist = r * (0.7 + Math.random() * 0.3);
    shape.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
  }
  return {
    position: { x, y },
    velocity: { ...velocity },
    radius: r,
    hp: maxHp,
    maxHp,
    lastDamagedAt: -1e9,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 2,
    shape,
  };
}

export function updateAsteroid(asteroid: Asteroid, dt: number, worldWidth: number, worldHeight: number): void {
  asteroid.position.x += asteroid.velocity.x * dt;
  asteroid.position.y += asteroid.velocity.y * dt;
  asteroid.rotation += asteroid.rotationSpeed * dt;
  wrapPosition(asteroid.position, asteroid.radius, worldWidth, worldHeight);
}

function wrapPosition(pos: Vec2, margin: number, w: number, h: number): void {
  if (pos.x < -margin) pos.x = w + margin;
  if (pos.x > w + margin) pos.x = -margin;
  if (pos.y < -margin) pos.y = h + margin;
  if (pos.y > h + margin) pos.y = -margin;
}

export function asteroidCollisionCircle(asteroid: Asteroid): Circle {
  return { position: { ...asteroid.position }, radius: asteroid.radius };
}

/** För studs mot andra MovingCircle (asteroid/skepp). */
export function asteroidMovingCircle(asteroid: Asteroid): MovingCircle {
  return {
    position: asteroid.position,
    velocity: asteroid.velocity,
    radius: asteroid.radius,
  };
}

export function isAsteroidDead(asteroid: Asteroid): boolean {
  return asteroid.hp <= 0;
}

/** Guld och XP när asteroiden förstörs. */
export function getAsteroidReward(asteroid: Asteroid): { gold: number; xp: number } {
  return {
    gold: Math.floor(CONFIG.asteroidGoldBase + asteroid.radius * CONFIG.asteroidGoldPerRadius),
    xp: Math.floor(CONFIG.asteroidXpBase + asteroid.radius * CONFIG.asteroidXpPerRadius),
  };
}

export function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid, gameTimeSeconds: number): void {
  if (asteroid.shape.length === 0) return;
  ctx.save();
  ctx.translate(asteroid.position.x, asteroid.position.y);
  ctx.rotate(asteroid.rotation);
  ctx.strokeStyle = "#8a8";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  const first = asteroid.shape[0]!;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < asteroid.shape.length; i++) {
    const p = asteroid.shape[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  const elapsed = gameTimeSeconds - asteroid.lastDamagedAt;
  const visibleDuration = 2.5;
  const fullOpacityDuration = 0.4;
  const fadeDuration = visibleDuration - fullOpacityDuration;

  if (elapsed >= 0 && elapsed < visibleDuration) {
    let alpha = 1;
    if (elapsed > fullOpacityDuration) {
      alpha = 1 - (elapsed - fullOpacityDuration) / fadeDuration;
    }
    const segmentCount = 10;
    const barWidth = asteroid.radius * 1.4;
    const segmentWidth = barWidth / segmentCount;
    const barHeight = 4;
    const filledCount = Math.max(0, Math.round((asteroid.hp / asteroid.maxHp) * segmentCount));
    const x = asteroid.position.x - barWidth / 2;
    const y = asteroid.position.y - asteroid.radius - 10;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#444";
    ctx.fillStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = filledCount > 2 ? "#6a6" : filledCount > 0 ? "#ca4" : "#a44";
    for (let i = 0; i < filledCount; i++) {
      ctx.fillRect(x + 1 + i * segmentWidth, y + 1, segmentWidth - 1, barHeight - 2);
    }
    ctx.restore();
  }
}

/** Skapar en asteroid vid en slumpmässig kant med hastighet inåt. */
export function spawnAsteroidAtEdge(worldWidth: number, worldHeight: number): Asteroid {
  const edge = Math.floor(Math.random() * 4);
  const speed = CONFIG.asteroidSpeedMin + Math.random() * (CONFIG.asteroidSpeedMax - CONFIG.asteroidSpeedMin);
  let x: number, y: number, vx: number, vy: number;
  switch (edge) {
    case 0:
      x = Math.random() * worldWidth;
      y = -CONFIG.asteroidRadiusMax;
      vx = (Math.random() - 0.5) * speed;
      vy = Math.random() * speed * 0.5 + speed * 0.5;
      break;
    case 1:
      x = worldWidth + CONFIG.asteroidRadiusMax;
      y = Math.random() * worldHeight;
      vx = -(Math.random() * speed * 0.5 + speed * 0.5);
      vy = (Math.random() - 0.5) * speed;
      break;
    case 2:
      x = Math.random() * worldWidth;
      y = worldHeight + CONFIG.asteroidRadiusMax;
      vx = (Math.random() - 0.5) * speed;
      vy = -(Math.random() * speed * 0.5 + speed * 0.5);
      break;
    default:
      x = -CONFIG.asteroidRadiusMax;
      y = Math.random() * worldHeight;
      vx = Math.random() * speed * 0.5 + speed * 0.5;
      vy = (Math.random() - 0.5) * speed;
  }
  return createAsteroid(x, y, { x: vx, y: vy });
}
