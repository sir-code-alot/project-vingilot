/**
 * 2D-vektor för position, hastighet m.m.
 * Alla funktioner returnerar nya objekt (immutable-style).
 */
export type Vec2 = { x: number; y: number };

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Punktprodukt (för kollisionsberäkningar m.m.). */
export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return v;
  return scale(v, 1 / len);
}

/** Rotera vektorn med vinkel i radianer (moturs). */
export function rotate(v: Vec2, angleRad: number): Vec2 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: v.x * c - v.y * s,
    y: v.x * s + v.y * c,
  };
}

/** Riktningsvektor från vinkel i radianer (0 = höger, π/2 = upp). */
export function fromAngle(angleRad: number): Vec2 {
  return { x: Math.cos(angleRad), y: Math.sin(angleRad) };
}
