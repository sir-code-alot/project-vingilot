import type { Vec2 } from "./vec2.js";

/** Cirkel för kollision (position + radie). */
export interface Circle {
  position: Vec2;
  radius: number;
}

/**
 * Cirkel–cirkel-kollision.
 * Använd för skepp, skott, runda asteroider/fiender.
 */
export function circleVsCircle(a: Circle, b: Circle): boolean {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius;
  return distSq <= minDist * minDist;
}

/**
 * Cirkel med hastighet – för objekt som kan studsa (asteroider, skepp).
 * position och velocity muteras av resolveBounce.
 */
export interface MovingCircle {
  position: Vec2;
  velocity: Vec2;
  radius: number;
}

/**
 * Studsar två cirklar från varandra och uppdaterar deras hastigheter.
 * Anropas när circleVsCircle är true.
 * Massa används som radius² om effectiveMassA/B inte anges.
 * effectiveMassA/B gör det möjligt att ge t.ex. skepp högre stödmassa för mer tydlig reaktion.
 */
export function resolveBounce(
  a: MovingCircle,
  b: MovingCircle,
  restitution: number = 0.8,
  effectiveMassA?: number,
  effectiveMassB?: number
): void {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = a.radius + b.radius - dist;
  if (overlap <= 0) return;

  const ma = effectiveMassA ?? a.radius * a.radius;
  const mb = effectiveMassB ?? b.radius * b.radius;
  const totalMass = ma + mb;

  a.position.x -= nx * overlap * (mb / totalMass);
  a.position.y -= ny * overlap * (mb / totalMass);
  b.position.x += nx * overlap * (ma / totalMass);
  b.position.y += ny * overlap * (ma / totalMass);

  const relVx = a.velocity.x - b.velocity.x;
  const relVy = a.velocity.y - b.velocity.y;
  const velAlongN = relVx * nx + relVy * ny;
  if (velAlongN >= 0) return;

  const impulse = (1 + restitution) * velAlongN / totalMass;
  a.velocity.x -= impulse * nx * mb;
  a.velocity.y -= impulse * ny * mb;
  b.velocity.x += impulse * nx * ma;
  b.velocity.y += impulse * ny * ma;
}

/**
 * Skepp–asteroid: enkel omdirigering utan kraftig studs.
 * Separerar positioner längs normalen, reflekterar sedan bara hastighetskomponenten
 * längs normalen så att asteroiden rör sig bort från skeppet – rörelsen matchar "knuffen".
 */
export function resolveShipAsteroidRedirect(
  ship: MovingCircle,
  asteroid: MovingCircle,
  damping: number = 0.3
): void {
  const dx = asteroid.position.x - ship.position.x;
  const dy = asteroid.position.y - ship.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = ship.radius + asteroid.radius - dist;
  if (overlap <= 0) return;

  ship.position.x -= nx * overlap * 0.5;
  ship.position.y -= ny * overlap * 0.5;
  asteroid.position.x += nx * overlap * 0.5;
  asteroid.position.y += ny * overlap * 0.5;

  const vAsteroidN = asteroid.velocity.x * nx + asteroid.velocity.y * ny;
  const vShipN = ship.velocity.x * nx + ship.velocity.y * ny;

  if (vAsteroidN < 0) {
    const reflect = (1 - damping) * (-vAsteroidN);
    asteroid.velocity.x += reflect * nx;
    asteroid.velocity.y += reflect * ny;
  }
  if (vShipN > 0) {
    const reflect = (1 - damping) * vShipN;
    ship.velocity.x -= reflect * nx;
    ship.velocity.y -= reflect * ny;
  }
}

/** Avstånd mellan två cirklar (centrum till centrum). */
export function distanceBetweenCircles(a: Circle, b: Circle): number {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  return Math.hypot(dx, dy);
}

/**
 * Linjesegment vs cirkel – för snabba skott som annars kan "tunnla" genom mål.
 * Returnerar true om segmentet från segmentStart till segmentEnd skär cirkeln.
 */
export function segmentVsCircle(segmentStart: Vec2, segmentEnd: Vec2, circle: Circle): boolean {
  const { position: c, radius: r } = circle;
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.hypot(segmentStart.x - c.x, segmentStart.y - c.y);
    return d <= r;
  }
  const t = Math.max(0, Math.min(1, ((c.x - segmentStart.x) * dx + (c.y - segmentStart.y) * dy) / lenSq));
  const px = segmentStart.x + t * dx;
  const py = segmentStart.y + t * dy;
  const distSq = (px - c.x) ** 2 + (py - c.y) ** 2;
  return distSq <= r * r;
}

/**
 * AABB (Axis-Aligned Bounding Box) för rektangulära hinder.
 * Redo för när du lägger till rektangel-formade objekt.
 */
export interface AABB {
  position: Vec2;
  width: number;
  height: number;
}

/** Cirkel vs AABB. Använd t.ex. skepp mot rektangulära hinder. */
export function circleVsAABB(circle: Circle, box: AABB): boolean {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const cx = circle.position.x;
  const cy = circle.position.y;
  const bx = box.position.x;
  const by = box.position.y;

  const closestX = Math.max(bx - halfW, Math.min(cx, bx + halfW));
  const closestY = Math.max(by - halfH, Math.min(cy, by + halfH));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}
